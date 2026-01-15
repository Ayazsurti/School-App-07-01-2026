
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Teacher } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { 
  Plus, Search, Trash2, Edit2, X, UserPlus, User as UserIcon, Camera, Upload, 
  CheckCircle2, ShieldCheck, Loader2, RefreshCw, RotateCcw,
  Contact, Smartphone, Phone, Mail, MapPin, 
  UserCheck, Calendar, Info, StopCircle,
  Printer, ShieldAlert, Key, Eye, EyeOff, Activity, AlertTriangle, UserMinus, UserCheck as UserActiveIcon,
  CreditCard, Building2, Fingerprint, Lock, Zap, Cpu, Shield
} from 'lucide-react';
import { APP_NAME } from '../constants';

interface TeachersManagerProps { user: User; }

const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const TeachersManager: React.FC<TeachersManagerProps> = ({ user }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialFormData: Partial<Teacher> = {
    fullName: '', email: '', staffId: '', mobile: '', alternateMobile: '', profileImage: '',
    qualification: '', subjects: [], status: 'ACTIVE', gender: 'Male',
    joiningDate: new Date().toISOString().split('T')[0],
    dob: '', residenceAddress: '', assignedRole: 'SUBJECT_TEACHER',
    assignedClass: '1st', assignedSection: 'A',
    aadharNo: '', panNo: '',
    accountNo: '', accountType: 'SAVINGS', bankName: '', ifscCode: '',
    branchName: '', branchAddress: '', branchCode: '', branchPhone: '',
    username: '', password: ''
  };

  const [formData, setFormData] = useState<Partial<Teacher>>(initialFormData);

  const fetchCloudData = async () => {
    try {
      const data = await db.teachers.getAll();
      const mapped = data.map((t: any) => ({
        id: t.id,
        fullName: t.name,
        name: t.name,
        staffId: t.staff_id,
        mobile: t.mobile,
        alternateMobile: t.alternate_mobile,
        email: t.email,
        qualification: t.qualification,
        residenceAddress: t.residence_address,
        gender: t.gender,
        status: t.status,
        profileImage: t.profile_image,
        joiningDate: t.joining_date,
        dob: t.dob,
        subjects: t.subject ? t.subject.split(', ') : [],
        assignedRole: t.assigned_role || 'SUBJECT_TEACHER',
        assignedClass: t.assigned_class,
        assignedSection: t.assigned_section,
        aadharNo: t.aadhar_no,
        panNo: t.pan_no,
        accountNo: t.account_no,
        accountType: t.account_type,
        bankName: t.bank_name,
        ifscCode: t.ifsc_code,
        branchName: t.branch_name,
        branchAddress: t.branch_address,
        branchCode: t.branch_code,
        branchPhone: t.branch_phone,
        username: t.username,
        password: t.password
      }));
      setTeachers(mapped);
    } catch (err: any) { 
      console.error("Cloud Fetch Error:", err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-teachers-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => {
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
    } catch (err) { alert("Camera Access Denied."); }
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
      const reader = new FileReader();
      reader.onload = (ev) => setFormData(prev => ({ ...prev, profileImage: ev.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const resetPassword = () => {
    const newPass = `tea${Math.floor(1000 + Math.random() * 9000)}`;
    setFormData(prev => ({ ...prev, password: newPass }));
    createAuditLog(user, 'UPDATE', 'Security', `Admin intervention: Password reset for ${formData.fullName}`);
    alert(`Temporary Key Generated: ${newPass}`);
  };

  const toggleBlockStatus = () => {
    const nextStatus = formData.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    setFormData(prev => ({ ...prev, status: nextStatus }));
    createAuditLog(user, 'UPDATE', 'Access', `${nextStatus === 'BLOCKED' ? 'Revoked' : 'Restored'} cloud access for ${formData.fullName}`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.staffId) {
      alert("Name and Staff ID are required.");
      return;
    }
    setIsSyncing(true);
    try {
      await db.teachers.upsert({ ...formData, id: editingTeacher?.id });
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      createAuditLog(user, editingTeacher ? 'UPDATE' : 'CREATE', 'Registry', `Cloud Sync Complete: ${formData.fullName}`);
      setEditingTeacher(null);
      setFormData(initialFormData);
      fetchCloudData();
    } catch (err: any) { alert(`Sync Error: ${err.message}`); }
    finally { setIsSyncing(false); }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const query = searchQuery.toLowerCase();
      return (t.fullName || t.name || '').toLowerCase().includes(query) || (t.staffId || '').toLowerCase().includes(query);
    });
  }, [teachers, searchQuery]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce no-print">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Cloud Sync Active...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Global Registry Updated</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Faculty record synced</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Faculty Management <UserCheck className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional Cloud Faculty Directory & Registry</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => window.print()} className="px-6 py-4 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-2xl shadow-xl hover:bg-slate-700 transition-all flex items-center gap-3 uppercase text-[10px] tracking-widest">
            <Printer size={18} /> Print Directory
          </button>
          <button onClick={() => { setEditingTeacher(null); setFormData(initialFormData); setActiveTab('profile'); setShowModal(true); stopCamera(); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><UserPlus size={20} strokeWidth={3} /> Teacher Registration</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative group w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input type="text" placeholder="Search by Name or Staff ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner dark:text-white" />
          </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center text-slate-400 animate-pulse">
            <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
            <p className="font-black text-xs uppercase tracking-widest text-slate-400">Connecting to Cloud Faculty Matrix...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-10 py-6 text-left">Faculty Profile</th>
                  <th className="px-8 py-6 text-left">Institutional Role</th>
                  <th className="px-8 py-6 text-left">Primary Subject</th>
                  <th className="px-8 py-6 text-left">Access Status</th>
                  <th className="px-8 py-6 text-right">Registry Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group ${teacher.status === 'BLOCKED' ? 'opacity-60' : ''}`}>
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 ${teacher.status === 'BLOCKED' ? 'bg-slate-400' : 'bg-indigo-600'} rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg overflow-hidden group-hover:scale-110 transition-transform relative`}>
                          {teacher.profileImage ? <img src={teacher.profileImage} className="w-full h-full object-cover" alt="T" /> : (teacher.fullName || '').charAt(0)}
                          {teacher.status === 'BLOCKED' && <div className="absolute inset-0 bg-rose-600/40 flex items-center justify-center"><ShieldAlert size={20} /></div>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <p className="font-black text-slate-800 dark:text-white text-base uppercase leading-tight">{teacher.fullName}</p>
                             <div className={`w-2 h-2 rounded-full ${teacher.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{teacher.staffId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{teacher.assignedRole?.replace('_', ' ')}</p>
                          {teacher.assignedRole === 'CLASS_TEACHER' && (
                             <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Std {teacher.assignedClass}-{teacher.assignedSection}</p>
                          )}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-block bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase border border-indigo-100 dark:border-indigo-800">
                        {teacher.subjects[0] || 'General'}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                         teacher.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                         teacher.status === 'BLOCKED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                         'bg-slate-50 text-slate-400 border-slate-100'
                       }`}>
                         {teacher.status}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingTeacher(teacher); setFormData(teacher); setActiveTab('profile'); setShowModal(true); stopCamera(); }} className="p-3 bg-white dark:bg-slate-800 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Edit2 size={18} /></button>
                        <button onClick={() => setDeleteId(teacher.id)} className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-900 hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
               <div className="flex items-center gap-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingTeacher ? 'Update Teacher Record' : 'Teacher Registration'}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Institutional Cloud Identity Portal</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                     <button onClick={() => setActiveTab('profile')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>General Profile</button>
                     <button onClick={() => setActiveTab('security')} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-400'}`}>Neural Access</button>
                  </div>
               </div>
               <button onClick={() => { stopCamera(); setShowModal(false); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={28} /></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12 bg-white dark:bg-slate-900">
               {activeTab === 'profile' ? (
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
                                    <button type="button" onClick={startCamera} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-white/20 p-4 rounded-2xl hover:bg-indigo-600 transition-all"><Camera size={20}/> Camera</button>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-white/20 p-4 rounded-2xl hover:bg-indigo-600 transition-all"><Upload size={20}/> Upload</button>
                                  </>
                                ) : (
                                  <>
                                    <button type="button" onClick={capturePhoto} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-emerald-600 p-4 rounded-2xl animate-pulse"><Camera size={20}/> Capture</button>
                                    <button type="button" onClick={stopCamera} className="flex flex-col items-center gap-1 font-bold uppercase text-[8px] tracking-widest bg-rose-600 p-4 rounded-2xl"><StopCircle size={20}/> Cancel</button>
                                  </>
                                )}
                             </div>
                          </div>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                          <div className="text-center"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Identity Photograph</h4></div>
                       </div>
                    </div>

                    <div className="lg:col-span-9 space-y-12">
                       {/* Identity & Personal */}
                       <div className="space-y-6">
                          <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">Institutional Identity</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Teacher Name</label>
                                <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" placeholder="DR. SARAH PARKER" />
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff ID / Employee Code</label>
                                <input type="text" required value={formData.staffId} onChange={e => setFormData({...formData, staffId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase" placeholder="TEA-2026-001" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                                <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qualification</label>
                                <input type="text" value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase" placeholder="PHD / BED" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Joining Date</label>
                                <input type="date" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                                <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none">
                                   <option value="Male">Male</option>
                                   <option value="Female">Female</option>
                                </select>
                             </div>
                          </div>
                       </div>

                       {/* Contact & Legal */}
                       <div className="space-y-6">
                          <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-50 dark:border-emerald-900/30 pb-2">Identity & Contact Records</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Mobile</label>
                                <input type="tel" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alternate Mobile</label>
                                <input type="tel" value={formData.alternateMobile} onChange={e => setFormData({...formData, alternateMobile: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aadhar Number</label>
                                <div className="relative">
                                   <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                   <input type="text" value={formData.aadharNo} onChange={e => setFormData({...formData, aadharNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-800 dark:text-white outline-none" placeholder="XXXX XXXX XXXX" />
                                </div>
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PAN Number</label>
                                <div className="relative">
                                   <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                   <input type="text" value={formData.panNo} onChange={e => setFormData({...formData, panNo: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase" placeholder="ABCDE1234F" />
                                </div>
                             </div>
                             <div className="md:col-span-4 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Residence Address</label>
                                <textarea rows={2} value={formData.residenceAddress} onChange={e => setFormData({...formData, residenceAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none resize-none" />
                             </div>
                          </div>
                       </div>

                       {/* Bank Account Details */}
                       <div className="space-y-6">
                          <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-2 border-b border-amber-50 dark:border-amber-900/30 pb-2"><Building2 size={14} /> Financial Archive (Bank)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account No</label>
                                <input type="text" value={formData.accountNo} onChange={e => setFormData({...formData, accountNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Type</label>
                                <select value={formData.accountType} onChange={e => setFormData({...formData, accountType: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none">
                                   <option value="SAVINGS">SAVINGS ACCOUNT</option>
                                   <option value="CURRENT">CURRENT ACCOUNT</option>
                                </select>
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                                <input type="text" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase" />
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IFSC Code</label>
                                <input type="text" value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase" placeholder="BANK0000123" />
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch Name</label>
                                <input type="text" value={formData.branchName} onChange={e => setFormData({...formData, branchName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase" />
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch Code</label>
                                <input type="text" value={formData.branchCode} onChange={e => setFormData({...formData, branchCode: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase" />
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch Phone</label>
                                <input type="tel" value={formData.branchPhone} onChange={e => setFormData({...formData, branchPhone: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                             </div>
                             <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch Address</label>
                                <input type="text" value={formData.branchAddress} onChange={e => setFormData({...formData, branchAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none uppercase" />
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               ) : (
                 /* Neural Access Cyber Theme Security Tab */
                 <div className="animate-in slide-in-from-right-12 duration-700 space-y-10 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       {/* Status & Firewall */}
                       <div className="bg-slate-950 rounded-[3rem] p-10 border-2 border-indigo-500/30 shadow-[0_0_50px_-12px_rgba(99,102,241,0.2)] relative overflow-hidden group">
                          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                          <div className="relative z-10 flex items-center gap-5 mb-10">
                             <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse">
                                <Shield size={28} />
                             </div>
                             <div>
                                <h4 className="text-xl font-black text-white uppercase tracking-tighter">Neural Firewall</h4>
                                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.4em]">Auth Status: Synchronized</p>
                             </div>
                          </div>

                          <div className="space-y-6 relative z-10">
                             <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
                                <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Reach</p>
                                   <p className={`text-lg font-black uppercase ${formData.status === 'BLOCKED' ? 'text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]'}`}>{formData.status}</p>
                                </div>
                                <button 
                                  type="button"
                                  onClick={toggleBlockStatus}
                                  className={`p-4 rounded-xl transition-all border-2 ${formData.status === 'BLOCKED' ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(52,211,153,0.4)]' : 'bg-rose-600 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:scale-105'}`}
                                >
                                   {formData.status === 'BLOCKED' ? <Zap size={24} /> : <StopCircle size={24} />}
                                </button>
                             </div>
                             
                             <div className="p-6 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl flex items-start gap-4">
                                <Cpu size={20} className="text-indigo-400 shrink-0" />
                                <p className="text-[10px] font-bold text-indigo-300 leading-relaxed uppercase tracking-wider italic">Neural Override: Revoking access will immediately de-authenticate this identity from the global educational grid.</p>
                             </div>
                          </div>
                       </div>

                       {/* Credentials & Biometrics */}
                       <div className="bg-slate-950 rounded-[3rem] p-10 border-2 border-cyan-500/30 shadow-[0_0_50px_-12px_rgba(6,182,212,0.2)] relative overflow-hidden group">
                          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                          <div className="relative z-10 flex items-center gap-5 mb-10">
                             <div className="w-14 h-14 bg-cyan-600/20 text-cyan-400 rounded-2xl flex items-center justify-center border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                                <Lock size={28} />
                             </div>
                             <div>
                                <h4 className="text-xl font-black text-white uppercase tracking-tighter">Access Protocols</h4>
                                <p className="text-[8px] font-black text-cyan-400 uppercase tracking-[0.4em]">Identity Hash: Secure</p>
                             </div>
                          </div>

                          <div className="space-y-6 relative z-10">
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-cyan-400 uppercase tracking-widest ml-1">Registry Key (Username)</label>
                                <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 font-black text-white outline-none focus:border-cyan-500 transition-all shadow-inner" placeholder="USER.IDENTITY.01" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-cyan-400 uppercase tracking-widest ml-1">Encryption Pass (Password)</label>
                                <div className="relative">
                                   <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl pl-5 pr-14 py-4 font-black text-white outline-none focus:border-cyan-500 transition-all shadow-inner" placeholder="••••••••" />
                                   <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400/50 hover:text-cyan-400 transition-colors">
                                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                   </button>
                                </div>
                             </div>
                             <button type="button" onClick={resetPassword} className="w-full py-4 bg-cyan-900/20 text-cyan-400 font-black rounded-xl text-[9px] uppercase tracking-[0.3em] border border-cyan-500/30 flex items-center justify-center gap-3 hover:bg-cyan-600 hover:text-white transition-all">
                                <RotateCcw size={16}/> Regenerate Master Token
                             </button>
                          </div>
                       </div>
                    </div>

                    <div className="bg-slate-950 rounded-[4rem] p-12 border border-white/5 shadow-2xl relative overflow-hidden group">
                       <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px]"></div>
                       <div className="flex items-center justify-between mb-12 relative z-10">
                          <div className="flex items-center gap-5">
                             <Activity size={32} className="text-indigo-400 animate-pulse" />
                             <div>
                                <h4 className="text-2xl font-black text-white uppercase tracking-tight">Identity Activity Hub</h4>
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">Cloud Heartbeat: Stable</p>
                             </div>
                          </div>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-400/10 px-4 py-2 rounded-full border border-emerald-400/20">Synced 0.2ms Ago</span>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                          <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-white/10 transition-all">
                             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Login Node</p>
                             <p className="text-lg font-black text-white truncate uppercase tracking-tighter">SERVER-DEEN-04</p>
                          </div>
                          <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-white/10 transition-all">
                             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Protocol Access</p>
                             <p className="text-lg font-black text-white uppercase tracking-tighter">{new Date().toLocaleTimeString()}</p>
                          </div>
                          <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-white/10 transition-all">
                             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Geo Tagging</p>
                             <p className="text-lg font-black text-white uppercase tracking-tighter">CLOUD-ACTIVE</p>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => { stopCamera(); setShowModal(false); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest">Discard Changes</button>
                  <button type="submit" disabled={isSyncing} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                    Sync Faculty Terminal
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 max-sm w-full shadow-2xl text-center border border-rose-100 dark:border-rose-900/50 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-inner border border-rose-100">
                 <Trash2 size={48} strokeWidth={2.5} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Deactivate Faculty?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium text-xs leading-relaxed uppercase tracking-widest">This professional record will be permanently purged from the cloud terminal.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeleteId(null)} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-3xl uppercase text-[10px] tracking-widest">Keep</button>
                 <button onClick={async () => { await db.teachers.delete(deleteId); setDeleteId(null); fetchCloudData(); }} className="py-5 bg-rose-600 text-white font-black rounded-3xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Confirm Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeachersManager;
