
import React, { useState, useMemo, useEffect, useRef } from 'react';
// Removed unused jsQR import which could cause module load failure
import { User, Student } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  UserPlus, 
  User as UserIcon, 
  Camera, 
  Upload, 
  MapPin, 
  QrCode, 
  Printer, 
  FileSearch, 
  CheckCircle2, 
  ShieldCheck, 
  CreditCard,
  Hash,
  Contact,
  Smartphone,
  Users as UsersIcon
} from 'lucide-react';
import { MOCK_STUDENTS, APP_NAME } from '../constants';

interface StudentsManagerProps {
  user: User;
}

const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const StudentsManager: React.FC<StudentsManagerProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('school_students_db');
    if (saved) return JSON.parse(saved);
    return MOCK_STUDENTS as Student[];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [viewingStudentPdf, setViewingStudentPdf] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Camera & Image State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    fullName: '',
    panNumber: '',
    aadharNumber: '',
    uidNumber: '',
    grNumber: '',
    residenceAddress: '',
    fatherName: '',
    motherName: '',
    fatherMobile: '',
    motherMobile: '',
    class: '1st',
    section: 'A',
    rollNo: '',
    profileImage: ''
  });

  useEffect(() => {
    localStorage.setItem('school_students_db', JSON.stringify(students));
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const query = searchQuery.toLowerCase();
      const fullName = (s.fullName || s.name || '').toLowerCase();
      const matchesSearch = fullName.includes(query) || (s.grNumber || '').includes(query);
      const matchesClass = selectedClass === 'All' || s.class === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [students, searchQuery, selectedClass]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 400, height: 400 } });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setIsCameraActive(true);
    } catch (err) { alert("Camera access denied."); }
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        setFormData(prev => ({ ...prev, profileImage: canvas.toDataURL('image/png') }));
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setFormData(prev => ({ ...prev, profileImage: ev.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      fullName: '', panNumber: '', aadharNumber: '', uidNumber: '', 
      grNumber: `GR-${Math.floor(1000 + Math.random() * 9000)}`, residenceAddress: '',
      fatherName: '', motherName: '', fatherMobile: '', motherMobile: '',
      class: '1st', section: 'A', rollNo: '', profileImage: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData(student);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.grNumber) {
      alert("Essential fields missing (Full Name, GR Number)."); return;
    }
    
    if (editingStudent) {
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? { ...s, ...formData, name: formData.fullName } as Student : s));
      createAuditLog(user, 'UPDATE', 'Registry', `Updated: "${formData.fullName}" (GR: ${formData.grNumber})`);
    } else {
      const newStudent: Student = { 
        ...formData, 
        id: Math.random().toString(36).substr(2, 9), 
        name: formData.fullName,
        role: 'STUDENT',
        email: `${formData.rollNo || 'std'}@school.com`
      } as Student;
      setStudents(prev => [newStudent, ...prev]);
      createAuditLog(user, 'CREATE', 'Registry', `Enrolled: "${formData.fullName}" (GR: ${formData.grNumber})`);
    }
    setShowModal(false); 
    stopCamera();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const confirmDelete = () => {
    if (deleteId) { 
      const target = students.find(s => s.id === deleteId);
      setStudents(prev => prev.filter(s => s.id !== deleteId)); 
      setDeleteId(null); 
      createAuditLog(user, 'DELETE', 'Registry', `Purged: "${target?.fullName}" (GR: ${target?.grNumber})`);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-emerald-200/50 flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Success</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Database Synchronized</p>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-sm w-full shadow-2xl text-center">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                 <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Purge Student?</h3>
              <p className="text-slate-500 font-medium mb-8">This will permanently erase all records for this student.</p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">Cancel</button>
                 <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl shadow-lg shadow-rose-100">Delete</button>
              </div>
           </div>
        </div>
      )}

      {/* Profile PDF Viewer Terminal */}
      {viewingStudentPdf && (
        <div className="fixed inset-0 z-[600] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 lg:p-10 no-print animate-in zoom-in-95 duration-300">
           <div className="bg-white rounded-[3rem] w-full max-w-4xl h-full flex flex-col shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                       <FileSearch size={20} />
                    </div>
                    <div>
                       <h3 className="text-slate-900 font-black text-lg tracking-tight uppercase">Student Registry Certificate</h3>
                       <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">GR NO: {viewingStudentPdf.grNumber}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => window.print()} className="px-6 py-3 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-lg transition-all">
                       <Printer size={16} /> Print Profile
                    </button>
                    <button onClick={() => setViewingStudentPdf(null)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                       <X size={24} />
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-slate-100/30 flex justify-center">
                 <div className="bg-white w-full max-w-2xl shadow-xl p-16 relative overflow-hidden" id="student-printable-profile">
                    <div className="absolute inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center -rotate-12">
                       <h1 className="text-[12rem] font-black uppercase text-slate-900">{APP_NAME}</h1>
                    </div>

                    <div className="relative z-10 space-y-12">
                       <div className="flex justify-between items-center border-b-4 border-slate-900 pb-10">
                          <div className="flex items-center gap-6">
                             <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-4xl shadow-xl">E</div>
                             <div>
                                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{APP_NAME}</h2>
                                <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.4em] mt-1">Official Enrollment Terminal</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-slate-400 font-black text-[9px] uppercase mb-1">Session</p>
                             <p className="text-slate-900 font-black text-xl">2026 - 2027</p>
                          </div>
                       </div>

                       <div className="flex gap-12 items-start">
                          <div className="w-48 h-56 bg-slate-50 border-4 border-slate-100 rounded-3xl overflow-hidden shadow-lg flex-shrink-0">
                             {viewingStudentPdf.profileImage ? (
                               <img src={viewingStudentPdf.profileImage} className="w-full h-full object-cover" alt="Student" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center"><UserIcon size={64} className="text-slate-200" /></div>
                             )}
                          </div>
                          <div className="flex-1 space-y-8">
                             <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Legal Registered Name</p>
                                <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight">{viewingStudentPdf.fullName}</h4>
                                <div className="mt-4 inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                   Std {viewingStudentPdf.class}-{viewingStudentPdf.section} • Roll #{viewingStudentPdf.rollNo || 'NA'}
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-8 pt-4">
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase mb-1">GR Number</p>
                                   <p className="text-sm font-black text-slate-800">{viewingStudentPdf.grNumber}</p>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 gap-12 pt-10 border-t border-slate-100">
                          <div className="space-y-8">
                             <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 flex items-center gap-3">
                                <ShieldCheck size={16} /> Official Identity Registry
                             </h5>
                             <div className="grid grid-cols-3 gap-8">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                   <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5">PAN Number</p>
                                   <p className="text-sm font-black text-slate-900 uppercase">{viewingStudentPdf.panNumber || 'NOT RECORDED'}</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                   <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5">Aadhar Card</p>
                                   <p className="text-sm font-black text-slate-900 uppercase">{viewingStudentPdf.aadharNumber || 'NOT RECORDED'}</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                   <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5">UID Number</p>
                                   <p className="text-sm font-black text-slate-900 uppercase">{viewingStudentPdf.uidNumber || 'NOT RECORDED'}</p>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-6">
                             <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 flex items-center gap-3">
                                <UsersIcon size={16} /> Parental Contacts
                             </h5>
                             <div className="grid grid-cols-2 gap-8">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                   <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5">Father</p>
                                   <p className="text-sm font-black text-slate-900 uppercase">{viewingStudentPdf.fatherName || '---'}</p>
                                   <p className="text-[10px] text-indigo-600 font-bold mt-1">{viewingStudentPdf.fatherMobile || '---'}</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                   <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5">Mother</p>
                                   <p className="text-sm font-black text-slate-900 uppercase">{viewingStudentPdf.motherName || '---'}</p>
                                   <p className="text-[10px] text-indigo-600 font-bold mt-1">{viewingStudentPdf.motherMobile || '---'}</p>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-6">
                             <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 flex items-center gap-3">
                                <MapPin size={16} /> Verified Address
                             </h5>
                             <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl">
                                <p className="text-sm font-bold leading-relaxed uppercase tracking-wide italic opacity-90">
                                   "{viewingStudentPdf.residenceAddress || 'No primary residence address found in registry.'}"
                                </p>
                             </div>
                          </div>
                       </div>

                       <div className="mt-20 pt-10 border-t-2 border-dashed border-slate-200 flex justify-between items-end opacity-50">
                          <div className="text-center">
                             <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center mb-2">
                                <QrCode size={48} className="text-slate-200" />
                             </div>
                             <p className="text-[8px] font-black uppercase tracking-widest">Institutional Token</p>
                          </div>
                          <div className="text-center">
                             <div className="w-56 border-b-2 border-slate-900 mb-2"></div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Registrar / Administrator</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Enrollment & Edit Modal - Student mobile number removed */}
      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30 sticky top-0 z-20 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><UserPlus size={24} /></div>
                <div>
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{editingStudent ? 'Sync Student Record' : 'Registry Enrollment'}</h3>
                   <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Multi-Field Professional Intake</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); stopCamera(); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={24} /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12">
              <div className="flex flex-col md:flex-row gap-12">
                 <div className="flex flex-col items-center gap-6">
                    <div className="relative group">
                      <div className="w-44 h-44 bg-indigo-50 dark:bg-slate-800 rounded-[3rem] border-4 border-white dark:border-slate-700 shadow-2xl flex items-center justify-center text-4xl font-black text-indigo-600 overflow-hidden ring-4 ring-indigo-50/50 dark:ring-indigo-900/20 relative">
                        {isCameraActive ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" /> : formData.profileImage ? <img src={formData.profileImage} className="w-full h-full object-cover" alt="Profile" /> : <UserIcon size={64} className="opacity-20" />}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                           <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-white rounded-2xl text-indigo-600 hover:scale-110 shadow-lg"><Upload size={20} /></button>
                           <button type="button" onClick={startCamera} className="p-3 bg-white rounded-2xl text-indigo-600 hover:scale-110 shadow-lg"><Camera size={20} /></button>
                        </div>
                      </div>
                    </div>
                    {isCameraActive && (
                      <div className="flex gap-2">
                        <button type="button" onClick={capturePhoto} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg text-[10px] uppercase tracking-widest">Capture</button>
                        <button type="button" onClick={stopCamera} className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-[10px] uppercase tracking-widest">Cancel</button>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    <p className="text-[9px] font-black text-slate-400 uppercase text-center tracking-widest">Enrollment Photo</p>
                 </div>

                 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2">
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Legal Name</label>
                       <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" placeholder="Student's complete name" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">GR Number</label>
                       <div className="relative">
                          <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input type="text" required value={formData.grNumber} onChange={e => setFormData({...formData, grNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                       </div>
                    </div>
                 </div>
              </div>

              {/* Parental Information Section */}
              <div className="space-y-8">
                 <div className="flex items-center gap-3 border-l-4 border-indigo-600 pl-4 py-1">
                    <UsersIcon size={20} className="text-indigo-600" />
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">Parental Information</h4>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-6">
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Father's Full Name</label>
                          <div className="relative">
                             <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                             <input type="text" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" placeholder="Father's name" />
                          </div>
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Father's Mobile No.</label>
                          <div className="relative">
                             <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                             <input type="text" value={formData.fatherMobile} onChange={e => setFormData({...formData, fatherMobile: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" placeholder="Father's phone" />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mother's Full Name</label>
                          <div className="relative">
                             <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                             <input type="text" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" placeholder="Mother's name" />
                          </div>
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mother's Mobile No.</label>
                          <div className="relative">
                             <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                             <input type="text" value={formData.motherMobile} onChange={e => setFormData({...formData, motherMobile: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" placeholder="Mother's phone" />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="flex items-center gap-3 border-l-4 border-indigo-600 pl-4 py-1">
                    <ShieldCheck size={20} className="text-indigo-600" />
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">Government Identification</h4>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">PAN Number</label>
                       <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input type="text" value={formData.panNumber} onChange={e => setFormData({...formData, panNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" />
                       </div>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Aadhar Card No.</label>
                       <div className="relative">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input type="text" value={formData.aadharNumber} onChange={e => setFormData({...formData, aadharNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0000-0000-0000" />
                       </div>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">UID Number</label>
                       <div className="relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input type="text" value={formData.uidNumber} onChange={e => setFormData({...formData, uidNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                 <div className="md:col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Class</label>
                    <select value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none">
                       {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                    </select>
                 </div>
                 <div className="md:col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Section</label>
                    <select value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none">
                       <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                    </select>
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Roll Number</label>
                    <input type="text" value={formData.rollNo} onChange={e => setFormData({...formData, rollNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none" placeholder="e.g., 101" />
                 </div>
              </div>

              <div>
                 <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Residence Address</label>
                 <div className="relative">
                    <MapPin className="absolute left-4 top-6 text-slate-300" size={18} />
                    <textarea value={formData.residenceAddress} onChange={e => setFormData({...formData, residenceAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl pl-12 pr-6 py-5 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner h-32 resize-none" placeholder="Complete residential address..." />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => { setShowModal(false); stopCamera(); }} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest rounded-3xl">Cancel</button>
                <button type="submit" className="py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl shadow-2xl shadow-indigo-100 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-all">Synchronize</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Header Content */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Student Registry</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Institutional database tracking personal, parental, and government identifiers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleOpenAdd} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all"><UserPlus size={20} /> New Enrollment</button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row items-center gap-6 no-print">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input type="text" placeholder="Query Name or GR No..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-16 pr-8 py-4.5 text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" />
        </div>
        <div className="flex gap-4 w-full xl:w-auto overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex-shrink-0">
             <span className="pl-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Grade:</span>
             <div className="flex gap-1">
               {['All', ...ALL_CLASSES.slice(8)].map(c => (
                 <button key={c} onClick={() => setSelectedClass(c)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${selectedClass === c ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>{c}</button>
               ))}
             </div>
          </div>
        </div>
      </div>

      {/* Registry Table - Student mobile column removed */}
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                <th className="px-10 py-6 text-left">Identity Profile</th>
                <th className="px-8 py-6 text-left">GR Reference</th>
                <th className="px-8 py-6 text-left">Parents (Father/Mother)</th>
                <th className="px-8 py-6 text-left">Placement</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg overflow-hidden group-hover:scale-110 transition-transform">
                          {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" alt={student.fullName} /> : (student.fullName || student.name || '').charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-200 text-base uppercase leading-tight tracking-tight">{student.fullName || student.name}</p>
                          <p className="text-[10px] text-indigo-500 font-black mt-1 uppercase tracking-widest">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-xs font-black text-slate-800 dark:text-slate-300 uppercase tracking-tight">{student.grNumber}</p>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                             <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{student.fatherName || '---'}</span>
                             <span className="text-[9px] font-bold text-slate-400">({student.fatherMobile || 'No contact'})</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                             <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{student.motherName || '---'}</span>
                             <span className="text-[9px] font-bold text-slate-400">({student.motherMobile || 'No contact'})</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase border border-indigo-100 dark:border-indigo-900/50">Std {student.class}-{student.section}</div>
                        <div className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">#{student.rollNo || 'NA'}</div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <button onClick={() => setViewingStudentPdf(student)} className="p-3 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white transition-all"><FileSearch size={18} /></button>
                        <button onClick={() => handleOpenEdit(student)} className="p-3 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white transition-all"><Edit2 size={18} /></button>
                        <button onClick={() => setDeleteId(student.id)} className="p-3 bg-white dark:bg-slate-800 text-rose-500 dark:text-rose-400 rounded-xl shadow-sm border border-rose-100 dark:border-rose-900/50 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="py-32 text-center text-slate-400 font-black uppercase tracking-widest">Registry empty matching current filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentsManager;
