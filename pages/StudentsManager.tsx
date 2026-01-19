
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Student } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Search, Trash2, Edit2, X, UserPlus, User as UserIcon, Camera, Upload, 
  CheckCircle2, ShieldCheck, Smartphone, Loader2, RefreshCw,
  GraduationCap, FileSpreadsheet, FileDown, FileSearch, MapPin, 
  CreditCard, Calendar, Eye, StopCircle, Mail, Fingerprint, Tags,
  Users, Check, ArrowRight
} from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';

interface StudentsManagerProps { user: User; }
const ALL_CLASSES = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

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
  
  // Camera & File States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [captureTarget, setCaptureTarget] = useState<'profileImage' | 'fatherPhoto' | 'motherPhoto'>('profileImage');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialFormData: Partial<Student> = {
    fullName: '', email: '', grNumber: '', class: '1st', section: 'A', rollNo: '', profileImage: '',
    gender: 'Male', dob: '', admissionDate: '', aadharNo: '', panNo: '', uidId: '', penNo: '',
    studentType: '', birthPlace: '',
    fatherName: '', motherName: '', fatherMobile: '', motherMobile: '', residenceAddress: '',
    fatherPhoto: '', motherPhoto: '', password: 'student786'
  };

  const [formData, setFormData] = useState<Partial<Student>>(initialFormData);

  const fetchCloudData = async () => {
    try {
      const data = await db.students.getAll();
      const mapped = (data || []).map((s: any) => ({
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
        panNo: s.pan_no,
        uidId: s.uid_id,
        penNo: s.pen_no,
        studentType: s.student_type,
        birthPlace: s.birth_place,
        fatherPhoto: s.father_photo,
        motherPhoto: s.mother_photo,
        password: s.password
      }));
      setStudents(mapped);
    } catch (err: any) { 
      console.error("Student Cloud Fetch Error:", getErrorMessage(err)); 
    }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-students-v12')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const startCamera = async (target: typeof captureTarget) => {
    setCaptureTarget(target);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      alert("Biometric Camera Access Denied.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);
        setFormData(prev => ({ ...prev, [captureTarget]: dataUrl }));
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: typeof captureTarget) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setFormData(prev => ({ ...prev, [target]: ev.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.grNumber) {
      alert("Full Name and GR Number are mandatory for institutional registry.");
      return;
    }
    setIsSyncing(true);
    try {
      const studentToSync = { 
        ...formData, 
        id: editingStudent ? editingStudent.id : undefined,
        grNumber: String(formData.grNumber).trim() 
      };
      
      await db.students.upsert(studentToSync);
      
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      createAuditLog(user, editingStudent ? 'UPDATE' : 'CREATE', 'Registry', `Cloud Sync: ${formData.fullName} (GR: ${formData.grNumber})`);
      setEditingStudent(null);
      setFormData(initialFormData);
      fetchCloudData();
    } catch (err: any) { 
      alert(`Registry Sync Error: ${getErrorMessage(err)}`); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const filteredStudents = useMemo(() => {
    let list = students.filter(s => {
      const query = searchQuery.toLowerCase();
      const nameMatch = (s.fullName || '').toLowerCase().includes(query);
      const grMatch = (s.grNumber || '').toLowerCase().includes(query);
      return (nameMatch || grMatch) && (selectedClass === 'All' || s.class === selectedClass);
    });

    return list.sort((a, b) => {
      const rollA = parseInt(a.rollNo) || 0;
      const rollB = parseInt(b.rollNo) || 0;
      return rollA - rollB;
    });
  }, [students, searchQuery, selectedClass]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce no-print">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Cloud Processing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Registry Balanced</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Cloud Database Stable</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Student Registry <ShieldCheck className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Manage centralized student identities and credentials.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { setEditingStudent(null); setFormData(initialFormData); setShowModal(true); stopCamera(); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><UserPlus size={20} strokeWidth={3} /> Register Student</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center no-print">
          <div className="relative group w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Identity name or GR number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner dark:text-white" />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full pb-2 md:pb-0 custom-scrollbar">
              <button onClick={() => setSelectedClass('All')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedClass === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>All Grades</button>
              {ALL_CLASSES.map(c => (
                <button key={c} onClick={() => setSelectedClass(c)} className={`whitespace-nowrap px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${selectedClass === c ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{c}</button>
              ))}
          </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px] no-print">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center text-slate-400 animate-pulse">
            <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
            <p className="font-black text-xs uppercase tracking-widest text-slate-400">Accessing Cloud Directory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-6 text-center" style={{ width: '80px' }}>Roll No</th>
                  <th className="px-8 py-6 text-left" style={{ width: '150px' }}>GR Number</th>
                  <th className="px-8 py-6 text-left">Student Identity</th>
                  <th className="px-8 py-6 text-left">Academic Location</th>
                  <th className="px-8 py-6 text-left">Guardian Portal</th>
                  <th className="px-8 py-6 text-right">Registry Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="px-8 py-6 text-center">
                       <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black text-lg border border-indigo-100 dark:border-indigo-800 mx-auto">
                         {student.rollNo || '-'}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">{student.grNumber}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
                           {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" /> : <UserIcon size={20}/>}
                        </div>
                        <p className="font-black text-slate-800 dark:text-white text-sm uppercase leading-tight">{student.fullName}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex flex-col">
                         <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase">Standard {student.class}</span>
                         <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Section {student.section}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase truncate max-w-[150px]">{student.fatherName}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Smartphone size={10}/> WhatsApp: {student.fatherMobile}</p>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingStudent(student); setFormData(student); setShowModal(true); stopCamera(); }} className="p-3 bg-white dark:bg-slate-800 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Edit2 size={18} /></button>
                        <button onClick={() => setDeleteId(student.id)} className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-900 hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">Identity vault empty for current parameters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enrollment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in no-print">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingStudent ? 'Update Enrollment' : 'New Enrollment'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Identity Manager</p>
               </div>
               <button onClick={() => { stopCamera(); setShowModal(false); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={28} /></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10 bg-white dark:bg-slate-900">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-3">
                     <div className="flex flex-col items-center gap-5 sticky top-0">
                        <div className="w-56 h-56 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center relative group">
                           {isCameraActive && captureTarget === 'profileImage' ? (
                             <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              muted 
                              className="w-full h-full object-cover scale-x-[-1]" 
                             />
                           ) : (
                             formData.profileImage ? <img src={formData.profileImage} className="w-full h-full object-cover" alt="Profile" /> : <UserIcon size={80} className="text-slate-200" />
                           )}
                           <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              {!isCameraActive ? (
                                <>
                                  <button type="button" onClick={() => startCamera('profileImage')} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-white/20 p-4 rounded-2xl hover:bg-indigo-600 transition-all"><Camera size={20}/> Camera</button>
                                  <button type="button" onClick={() => { setCaptureTarget('profileImage'); fileInputRef.current?.click(); }} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-white/20 p-4 rounded-2xl hover:bg-indigo-600 transition-all"><Upload size={20}/> Upload</button>
                                </>
                              ) : (
                                <>
                                  <button type="button" onClick={capturePhoto} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-emerald-600 p-4 rounded-2xl animate-pulse"><Camera size={20}/> Capture</button>
                                  <button type="button" onClick={stopCamera} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-rose-600 p-4 rounded-2xl"><StopCircle size={20}/> Cancel</button>
                                </>
                              )}
                           </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, captureTarget)} />
                        <canvas ref={canvasRef} className="hidden" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Photograph</p>
                     </div>
                  </div>

                  <div className="lg:col-span-9 space-y-10">
                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">Academic Credentials</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                           <div className="md:col-span-2 space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Student Name</label>
                              <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" placeholder="NAME OF STUDENT" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GR Number</label>
                              <input type="text" required value={formData.grNumber} onChange={e => setFormData({...formData, grNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-black text-slate-800 dark:text-white outline-none placeholder:text-slate-300 uppercase shadow-inner" placeholder="GR-XXXX" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Portal Password</label>
                              <input type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" placeholder="student786" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                              <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admission Date</label>
                              <input type="date" value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Grade</label>
                              <select value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-black text-slate-800 dark:text-white outline-none">
                                 {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                              </select>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section</label>
                              <select value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-black text-slate-800 dark:text-white outline-none">
                                 <option value="A">Section A</option>
                                 <option value="B">Section B</option>
                                 <option value="C">Section C</option>
                              </select>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-50 dark:border-emerald-900/30 pb-2">Institutional Identification</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aadhar Number</label>
                              <div className="relative">
                                 <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                 <input type="text" value={formData.aadharNo} onChange={e => setFormData({...formData, aadharNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-800 dark:text-white outline-none" placeholder="XXXX XXXX XXXX" />
                              </div>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">UID Number</label>
                              <input type="text" value={formData.uidId} onChange={e => setFormData({...formData, uidId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-black text-slate-800 dark:text-white outline-none uppercase shadow-inner" placeholder="UID-XXXX" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll Number</label>
                              <input type="text" value={formData.rollNo} onChange={e => setFormData({...formData, rollNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-black text-slate-800 dark:text-white outline-none shadow-inner" placeholder="101" />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-10">
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">Parental Registry & Residence</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           {/* Father Details */}
                           <div className="space-y-6 bg-slate-50/50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-4 mb-4">
                                 <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group shadow-sm">
                                    {isCameraActive && captureTarget === 'fatherPhoto' ? (
                                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                                    ) : (
                                      formData.fatherPhoto ? <img src={formData.fatherPhoto} className="w-full h-full object-cover" /> : <UserIcon size={24} className="text-slate-200" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                                       {!isCameraActive ? (
                                         <>
                                           <button type="button" onClick={() => startCamera('fatherPhoto')} className="p-1.5 bg-indigo-600 text-white rounded-lg"><Camera size={14}/></button>
                                           <button type="button" onClick={() => { setCaptureTarget('fatherPhoto'); fileInputRef.current?.click(); }} className="p-1.5 bg-white text-indigo-600 rounded-lg"><Upload size={14}/></button>
                                         </>
                                       ) : (
                                         <>
                                           <button type="button" onClick={capturePhoto} className="p-1.5 bg-emerald-600 text-white rounded-lg"><Check size={14}/></button>
                                           <button type="button" onClick={stopCamera} className="p-1.5 bg-rose-600 text-white rounded-lg"><X size={14}/></button>
                                         </>
                                       )}
                                    </div>
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">Father Identity</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Biometric Status: {formData.fatherPhoto ? 'LINKED' : 'NOT BOUND'}</p>
                                 </div>
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Father's Name</label>
                                 <input type="text" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase shadow-sm" />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Father's WhatsApp Number</label>
                                 <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                                    <input type="tel" maxLength={10} value={formData.fatherMobile} onChange={e => setFormData({...formData, fatherMobile: e.target.value.replace(/[^0-9]/g, '')})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 font-black text-slate-800 dark:text-white outline-none shadow-sm tracking-[0.2em]" />
                                 </div>
                              </div>
                           </div>

                           {/* Mother Details */}
                           <div className="space-y-6 bg-slate-50/50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-4 mb-4">
                                 <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden relative group shadow-sm">
                                    {isCameraActive && captureTarget === 'motherPhoto' ? (
                                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                                    ) : (
                                      formData.motherPhoto ? <img src={formData.motherPhoto} className="w-full h-full object-cover" /> : <UserIcon size={24} className="text-slate-200" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                                       {!isCameraActive ? (
                                         <>
                                           <button type="button" onClick={() => startCamera('motherPhoto')} className="p-1.5 bg-indigo-600 text-white rounded-lg"><Camera size={14}/></button>
                                           <button type="button" onClick={() => { setCaptureTarget('motherPhoto'); fileInputRef.current?.click(); }} className="p-1.5 bg-white text-indigo-600 rounded-lg"><Upload size={14}/></button>
                                         </>
                                       ) : (
                                         <>
                                           <button type="button" onClick={capturePhoto} className="p-1.5 bg-emerald-600 text-white rounded-lg"><Check size={14}/></button>
                                           <button type="button" onClick={stopCamera} className="p-1.5 bg-rose-600 text-white rounded-lg"><X size={14}/></button>
                                         </>
                                       )}
                                    </div>
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">Mother Identity</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Biometric Status: {formData.motherPhoto ? 'LINKED' : 'NOT BOUND'}</p>
                                 </div>
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mother's Name</label>
                                 <input type="text" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase shadow-sm" />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mother's WhatsApp Number</label>
                                 <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                                    <input type="tel" maxLength={10} value={formData.motherMobile} onChange={e => setFormData({...formData, motherMobile: e.target.value.replace(/[^0-9]/g, '')})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 font-black text-slate-800 dark:text-white outline-none shadow-sm tracking-[0.2em]" />
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Residence Address</label>
                           <textarea rows={2} value={formData.residenceAddress} onChange={e => setFormData({...formData, residenceAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-4 font-bold text-slate-800 dark:text-white outline-none resize-none shadow-inner" />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => { stopCamera(); setShowModal(false); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest">Discard Entry</button>
                  <button type="submit" disabled={isSyncing} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                    Finalize Identity Sync
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md no-print animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 max-sm w-full shadow-2xl text-center border border-rose-100 dark:border-rose-900/50 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-inner border border-rose-100">
                 <Trash2 size={48} strokeWidth={2.5} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Purge Data?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium text-xs uppercase tracking-widest">This erase is permanent and will sync across all terminals.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeleteId(null)} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-3xl uppercase text-[10px] tracking-widest">Keep It</button>
                 <button onClick={async () => { try { await db.students.delete(deleteId); setDeleteId(null); fetchCloudData(); } catch(e: any) { alert(getErrorMessage(e)); } }} className="py-5 bg-rose-600 text-white font-black rounded-3xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Confirm Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManager;
