import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Users as UsersIcon,
  Loader2,
  Calendar,
  Mail,
  FileText
} from 'lucide-react';
import { MOCK_STUDENTS, APP_NAME } from '../constants';

interface StudentsManagerProps {
  user: User;
}

const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const StudentsManager: React.FC<StudentsManagerProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Student>>({
    fullName: '',
    email: '',
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
    dateOfAdmission: new Date().toISOString().split('T')[0],
    dateOfBirth: '',
    remarks: '',
    profileImage: ''
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = () => {
    setIsLoading(true);
    try {
      const saved = localStorage.getItem('school_students_db_v4');
      if (saved) {
        setStudents(JSON.parse(saved));
      } else {
        const initial = (MOCK_STUDENTS as any[]).map(s => ({
            ...s,
            fullName: s.fullName || s.name,
            dateOfAdmission: new Date().toISOString().split('T')[0],
            dateOfBirth: '2010-01-01',
            remarks: 'Default entry',
            profileImage: ''
        })) as Student[];
        setStudents(initial);
        localStorage.setItem('school_students_db_v4', JSON.stringify(initial));
      }
    } catch (err) {
      console.error("Local Registry Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const syncToLocal = (updatedStudents: Student[]) => {
    localStorage.setItem('school_students_db_v4', JSON.stringify(updatedStudents));
    setStudents(updatedStudents);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const query = searchQuery.toLowerCase();
      const nameMatch = (s.fullName || s.name || '').toLowerCase().includes(query);
      const grMatch = (s.grNumber || '').toLowerCase().includes(query);
      return (nameMatch || grMatch) && (selectedClass === 'All' || s.class === selectedClass);
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
      fullName: '', email: '', panNumber: '', aadharNumber: '', uidNumber: '', 
      grNumber: `GR-${Math.floor(1000 + Math.random() * 9000)}`, residenceAddress: '',
      fatherName: '', motherName: '', fatherMobile: '', motherMobile: '',
      class: '1st', section: 'A', rollNo: '', profileImage: '',
      dateOfAdmission: new Date().toISOString().split('T')[0], dateOfBirth: '', remarks: ''
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
      alert("Requirements: Full Name and GR Number are mandatory."); return;
    }

    const payload: Student = {
        ...formData,
        id: editingStudent?.id || Math.random().toString(36).substr(2, 9),
        role: 'STUDENT',
        name: formData.fullName!
    } as Student;

    let updatedStudents: Student[];
    if (editingStudent) {
        updatedStudents = students.map(s => s.id === editingStudent.id ? payload : s);
        createAuditLog(user, 'UPDATE', 'Registry', `Updated Student: "${formData.fullName}"`);
    } else {
        updatedStudents = [payload, ...students];
        createAuditLog(user, 'CREATE', 'Registry', `Enrolled Student: "${formData.fullName}"`);
    }
    
    syncToLocal(updatedStudents);
    setShowModal(false); 
    stopCamera();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    const updated = students.filter(s => s.id !== deleteId);
    syncToLocal(updated);
    setDeleteId(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Success</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Registry Ledger Synchronized</p>
              </div>
           </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-sm w-full shadow-2xl text-center border border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                 <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Erase Record?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">This action is irreversible and erases all data for this identity.</p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteId(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl">Cancel</button>
                 <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white font-bold rounded-2xl shadow-lg">Confirm Delete</button>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Student Registry</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Comprehensive institutional database management.</p>
        </div>
        <button onClick={handleOpenAdd} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><UserPlus size={20} /> New Enrollment</button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden no-print min-h-[400px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
            <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Loading Records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                  <th className="px-10 py-6 text-left">Student Profile</th>
                  <th className="px-8 py-6 text-left">GR Reference</th>
                  <th className="px-8 py-6 text-left">Academic Pool</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg overflow-hidden">
                          {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" alt="S" /> : student.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-200 text-base uppercase">{student.fullName}</p>
                          <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{student.email || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-600 dark:text-slate-400 text-xs uppercase">{student.grNumber}</td>
                    <td className="px-8 py-6">
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase inline-block border border-indigo-100 dark:border-indigo-800">Std {student.class}-{student.section}</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleOpenEdit(student)} className="p-3 bg-white dark:bg-slate-800 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white transition-all"><Edit2 size={18} /></button>
                        <button onClick={() => setDeleteId(student.id)} className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-900 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COMPREHENSIVE ENROLLMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 sticky top-0 z-20 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><UserPlus size={24} /></div>
                <div>
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{editingStudent ? 'Modify Profile' : 'New Enrollment Form'}</h3>
                   <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Institutional Data Capture</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); stopCamera(); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12">
              <div className="flex flex-col xl:flex-row gap-12">
                 {/* Photo Column */}
                 <div className="flex flex-col items-center gap-6 flex-shrink-0">
                    <div className="relative group">
                      <div className="w-56 h-56 bg-indigo-50 dark:bg-slate-800 rounded-[3rem] border-4 border-white dark:border-slate-700 shadow-2xl flex items-center justify-center text-4xl font-black text-indigo-600 overflow-hidden ring-4 ring-indigo-50/50 dark:ring-indigo-900/20 relative">
                        {isCameraActive ? (
                          <div className="relative w-full h-full">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                            <button type="button" onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white p-3 rounded-full shadow-2xl text-indigo-600 hover:scale-110 transition-transform animate-bounce"><Camera size={24} /></button>
                          </div>
                        ) : formData.profileImage ? (
                          <img src={formData.profileImage} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                          <UserIcon size={80} className="opacity-20" />
                        )}
                        <div className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 ${isCameraActive ? 'hidden' : ''}`}>
                           <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-white rounded-2xl text-indigo-600 hover:scale-110 shadow-lg transition-transform" title="Upload Photo"><Upload size={24} /></button>
                           <button type="button" onClick={startCamera} className="p-3 bg-white rounded-2xl text-indigo-600 hover:scale-110 shadow-lg transition-transform" title="Take Photo"><Camera size={24} /></button>
                        </div>
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Institutional ID Photo</p>
                 </div>

                 {/* Form Fields Grid */}
                 <div className="flex-1 space-y-12">
                    {/* Section 1: Academic Identity */}
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] border-l-4 border-indigo-600 pl-4">I. Academic Identity</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="md:col-span-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Legal Name</label>
                             <div className="relative group">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                             </div>
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">GR Number</label>
                             <input type="text" required value={formData.grNumber} onChange={e => setFormData({...formData, grNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Roll Number</label>
                             <input type="text" value={formData.rollNo} onChange={e => setFormData({...formData, rollNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Class</label>
                             <select value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none">
                                {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                             </select>
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Section</label>
                             <select value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none">
                                <option value="A">Section A</option><option value="B">Section B</option><option value="C">Section C</option>
                             </select>
                          </div>
                          <div className="md:col-span-2">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                             <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none shadow-inner" />
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Section 2: Birth & Personal Detail */}
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] border-l-4 border-indigo-600 pl-4">II. Birth & Personal Profile</h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date of Birth</label>
                             <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none shadow-inner" />
                             </div>
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Admission Date</label>
                             <div className="relative">
                                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="date" value={formData.dateOfAdmission} onChange={e => setFormData({...formData, dateOfAdmission: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none shadow-inner" />
                             </div>
                          </div>
                          <div className="md:col-span-3">
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Residence Address</label>
                             <div className="relative">
                                <MapPin className="absolute left-4 top-4 text-slate-300" size={18} />
                                <textarea rows={2} value={formData.residenceAddress} onChange={e => setFormData({...formData, residenceAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none resize-none shadow-inner" />
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Section 3: Parental Details */}
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] border-l-4 border-indigo-600 pl-4">III. Parental Liaison</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Father Name</label>
                                <input type="text" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white" />
                             </div>
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Father Mobile</label>
                                <div className="relative">
                                   <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                   <input type="tel" value={formData.fatherMobile} onChange={e => setFormData({...formData, fatherMobile: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-700 dark:text-white" />
                                </div>
                             </div>
                          </div>
                          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Mother Name</label>
                                <input type="text" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white" />
                             </div>
                             <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-2">Mother Mobile</label>
                                <div className="relative">
                                   <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                   <input type="tel" value={formData.motherMobile} onChange={e => setFormData({...formData, motherMobile: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-700 dark:text-white" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Section 4: Document Vault */}
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] border-l-4 border-indigo-600 pl-4">IV. Identity Vault</h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Aadhar Card</label>
                             <div className="relative">
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="text" value={formData.aadharNumber} onChange={e => setFormData({...formData, aadharNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none shadow-inner" />
                             </div>
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">PAN Number</label>
                             <input type="text" value={formData.panNumber} onChange={e => setFormData({...formData, panNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none shadow-inner" />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">UID Number</label>
                             <input type="text" value={formData.uidNumber} onChange={e => setFormData({...formData, uidNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none shadow-inner" />
                          </div>
                       </div>
                    </div>

                    {/* Section 5: Institutional Log */}
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] border-l-4 border-indigo-600 pl-4">V. Institutional Log</h4>
                       <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Remarks / Observations</label>
                          <div className="relative">
                             <FileText className="absolute left-4 top-4 text-slate-300" size={18} />
                             <textarea rows={3} value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-800 dark:text-white outline-none resize-none shadow-inner" placeholder="Any specific health or behavioral notes..." />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-10 border-t border-slate-100 dark:border-slate-800 no-print">
                <button type="button" onClick={() => { setShowModal(false); stopCamera(); }} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black text-xs uppercase tracking-widest rounded-3xl transition-colors hover:bg-slate-200 dark:hover:bg-slate-700">Discard Entry</button>
                <button type="submit" className="py-5 bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all hover:-translate-y-1">Finalize Enrollment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManager;