
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Teacher } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { 
  Plus, Search, Trash2, Edit2, X, UserPlus, User as UserIcon, Camera, Upload, 
  CheckCircle2, ShieldCheck, Loader2, RefreshCw, RotateCcw,
  Smartphone, Phone, Mail, MapPin, 
  UserCheck, Calendar, Info, StopCircle,
  Printer, ShieldAlert, Key, Eye, EyeOff, Activity, AlertTriangle,
  Building2, Fingerprint, Lock, Zap, Cpu, Shield, GraduationCap, Layers, BookOpen, ClipboardList, Clock,
  Check, CreditCard, ChevronDown, CalendarCheck, PencilRuler, FileSpreadsheet, Images, Bell, MessageSquareQuote
} from 'lucide-react';

interface TeachersManagerProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];

const SUBJECTS_LIST = ['MATHEMATICS', 'SCIENCE', 'ENGLISH', 'HISTORY', 'GEOGRAPHY', 'HINDI', 'GUJRATI', 'ARABIC', 'ISLAMIC STUDIES', 'PHYSICAL ED'];

const permissionMatrix = [
  { key: 'attendance', label: 'Attendance Management', icon: <CalendarCheck size={16} /> },
  { key: 'homework', label: 'Homework Assignment', icon: <PencilRuler size={16} /> },
  { key: 'marks', label: 'Marks Entry', icon: <FileSpreadsheet size={16} /> },
  { key: 'curriculum', label: 'Curriculum Access', icon: <BookOpen size={16} /> },
  { key: 'gallery', label: 'Gallery Management', icon: <Images size={16} /> },
  { key: 'notices', label: 'Notice Board', icon: <Bell size={16} /> },
  { key: 'sms', label: 'SMS Panel', icon: <MessageSquareQuote size={16} /> },
];

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
  
  const [activeTab, setActiveTab] = useState<'profile' | 'academic' | 'finance' | 'security'>('profile');

  // Camera & File States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialFormData: Partial<Teacher> = {
    fullName: '', email: '', staffId: '', mobile: '', alternateMobile: '', profileImage: '',
    qualification: '', subjects: [], classes: [], permissions: [], status: 'ACTIVE', gender: 'Male',
    joiningDate: new Date().toISOString().split('T')[0],
    dob: '', residenceAddress: '', assignedRole: 'SUBJECT_TEACHER',
    assignedClass: '1 - GIRLS', assignedSection: 'A',
    aadharNo: '', panNo: '',
    accountNo: '', accountType: 'SAVINGS', bankName: '', ifscCode: '',
    username: '', password: ''
  };

  const [formData, setFormData] = useState<Partial<Teacher>>(initialFormData);

  const fetchCloudData = async () => {
    try {
      const data = await db.teachers.getAll();
      const mapped = data.map((t: any) => ({
        id: t.id,
        fullName: t.name,
        staffId: t.staff_id,
        mobile: t.mobile,
        alternate_mobile: t.alternate_mobile,
        email: t.email,
        qualification: t.qualification,
        residence_address: t.residence_address,
        gender: t.gender,
        status: t.status,
        profileImage: t.profile_image,
        joiningDate: t.joining_date,
        dob: t.dob,
        subjects: t.subject ? t.subject.split(', ') : [],
        classes: t.classes_list ? t.classes_list.split(', ') : [],
        permissions: t.permissions ? t.permissions.split(', ') : [],
        assignedRole: t.assigned_role || 'SUBJECT_TEACHER',
        assignedClass: t.assigned_class,
        assignedSection: t.assigned_section,
        aadharNo: t.aadhar_no,
        panNo: t.pan_no,
        accountNo: t.account_no,
        accountType: t.account_type,
        bankName: t.bank_name,
        ifscCode: t.ifsc_code,
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
    const channel = supabase.channel('teachers-master-sync-v31')
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
        videoRef.current.play();
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

  const toggleSubject = (sub: string) => {
    const current = formData.subjects || [];
    setFormData(prev => ({
      ...prev,
      subjects: current.includes(sub) ? current.filter(s => s !== sub) : [...current, sub]
    }));
  };

  const toggleAssignedClass = (cls: string) => {
    const current = formData.classes || [];
    setFormData(prev => ({
      ...prev,
      classes: current.includes(cls) ? current.filter(c => c !== cls) : [...current, cls]
    }));
  };

  const togglePermission = (permKey: string) => {
    if (user.role !== 'ADMIN') return;
    const current = formData.permissions || [];
    setFormData(prev => ({
      ...prev,
      permissions: current.includes(permKey) ? current.filter(p => p !== permKey) : [...current, permKey]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.staffId) {
      alert("Name and Staff ID are essential.");
      return;
    }
    
    // MANDATORY AUTH HUB CHECK
    if (!formData.username || !formData.password) {
      alert("CRITICAL: Teacher Username and Master Key are required for account login. Please set them in the AUTH HUB tab.");
      setActiveTab('security');
      return;
    }

    setIsSyncing(true);
    try {
      await db.teachers.upsert({ ...formData, id: editingTeacher?.id });
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      createAuditLog(user, editingTeacher ? 'UPDATE' : 'CREATE', 'Faculty', `Cloud Synced Teacher: ${formData.fullName} (Auth Active)`);
      setEditingTeacher(null);
      setFormData(initialFormData);
      fetchCloudData();
    } catch (err: any) { alert(`Sync Error: ${err.message}`); }
    finally { setIsSyncing(false); }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const query = searchQuery.toLowerCase();
      return (t.fullName || '').toLowerCase().includes(query) || (t.staffId || '').toLowerCase().includes(query);
    });
  }, [teachers, searchQuery]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce no-print">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Registry Resyncing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest leading-none mb-1">Success</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Faculty record synchronized</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3 uppercase">Faculty Directory <UserCheck className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 leading-relaxed">Centralized management of teachers, roles, and institutional assignments.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => window.print()} className="px-6 py-4 bg-slate-900 dark:bg-slate-800 text-white font-black rounded-2xl shadow-xl hover:bg-slate-700 transition-all flex items-center gap-3 uppercase text-[10px] tracking-widest">
            <Printer size={18} /> Print List
          </button>
          <button onClick={() => { setEditingTeacher(null); setFormData(initialFormData); setActiveTab('profile'); setShowModal(true); stopCamera(); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest">
            <UserPlus size={20} strokeWidth={3} /> New Registration
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center no-print">
          <div className="relative group w-full max-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder="Search Identity (Name/ID)..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner dark:text-white uppercase text-xs" 
              />
          </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center text-slate-400 animate-pulse">
            <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
            <p className="font-black text-xs uppercase tracking-widest text-slate-400">Pinging Faculty Cloud...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-10 py-6 text-left">Faculty Profile</th>
                  <th className="px-8 py-6 text-left">Academic Assignment</th>
                  <th className="px-8 py-6 text-left">Assigned Subjects</th>
                  <th className="px-8 py-6 text-center">Status</th>
                  <th className="px-8 py-6 text-right no-print">Registry Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 ${teacher.status === 'BLOCKED' ? 'bg-slate-200' : 'bg-indigo-600'} rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg overflow-hidden group-hover:rotate-6 transition-transform relative`}>
                          {teacher.profileImage ? <img src={teacher.profileImage} className="w-full h-full object-cover" /> : (teacher.fullName || '').charAt(0)}
                          {teacher.status === 'BLOCKED' && <div className="absolute inset-0 bg-rose-600/20 backdrop-blur-[1px] flex items-center justify-center"><ShieldAlert size={18} /></div>}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-white text-base uppercase leading-tight">{teacher.fullName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{teacher.staffId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase flex items-center gap-2">
                             {teacher.assignedRole === 'CLASS_TEACHER' ? <UserCheck size={14} className="text-emerald-500" /> : <BookOpen size={14} className="text-indigo-500" />}
                             {teacher.assignedRole?.replace('_', ' ')}
                          </p>
                          {teacher.assignedRole === 'CLASS_TEACHER' && (
                             <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800 w-fit">
                                Std {teacher.assignedClass}-{teacher.assignedSection}
                             </p>
                          )}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-1.5">
                        {teacher.subjects.length > 0 ? teacher.subjects.map(s => (
                           <span key={s} className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[8px] font-black uppercase border border-slate-200 dark:border-slate-700">{s}</span>
                        )) : <span className="text-[8px] font-bold text-slate-300 italic uppercase tracking-widest">No subjects assigned</span>}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border-2 ${
                         teacher.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                         teacher.status === 'BLOCKED' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                         'bg-slate-50 text-slate-400 border-slate-100'
                       }`}>
                         {teacher.status}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-right no-print">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingTeacher(teacher); setFormData(teacher); setActiveTab('profile'); setShowModal(true); stopCamera(); }} className="p-3 bg-white dark:bg-slate-900 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Edit2 size={18} /></button>
                        <button onClick={() => setDeleteId(teacher.id)} className="p-3 bg-white dark:bg-slate-900 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-900 hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-1 shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 gap-6">
               <div className="flex items-center gap-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">{editingTeacher ? 'Modify Terminal' : 'Register Faculty'}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Institutional Identity Portal</p>
                  </div>
                  <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block" />
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-0.5 overflow-x-auto custom-scrollbar">
                     {(['profile', 'academic', 'finance', 'security'] as any).map((t: string) => (
                       <button key={t} onClick={() => setActiveTab(t as any)} className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{t === 'security' ? 'AUTH HUB' : t}</button>
                     ))}
                  </div>
               </div>
               <button onClick={() => { stopCamera(); setShowModal(false); }} className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-all shadow-sm"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10 bg-white dark:bg-slate-900">
               {activeTab === 'profile' && (
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-2">
                    <div className="lg:col-span-4">
                       <div className="flex flex-col items-center gap-5 sticky top-0">
                          <div className="w-48 h-48 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center relative group">
                             {isCameraActive ? (
                               <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                             ) : (
                               formData.profileImage ? <img src={formData.profileImage} className="w-full h-full object-cover" alt="Profile" /> : <UserIcon size={64} className="text-slate-200" />
                             )}
                             <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                {!isCameraActive ? (
                                  <>
                                    <button type="button" onClick={startCamera} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform"><Camera size={18}/></button>
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-white text-indigo-600 rounded-xl shadow-lg hover:scale-110 transition-transform"><Upload size={18}/></button>
                                  </>
                                ) : (
                                  <>
                                    <button type="button" onClick={capturePhoto} className="p-3 bg-emerald-600 text-white rounded-2xl animate-pulse"><Check size={20}/></button>
                                    <button type="button" onClick={stopCamera} className="p-3 bg-rose-600 text-white rounded-2xl"><X size={20}/></button>
                                  </>
                                )}
                             </div>
                          </div>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                          <canvas ref={canvasRef} className="hidden" />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center leading-relaxed">Official Portrait</p>
                       </div>
                    </div>

                    <div className="lg:col-span-8 space-y-10">
                       <div className="space-y-6">
                          <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/30 pb-3">Personal Registry</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Teacher Name</label>
                                <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl px-5 py-3.5 font-black text-slate-800 dark:text-white outline-none uppercase shadow-inner text-sm" placeholder="E.G. PROF. ROBERT MILLER" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Qualification</label>
                                <input type="text" value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl px-5 py-3.5 font-bold text-slate-800 dark:text-white outline-none uppercase shadow-inner text-sm" placeholder="E.G. PHD IN MATHEMATICS" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Date of Birth</label>
                                <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl px-5 py-3.5 font-bold text-slate-800 dark:text-white outline-none shadow-inner text-sm" />
                             </div>
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                                <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl px-5 py-3.5 font-black text-slate-800 dark:text-white outline-none shadow-inner cursor-pointer text-sm">
                                   <option value="Male">Male</option>
                                   <option value="Female">Female</option>
                                </select>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/30 pb-3">Contact & ID</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Phone</label>
                                <div className="relative">
                                   <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                                   <input type="tel" maxLength={10} value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value.replace(/[^0-9]/g, '')})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl pl-12 pr-4 py-3.5 font-black text-slate-800 dark:text-white outline-none tracking-[0.2em] shadow-inner text-sm" />
                                </div>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
                                <div className="relative">
                                   <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={16} />
                                   <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl pl-12 pr-4 py-3.5 font-bold text-slate-800 dark:text-white outline-none shadow-inner text-sm" />
                                </div>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Aadhar Number</label>
                                <div className="relative">
                                   <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={16} />
                                   <input type="text" maxLength={12} value={formData.aadharNo} onChange={e => setFormData({...formData, aadharNo: e.target.value.replace(/[^0-9]/g, '')})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl pl-12 pr-4 py-3.5 font-black text-slate-800 dark:text-white outline-none tracking-[0.15em] shadow-inner text-sm" placeholder="XXXX XXXX XXXX" />
                                </div>
                             </div>
                             <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">PAN Card Number</label>
                                <div className="relative">
                                   <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={16} />
                                   <input type="text" maxLength={10} value={formData.panNo} onChange={e => setFormData({...formData, panNo: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl pl-12 pr-4 py-3.5 font-black text-slate-800 dark:text-white outline-none tracking-[0.2em] shadow-inner text-sm" placeholder="ABCDE1234F" />
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'academic' && (
                 <div className="space-y-10 animate-in slide-in-from-right-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                       <div className="lg:col-span-4 space-y-6">
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                             <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-2"><GraduationCap size={16}/> Professional Role</h4>
                             
                             <div className="space-y-6">
                                <div className="space-y-2">
                                   <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Staff ID Code</label>
                                   <input type="text" required value={formData.staffId} onChange={e => setFormData({...formData, staffId: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-black text-slate-800 dark:text-white outline-none uppercase shadow-sm text-sm" placeholder="T-2026-001" />
                                </div>

                                <div className="space-y-2">
                                   <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Institutional Rank</label>
                                   <select value={formData.assignedRole} onChange={e => setFormData({...formData, assignedRole: e.target.value as any})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-black text-slate-800 dark:text-white outline-none cursor-pointer uppercase text-sm">
                                      <option value="SUBJECT_TEACHER">Subject Teacher</option>
                                      <option value="CLASS_TEACHER">Class Teacher</option>
                                   </select>
                                </div>

                                {formData.assignedRole === 'CLASS_TEACHER' && (
                                   <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                                      <div className="space-y-1">
                                         <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Grade</label>
                                         <select value={formData.assignedClass} onChange={e => setFormData({...formData, assignedClass: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold uppercase text-xs">
                                            {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                         </select>
                                      </div>
                                      <div className="space-y-1">
                                         <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Sec</label>
                                         <select value={formData.assignedSection} onChange={e => setFormData({...formData, assignedSection: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold uppercase text-xs">
                                            <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                                         </select>
                                      </div>
                                   </div>
                                )}
                             </div>
                          </div>
                       </div>

                       <div className="lg:col-span-8 space-y-8">
                          {/* ACCESS RIGHTS GRID - ONLY ADMIN CAN MODIFY */}
                          <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden group border border-white/5">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16"></div>
                             <div className="flex items-center justify-between mb-6">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-3"><Lock size={16}/> Access Rights Control</h4>
                                {user.role === 'ADMIN' ? (
                                   <span className="text-[8px] font-black px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 uppercase">Admin Console</span>
                                ) : (
                                   <span className="text-[8px] font-black px-2 py-1 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20 uppercase">View Only</span>
                                )}
                             </div>
                             
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {permissionMatrix.map(pm => {
                                   const isGranted = formData.permissions?.includes(pm.key);
                                   return (
                                      <button 
                                       key={pm.key} 
                                       type="button"
                                       disabled={user.role !== 'ADMIN'}
                                       onClick={() => togglePermission(pm.key)}
                                       className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${isGranted ? 'bg-indigo-600/20 border-indigo-500/50 text-white' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'} ${user.role !== 'ADMIN' ? 'cursor-default' : ''}`}
                                      >
                                         <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isGranted ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-600'}`}>
                                               {pm.icon}
                                            </div>
                                            <div className="min-w-0">
                                               <p className="text-[9px] font-black uppercase tracking-widest truncate">{pm.label}</p>
                                            </div>
                                         </div>
                                         <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${isGranted ? 'bg-emerald-50 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'border-white/10 bg-black/20'}`}>
                                            {isGranted && <Check size={10} strokeWidth={4} className="text-white" />}
                                         </div>
                                      </button>
                                   );
                                })}
                             </div>
                          </div>

                          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                             <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-5 flex items-center gap-2"><Layers size={16}/> Teaching Classes</h4>
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                {ALL_CLASSES.map(cls => {
                                  const isActive = formData.classes?.includes(cls);
                                  return (
                                    <button key={cls} type="button" onClick={() => toggleAssignedClass(cls)} className={`px-2 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400 hover:border-slate-200'}`}>
                                       {cls}
                                    </button>
                                  );
                                })}
                             </div>
                          </div>

                          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                             <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-5 flex items-center gap-2"><BookOpen size={16}/> Teaching Subjects</h4>
                             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {SUBJECTS_LIST.map(sub => {
                                  const isActive = formData.subjects?.includes(sub);
                                  return (
                                    <button key={sub} type="button" onClick={() => toggleSubject(sub)} className={`px-2 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400 hover:border-slate-200'}`}>
                                       {sub}
                                    </button>
                                  );
                                })}
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'finance' && (
                 <div className="space-y-8 animate-in slide-in-from-right-4">
                    <div className="bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800 flex items-start gap-5">
                       <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shrink-0"><Building2 size={24}/></div>
                       <div>
                          <h4 className="text-lg font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-tight leading-none mb-1">Financial Registry</h4>
                          <p className="text-[9px] font-bold text-indigo-700/60 dark:text-indigo-400/60 uppercase">Institutional payroll processing nodes.</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Bank Name</label>
                          <input type="text" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl px-5 py-3.5 font-black uppercase text-sm outline-none shadow-inner" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Bank Account Number</label>
                          <input type="text" value={formData.accountNo} onChange={e => setFormData({...formData, accountNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl px-5 py-3.5 font-black text-sm outline-none shadow-inner tracking-widest" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase ml-1">IFSC Code</label>
                          <input type="text" value={formData.ifscCode} onChange={e => setFormData({...formData, ifscCode: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl px-5 py-3.5 font-black text-sm outline-none shadow-inner uppercase" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Account Type</label>
                          <select value={formData.accountType} onChange={e => setFormData({...formData, accountType: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 rounded-xl px-5 py-3.5 font-black text-sm outline-none shadow-inner cursor-pointer">
                             <option value="SAVINGS">SAVINGS</option>
                             <option value="CURRENT">CURRENT</option>
                          </select>
                       </div>
                    </div>
                 </div>
               )}

               {activeTab === 'security' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-right-4">
                    <div className="bg-slate-950 rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
                       <div className="relative z-10 flex items-center gap-4 mb-8">
                          <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/30">
                             <Lock size={24} />
                          </div>
                          <h4 className="text-xl font-black text-white uppercase tracking-tighter">Auth Hub</h4>
                       </div>

                       <div className="space-y-6 relative z-10">
                          <div className="space-y-1">
                             <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Teacher Username</label>
                             <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-black text-white outline-none focus:border-indigo-500 transition-all text-sm" placeholder="T.USERNAME" />
                          </div>
                          <div className="space-y-1">
                             <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Master Key</label>
                             <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 font-black text-white outline-none focus:border-indigo-500 transition-all text-sm" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                                   {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                             </div>
                          </div>
                          <button type="button" onClick={() => setFormData({...formData, password: 'tea' + Math.floor(1000+Math.random()*9000)})} className="w-full py-3 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-indigo-400 hover:bg-white/10 transition-all">Regenerate Master Key</button>
                       </div>
                    </div>

                    <div className="bg-slate-950 rounded-[2.5rem] p-8 border border-white/5 flex flex-col items-center justify-center text-center space-y-6">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Access Grid State</p>
                       <div className={`px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest border ${formData.status === 'ACTIVE' ? 'text-emerald-400 border-emerald-400/50 bg-emerald-400/5' : 'text-rose-500 border-rose-500/50 bg-rose-500/5'}`}>
                          {formData.status}
                       </div>
                       <button 
                        type="button" 
                        onClick={() => setFormData({...formData, status: formData.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'})}
                        className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 ${formData.status === 'ACTIVE' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}
                       >
                          {formData.status === 'ACTIVE' ? <ShieldAlert size={16}/> : <ShieldCheck size={16}/>}
                          {formData.status === 'ACTIVE' ? 'Block Access' : 'Restore Node'}
                       </button>
                    </div>
                 </div>
               )}

               <div className="flex gap-3 pt-8 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                  <button type="button" onClick={() => { stopCamera(); setShowModal(false); }} className="flex-1 py-3.5 bg-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl uppercase text-[9px] tracking-widest shadow-sm">Discard</button>
                  <button type="submit" disabled={isSyncing} className="flex-[2] py-3.5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[9px] tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                    Finalize Identity Sync
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-xs w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-tight">Deactivate?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] leading-relaxed uppercase tracking-widest">This record will be permanently purged.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteId(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={async () => { await db.teachers.delete(deleteId); setDeleteId(null); fetchCloudData(); }} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TeachersManager;
