import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Student } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { 
  Plus, Search, Trash2, Edit2, X, UserPlus, User as UserIcon, Camera, Upload, 
  CheckCircle2, ShieldCheck, Smartphone, Loader2, QrCode, RefreshCw,
  GraduationCap, FileSpreadsheet, FileDown, Printer, FileSearch, MapPin, 
  UserCheck, CreditCard, Calendar, Eye, FileText, StopCircle, AlertCircle
} from 'lucide-react';
import { APP_NAME } from '../constants';

interface StudentsManagerProps { user: User; }
const ALL_CLASSES = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
const ALL_SECTIONS = ['A', 'B', 'C', 'D', 'E'];

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
  const [viewingStudentPdf, setViewingStudentPdf] = useState<Student | null>(null);
  
  // Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialFormData: Partial<Student> = {
    fullName: '', email: '', grNumber: '', class: '1st', section: 'A', rollNo: '', profileImage: '',
    gender: 'Male', dob: '', admissionDate: '', aadharNo: '', uidId: '', penNo: '',
    fatherName: '', motherName: '', fatherMobile: '', motherMobile: '', residenceAddress: '',
  };

  const [formData, setFormData] = useState<Partial<Student>>(initialFormData);

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
        admission_date: s.admission_date,
        aadharNo: s.aadhar_no,
        uidId: s.uid_id,
        penNo: s.pen_no,
        username: s.username,
        password: s.password
      }));
      setStudents(mapped);
    } catch (err: any) { 
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
    return () => { supabase.removeChannel(channel); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      alert("Camera Access Denied: Please check permissions in your browser/mobile settings.");
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
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setFormData(prev => ({ ...prev, profileImage: dataUrl }));
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert("Image too large. Please use a photo under 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target?.result as string;
        setFormData(prev => ({ ...prev, profileImage: data }));
      };
      reader.readAsDataURL(file);
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
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      createAuditLog(user, editingStudent ? 'UPDATE' : 'CREATE', 'Registry', `Sync: ${formData.fullName}`);
      setEditingStudent(null);
      setFormData(initialFormData);
      fetchCloudData();
    } catch (err: any) { 
      alert(`Sync Error: ${err.message}. Check your cloud database connection.`); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const query = searchQuery.toLowerCase();
      const nameMatch = (s.fullName || s.name || '').toLowerCase().includes(query);
      const grMatch = (s.grNumber || '').toLowerCase().includes(query);
      return (nameMatch || grMatch) && (selectedClass === 'All' || s.class === selectedClass);
    });
  }, [students, searchQuery, selectedClass]);

  const exportToExcel = () => {
    const headers = ['GR No', 'Full Name', 'Class', 'Section', 'Roll', 'Mobile'];
    const rows = filteredStudents.map(s => [s.grNumber, s.fullName, s.class, s.section, s.rollNo, s.fatherMobile]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Student_Registry_${selectedClass}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce no-print">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Cloud Syncing...</span>
           </div>
        </div>
      )}

      {/* A4 PDF PREVIEW MODAL */}
      {viewingStudentPdf && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-start overflow-y-auto p-4 lg:p-10 no-print animate-in zoom-in-95 duration-300 custom-scrollbar">
           <div className="sticky top-0 w-full max-w-[210mm] mb-8 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-2xl flex items-center justify-between z-50 border border-white/20">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <FileSearch size={24} />
                 </div>
                 <div>
                    <h3 className="text-slate-900 dark:text-white font-black text-xl tracking-tight uppercase leading-none">A4 PDF Preview</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Official Student Identity Document</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => window.print()} className="px-8 py-4 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-700 flex items-center gap-3 shadow-xl transition-all active:scale-95">
                    <FileDown size={20} /> Download PDF / Print
                 </button>
                 <button onClick={() => setViewingStudentPdf(null)} className="p-4 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-2xl text-slate-400 hover:text-rose-500 transition-colors">
                    <X size={24} />
                 </button>
              </div>
           </div>

           <div className="relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] bg-white mb-20" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }} id="printable-a4-certificate">
              <div className="absolute inset-0 pointer-events-none opacity-[0.04] flex items-center justify-center -rotate-45 overflow-hidden">
                 <h1 className="text-[12rem] font-black uppercase text-indigo-900 select-none">OFFICIAL RECORD</h1>
              </div>
              <div className="absolute inset-4 border-[1px] border-slate-100 pointer-events-none rounded-sm"></div>
              <div className="relative z-10 space-y-12">
                 <div className="flex justify-between items-center border-b-4 border-slate-900 pb-12">
                    <div className="flex items-center gap-6">
                       <div className="w-24 h-24 bg-indigo-600 text-white rounded-3xl flex items-center justify-center font-black text-5xl shadow-2xl">
                          <GraduationCap size={50} />
                       </div>
                       <div>
                          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{APP_NAME}</h2>
                          <p className="text-indigo-600 font-black text-[11px] uppercase tracking-[0.4em] mt-2">Digital Academic Registry</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-slate-400 font-black text-[10px] uppercase mb-1">ISSUE DATE</p>
                       <p className="text-slate-900 font-black text-xl">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                 </div>
                 <div className="flex gap-16 items-start">
                    <div className="w-56 h-64 bg-slate-50 border-8 border-white rounded-[3rem] overflow-hidden shadow-2xl flex-shrink-0 ring-1 ring-slate-100">
                       {viewingStudentPdf.profileImage ? (
                         <img src={viewingStudentPdf.profileImage} className="w-full h-full object-cover" alt="S" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
                            <UserIcon size={80} />
                         </div>
                       )}
                    </div>
                    <div className="flex-1 space-y-10">
                       <div className="space-y-2">
                          <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em]">Full Registered Identity</p>
                          <h4 className="text-5xl font-black text-slate-900 uppercase tracking-tight leading-none">{viewingStudentPdf.fullName || viewingStudentPdf.name}</h4>
                          <div className="flex gap-4 mt-6">
                             <div className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest">Std {viewingStudentPdf.class}-{viewingStudentPdf.section}</div>
                             <div className="bg-indigo-50 text-indigo-600 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">Roll No #{viewingStudentPdf.rollNo}</div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Main UI Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Student Registry <ShieldCheck className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional Cloud Management & PDF Terminal</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportToExcel} className="px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-black rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm hover:bg-emerald-100 transition-all flex items-center gap-3 uppercase text-[10px] tracking-widest">
            <FileSpreadsheet size={18} /> Excel Export
          </button>
          <button onClick={() => window.print()} className="px-6 py-4 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-2xl shadow-xl hover:bg-slate-700 transition-all flex items-center gap-3 uppercase text-[10px] tracking-widest">
            <FileDown size={18} /> Print Registry
          </button>
          <button onClick={() => { setEditingStudent(null); setFormData(initialFormData); setShowModal(true); stopCamera(); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><UserPlus size={20} strokeWidth={3} /> New Enrollment</button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center no-print">
          <div className="relative group w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Search by Name or GR No..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner dark:text-white" />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full pb-2 md:pb-0 custom-scrollbar">
              <button onClick={() => setSelectedClass('All')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${selectedClass === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>All Grades</button>
              {ALL_CLASSES.map(c => (
                <button key={c} onClick={() => setSelectedClass(c)} className={`whitespace-nowrap px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${selectedClass === c ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{c}</button>
              ))}
          </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px] no-print">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center text-slate-400 animate-pulse">
            <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
            <p className="font-black text-xs uppercase tracking-widest text-slate-400">Connecting to Cloud Registry...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-10 py-6 text-left">Identity Profile</th>
                  <th className="px-8 py-6 text-left">Identity Numbers</th>
                  <th className="px-8 py-6 text-left">Grade / Roll</th>
                  <th className="px-8 py-6 text-left">Guardian Details</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg overflow-hidden group-hover:scale-110 transition-transform">
                          {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" alt="S" /> : (student.fullName || student.name || '').charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-white text-base uppercase leading-tight">{student.fullName || student.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-700 dark:text-slate-300 text-sm uppercase">GR: {student.grNumber}</td>
                    <td className="px-8 py-6">
                      <div className="inline-block bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase border border-indigo-100 dark:border-indigo-800">Std {student.class}-{student.section} • Roll {student.rollNo}</div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{student.fatherName}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Smartphone size={10}/> {student.fatherMobile}</p>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => setViewingStudentPdf(student)} className="p-3 bg-white dark:bg-slate-800 text-indigo-600 rounded-xl border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"><FileSearch size={18} /></button>
                        <button onClick={() => { setEditingStudent(student); setFormData(student); setShowModal(true); stopCamera(); }} className="p-3 bg-white dark:bg-slate-800 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Edit2 size={18} /></button>
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

      {/* Enrollment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in no-print">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingStudent ? 'Update Registry' : 'New Enrollment'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Institutional Registry Point</p>
               </div>
               <button onClick={() => { stopCamera(); setShowModal(false); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={28} /></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-10 bg-white dark:bg-slate-900">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-3">
                     <div className="flex flex-col items-center gap-5 sticky top-0">
                        <div className="w-56 h-56 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center relative group">
                           {isCameraActive ? (
                             <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                           ) : (
                             formData.profileImage ? <img src={formData.profileImage} className="w-full h-full object-cover" alt="Profile" /> : <UserIcon size={80} className="text-slate-200" />
                           )}
                           
                           <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              {!isCameraActive ? (
                                <>
                                  <button type="button" onClick={startCamera} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-white/20 p-4 rounded-2xl hover:bg-indigo-600 transition-all">
                                    <Camera size={20}/> Camera
                                  </button>
                                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-white/20 p-4 rounded-2xl hover:bg-indigo-600 transition-all">
                                    <Upload size={20}/> Upload
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button type="button" onClick={capturePhoto} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-emerald-600 p-4 rounded-2xl animate-pulse">
                                    <Camera size={20}/> Capture
                                  </button>
                                  <button type="button" onClick={stopCamera} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-rose-600 p-4 rounded-2xl">
                                    <StopCircle size={20}/> Cancel
                                  </button>
                                </>
                              )}
                           </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="text-center">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Identity Photograph</h4>
                          <div className="flex gap-2 mt-4 no-print">
                             <button type="button" onClick={startCamera} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">
                                <Camera size={14} /> Open Camera
                             </button>
                          </div>
                        </div>
                     </div>
                  </div>

                  <div className="lg:col-span-9 space-y-10">
                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 pb-2">Academic Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                           <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                              <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" placeholder="JOHN DOE" />
                           </div>
                           <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GR No.</label>
                              <input type="text" required value={formData.grNumber} onChange={e => setFormData({...formData, grNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" placeholder="GR-1001" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class</label>
                              <select value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none">
                                 {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                              </select>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section</label>
                              <select value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none">
                                 {ALL_SECTIONS.map(s => <option key={s} value={s}>Sec {s}</option>)}
                              </select>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll No</label>
                              <input type="text" value={formData.rollNo} onChange={e => setFormData({...formData, rollNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" placeholder="101" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                              <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none">
                                 <option value="Male">Male</option>
                                 <option value="Female">Female</option>
                                 <option value="Other">Other</option>
                              </select>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-50 pb-2">Parental & Residency</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Father's Name</label>
                              <input type="text" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Father's Mobile No</label>
                              <input type="tel" value={formData.fatherMobile} onChange={e => setFormData({...formData, fatherMobile: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mother's Name</label>
                              <input type="text" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mother's Mobile No</label>
                              <input type="tel" value={formData.motherMobile} onChange={e => setFormData({...formData, motherMobile: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                           </div>
                           <div className="space-y-1 md:col-span-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Residence Address</label>
                              <textarea rows={2} value={formData.residenceAddress} onChange={e => setFormData({...formData, residenceAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none resize-none" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => { stopCamera(); setShowModal(false); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest">Discard Entry</button>
                  <button type="submit" disabled={isSyncing} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                    Finalize Enrollment
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
                 <button onClick={async () => { await db.students.delete(deleteId); setDeleteId(null); fetchCloudData(); }} className="py-5 bg-rose-600 text-white font-black rounded-3xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Confirm Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManager;