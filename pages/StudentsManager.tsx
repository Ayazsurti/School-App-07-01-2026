
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Student } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import jsQR from 'jsqr';
import { 
  Plus, Search, Trash2, Edit2, X, UserPlus, User as UserIcon, Camera, Upload, 
  CheckCircle2, ShieldCheck, Smartphone, Loader2, QrCode, StopCircle, GraduationCap, RefreshCw
} from 'lucide-react';

interface StudentsManagerProps { user: User; }
const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const StudentsManager: React.FC<StudentsManagerProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // QR Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanFrameRef = useRef<number>(0);

  const [formData, setFormData] = useState<Partial<Student>>({
    fullName: '', email: '', grNumber: '', class: '1st', section: 'A', rollNo: '', profileImage: '',
    gender: 'Male', dob: '', admissionDate: '', aadharNo: '', uidId: '', penNo: '',
    fatherName: '', motherName: '', fatherMobile: '', motherMobile: '', residenceAddress: ''
  });

  const fetchCloudData = async () => {
    try {
      const data = await db.students.getAll();
      const mapped = data.map((s: any) => ({
        id: s.id, 
        fullName: s.full_name, 
        name: s.full_name, 
        email: s.email, 
        rollNo: s.roll_no,
        class: s.class, 
        section: s.section, 
        grNumber: s.gr_number, 
        profileImage: s.profile_image,
        fatherName: s.father_name, 
        motherName: s.mother_name, 
        fatherMobile: s.father_mobile,
        motherMobile: s.mother_mobile,
        residenceAddress: s.residence_address,
        gender: s.gender,
        dob: s.dob,
        admissionDate: s.admission_date,
        aadharNo: s.aadhar_no,
        uidId: s.uid_id,
        penNo: s.pen_no
      }));
      setStudents(mapped);
    } catch (err) { 
      console.error("Cloud Fetch Error:", err); 
    }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { 
      stopCamera();
      supabase.removeChannel(channel); 
    };
  }, []);

  const startCamera = async (forScanner: boolean = false) => {
    try {
      const constraints = { 
        video: { facingMode: forScanner ? 'environment' : 'user', width: { ideal: 640 }, height: { ideal: 480 } }, 
        audio: false 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        if (forScanner) {
          setIsScanning(true);
          requestAnimationFrame(scanQRCode);
        }
      }
    } catch (err) {
      alert("Camera Error: Access required.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsScanning(false);
    if (scanFrameRef.current) cancelAnimationFrame(scanFrameRef.current);
  };

  const scanQRCode = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
      if (code) {
        setSearchQuery(code.data);
        stopCamera();
        return;
      }
    }
    scanFrameRef.current = requestAnimationFrame(scanQRCode);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, profileImage: dataUrl }));
        stopCamera();
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.grNumber) {
      alert("Please enter Full Name and GR Number.");
      return;
    }
    setIsSyncing(true);
    try {
      const studentToSync = { ...formData, id: editingStudent ? editingStudent.id : undefined };
      await db.students.upsert(studentToSync);
      setShowModal(false);
      stopCamera();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      createAuditLog(user, editingStudent ? 'UPDATE' : 'CREATE', 'Registry', `Cloud Sync: ${formData.fullName}`);
      setEditingStudent(null);
      setFormData({
        fullName: '', email: '', grNumber: '', class: '1st', section: 'A', rollNo: '', profileImage: '',
        gender: 'Male', dob: '', admissionDate: '', aadharNo: '', uidId: '', penNo: '',
        fatherName: '', motherName: '', fatherMobile: '', motherMobile: '', residenceAddress: ''
      });
      fetchCloudData();
    } catch (err: any) { 
      alert(`Sync Error: ${err.message}`); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await db.students.delete(deleteId);
      setDeleteId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchCloudData();
    } catch (err) { alert("Delete failed."); }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const query = searchQuery.toLowerCase();
      const nameMatch = (s.fullName || '').toLowerCase().includes(query);
      const grMatch = (s.grNumber || '').toLowerCase().includes(query);
      return (nameMatch || grMatch) && (selectedClass === 'All' || s.class === selectedClass);
    });
  }, [students, searchQuery, selectedClass]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData(prev => ({ ...prev, profileImage: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Refreshing Registry...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Global Sync Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Cloud Database Updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">
             Institutional Registry <ShieldCheck className="text-indigo-600" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Centralized cloud management for all student identities.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => startCamera(true)} className="px-8 py-4 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest border border-white/5"><QrCode size={20} /> Scan Card</button>
          <button onClick={() => { 
            setEditingStudent(null); 
            setFormData({
              fullName: '', email: '', grNumber: '', class: '1st', section: 'A', rollNo: '', profileImage: '',
              gender: 'Male', dob: '', admissionDate: '', aadharNo: '', uidId: '', penNo: '',
              fatherName: '', motherName: '', fatherMobile: '', motherMobile: '', residenceAddress: ''
            }); 
            setShowModal(true); 
          }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><UserPlus size={20} /> Enroll New</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center text-slate-400 animate-pulse">
            <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
            <p className="font-black text-xs uppercase tracking-widest">Connecting to Cloud Server...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
             <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative group w-full max-w-md">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input type="text" placeholder="Search by name or GR number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" />
                </div>
                <div className="flex gap-2">
                   <button onClick={() => setSelectedClass('All')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedClass === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>All Students</button>
                   {ALL_CLASSES.slice(0, 5).map(c => (
                     <button key={c} onClick={() => setSelectedClass(c)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedClass === c ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Std {c}</button>
                   ))}
                </div>
             </div>
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-10 py-6 text-left">Full Identity</th>
                  <th className="px-8 py-6 text-left">GR / Cloud ID</th>
                  <th className="px-8 py-6 text-left">Academic Placement</th>
                  <th className="px-8 py-6 text-left">Documents</th>
                  <th className="px-8 py-6 text-right">Registry Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg overflow-hidden">
                          {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" alt="S" /> : (student.fullName || '').charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-200 text-base uppercase">{student.fullName}</p>
                          <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{student.email || 'No Linked Email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-600 dark:text-slate-400 text-xs uppercase tracking-widest">{student.grNumber}</td>
                    <td className="px-8 py-6">
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase inline-block border border-indigo-100 dark:border-indigo-800">Std {student.class}-{student.section}</div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Aadhar: {student.aadharNo || 'Missing'}</p>
                          <p className="text-[8px] font-black text-slate-400 uppercase">PEN: {student.penNo || 'Missing'}</p>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingStudent(student); setFormData(student); setShowModal(true); }} className="p-3 bg-white dark:bg-slate-800 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Edit2 size={18} /></button>
                        <button onClick={() => setDeleteId(student.id)} className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-900 hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Identity Enrollment Matrix</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Institutional Registry</p>
               </div>
               <button onClick={() => { setShowModal(false); stopCamera(); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={28} /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
               <div className="flex flex-col md:flex-row gap-12">
                  <div className="flex flex-col items-center gap-5 shrink-0">
                     <div className="w-56 h-56 bg-slate-100 dark:bg-slate-800 rounded-[3rem] border-4 border-white dark:bg-slate-700 shadow-xl overflow-hidden flex items-center justify-center relative group">
                        {isCameraActive ? (
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                        ) : (
                          formData.profileImage ? <img src={formData.profileImage} className="w-full h-full object-cover" alt="Profile" /> : <UserIcon size={80} className="text-slate-200" />
                        )}
                        {!isCameraActive && (
                          <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                             <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 font-bold uppercase text-[9px] tracking-widest bg-white/20 px-4 py-2 rounded-full hover:bg-white/40"><Upload size={16}/> Upload File</button>
                             <button type="button" onClick={() => startCamera(false)} className="flex items-center gap-2 font-bold uppercase text-[9px] tracking-widest bg-indigo-600 px-4 py-2 rounded-full hover:bg-indigo-500"><Camera size={16}/> Live Photo</button>
                          </div>
                        )}
                     </div>
                     <canvas ref={canvasRef} className="hidden" />
                     {isCameraActive && (
                       <button type="button" onClick={capturePhoto} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg"><Camera size={18}/> Capture Snapshot</button>
                     )}
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </div>

                  <div className="flex-1 space-y-10">
                     <div className="space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-indigo-500 pl-4 py-1">
                           <GraduationCap className="text-indigo-600" size={20} />
                           <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Academic & Institutional Records</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                              <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Full Name" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">GR Registry Number</label>
                              <input type="text" required value={formData.grNumber} onChange={e => setFormData({...formData, grNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none" placeholder="GR NO." />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll Number</label>
                              <input type="text" value={formData.rollNo} onChange={e => setFormData({...formData, rollNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none" placeholder="Roll No" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Class</label>
                              <select value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none">
                                 {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Section</label>
                              <select value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none">
                                 <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                              </select>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Date</label>
                              <input type="date" value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none" />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-amber-500 pl-4 py-1">
                           <Smartphone className="text-amber-600" size={20} />
                           <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Government Identity Verification</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Aadhar Number</label>
                              <input type="text" value={formData.aadharNo} onChange={e => setFormData({...formData, aadharNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" placeholder="XXXX-XXXX-XXXX" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">PEN Number (Permanent Education)</label>
                              <input type="text" value={formData.penNo} onChange={e => setFormData({...formData, penNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" placeholder="PEN REGISTRY" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">UID / Unique ID</label>
                              <input type="text" value={formData.uidId} onChange={e => setFormData({...formData, uidId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" placeholder="UID REF" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                              <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500" />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-4 py-1">
                           <UserIcon className="text-emerald-600" size={20} />
                           <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Parental & Residence Registry</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                           <div className="space-y-4">
                              <input type="text" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold" placeholder="Father's Full Name" />
                              <input type="tel" value={formData.fatherMobile} onChange={e => setFormData({...formData, fatherMobile: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold" placeholder="Father's Mobile" />
                           </div>
                           <div className="space-y-4">
                              <input type="text" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold" placeholder="Mother's Full Name" />
                              <input type="tel" value={formData.motherMobile} onChange={e => setFormData({...formData, motherMobile: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-5 py-4 font-bold" placeholder="Mother's Mobile" />
                           </div>
                           <div className="md:col-span-2">
                              <textarea rows={3} value={formData.residenceAddress} onChange={e => setFormData({...formData, residenceAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-bold text-slate-800 dark:text-white outline-none resize-none" placeholder="Complete Residential Address" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="flex gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => { setShowModal(false); stopCamera(); }} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-3xl uppercase text-[10px] tracking-widest">Discard Entry</button>
                  <button type="submit" disabled={isSyncing} className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                    {isSyncing ? 'Synchronizing with Cloud...' : 'Commit Record to Global Registry'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 max-sm w-full shadow-2xl text-center border border-rose-100 dark:border-rose-900/50 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-inner border border-rose-100">
                 <Trash2 size={48} strokeWidth={2.5} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Purge Data?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium text-xs leading-relaxed uppercase tracking-widest">This identity will be permanently erased from all cloud connected devices.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeleteId(null)} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-3xl uppercase text-[10px] tracking-widest">Cancel</button>
                 <button onClick={confirmDelete} className="py-5 bg-rose-600 text-white font-black rounded-3xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Confirm Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManager;
