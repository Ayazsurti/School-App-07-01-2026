
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Student } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { 
  Plus, Search, Trash2, Edit2, X, UserPlus, User as UserIcon, Camera, Upload, 
  CheckCircle2, ShieldCheck, Smartphone, Loader2, QrCode, StopCircle, GraduationCap, RefreshCw,
  Phone, Mail, MapPin, UserCheck, Trash
} from 'lucide-react';

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialFormData: Partial<Student> = {
    fullName: '', email: '', grNumber: '', class: '1st', section: 'A', rollNo: '', profileImage: '',
    gender: 'Male', dob: '', admissionDate: '', aadharNo: '', uidId: '', penNo: '',
    fatherName: '', motherName: '', fatherMobile: '', motherMobile: '', residenceAddress: '',
    username: '', password: ''
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
        admissionDate: s.admission_date,
        aadharNo: s.aadhar_no,
        uidId: s.uid_id,
        penNo: s.pen_no,
        username: s.username,
        password: s.password
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
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.grNumber) {
      alert("Please enter Full Name and GR Number.");
      return;
    }
    setIsSyncing(true);
    try {
      const studentToSync = { ...formData, id: editingStudent ? editingStudent.id : undefined };
      
      // Auto-generate credentials if they are missing
      if (!studentToSync.username) studentToSync.username = (formData.grNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!studentToSync.password) studentToSync.password = '123456';

      await db.students.upsert(studentToSync);
      
      // Sync Login Profile automatically to profiles table
      await supabase.from('profiles').upsert([{
        username: studentToSync.username,
        password: studentToSync.password,
        role: 'STUDENT',
        full_name: studentToSync.fullName
      }], { onConflict: 'username' });

      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      createAuditLog(user, editingStudent ? 'UPDATE' : 'CREATE', 'Registry', `Enrollment Sync: ${formData.fullName} (GR: ${formData.grNumber})`);
      setEditingStudent(null);
      setFormData(initialFormData);
      fetchCloudData();
    } catch (err: any) { 
      alert(`Sync Error: ${err.message}`); 
    } finally { 
      setIsSyncing(false); 
    }
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
      reader.onload = (ev) => setFormData(prev => ({ ...prev, profileImage: ev.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cloud Database Syncing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Registry Updated</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Profile & Account Active</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">
             Student Management <ShieldCheck className="text-indigo-600" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional Cloud Registry & Control</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { 
            setEditingStudent(null); 
            setFormData(initialFormData); 
            setShowModal(true); 
          }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><UserPlus size={20} /> Enroll New Student</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center">
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

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center text-slate-400 animate-pulse">
            <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
            <p className="font-black text-xs uppercase tracking-widest">Connecting to Education Cloud...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-10 py-6 text-left">Identity Profile</th>
                  <th className="px-8 py-6 text-left">Registry IDs</th>
                  <th className="px-8 py-6 text-left">Grade / Roll</th>
                  <th className="px-8 py-6 text-left">Parents / Mobile</th>
                  <th className="px-8 py-6 text-left">Sync Token</th>
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
                          <p className="font-black text-slate-800 dark:text-slate-200 text-base uppercase leading-tight">{student.fullName}</p>
                          <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-1">{student.gender} • DOB: {student.dob || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">GR: {student.grNumber}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Aadhar: {student.aadharNo || 'Pending'}</p>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-block bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase border border-indigo-100 dark:border-indigo-800">Std {student.class}-{student.section} • Roll {student.rollNo}</div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{student.fatherName}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Smartphone size={10}/> {student.fatherMobile}</p>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cloud Active</p>
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Institutional Enrollment Portal</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Cloud Registry • Login will be auto-generated</p>
               </div>
               <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={28} /></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12 bg-white dark:bg-slate-900">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  
                  {/* Photo Section Only (Login Control Removed) */}
                  <div className="lg:col-span-3">
                     <div className="flex flex-col items-center gap-5 sticky top-0">
                        <div className="w-56 h-56 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center relative group">
                           {formData.profileImage ? <img src={formData.profileImage} className="w-full h-full object-cover" alt="Profile" /> : <UserIcon size={80} className="text-slate-200" />}
                           <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 font-bold uppercase text-[9px] tracking-widest bg-white/20 px-4 py-2 rounded-full hover:bg-white/40"><Upload size={16}/> Change Photo</button>
                           </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Identity Photograph</h4>
                        
                        <div className="mt-8 p-6 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800 w-full">
                           <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 text-center">Auto-Auth System</p>
                           <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed text-center uppercase">Student credentials will be automatically generated using the GR Number as the primary ID.</p>
                        </div>
                     </div>
                  </div>

                  {/* Main Fields Grid */}
                  <div className="lg:col-span-9 space-y-12">
                     <div className="space-y-8">
                        <div className="flex items-center gap-3 border-l-4 border-indigo-500 pl-4 py-1">
                           <GraduationCap className="text-indigo-600" size={24} />
                           <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Academic Records</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1 md:col-span-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">FULL NAME</label>
                              <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 uppercase" placeholder="JOHN DOE" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">GR NO.</label>
                              <input type="text" required value={formData.grNumber} onChange={e => setFormData({...formData, grNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black text-slate-800 dark:text-white outline-none" placeholder="GR-1001" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ROLL NO</label>
                              <input type="text" value={formData.rollNo} onChange={e => setFormData({...formData, rollNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black text-slate-800 dark:text-white outline-none" placeholder="101" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">GENDER</label>
                              <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black text-slate-800 dark:text-white outline-none">
                                 <option value="Male">Male</option>
                                 <option value="Female">Female</option>
                                 <option value="Other">Other</option>
                              </select>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">ADMISSION DATE</label>
                              <input type="date" value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black text-slate-800 dark:text-white outline-none" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CLASS</label>
                              <select value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black text-slate-800 dark:text-white outline-none">
                                 {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                              </select>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">SECTION</label>
                              <select value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black text-slate-800 dark:text-white outline-none">
                                 <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                              </select>
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">DATE OF BIRTH</label>
                              <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black text-slate-800 dark:text-white outline-none" />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-8">
                        <div className="flex items-center gap-3 border-l-4 border-amber-500 pl-4 py-1">
                           <Smartphone className="text-amber-600" size={24} />
                           <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Identity Details</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">UID_ID</label>
                              <input type="text" value={formData.uidId} onChange={e => setFormData({...formData, uidId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black" placeholder="Unique ID" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">PEN NO.</label>
                              <input type="text" value={formData.penNo} onChange={e => setFormData({...formData, penNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black" placeholder="Permanent Education No" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">AADHAR CARD NO.</label>
                              <input type="text" value={formData.aadharNo} onChange={e => setFormData({...formData, aadharNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black" placeholder="XXXX-XXXX-XXXX" />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-8">
                        <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-4 py-1">
                           <UserCheck className="text-emerald-600" size={24} />
                           <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Parental & Residence Registry</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                           <div className="space-y-4">
                              <div className="space-y-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">MOTHER NAME</label>
                                 <input type="text" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black" placeholder="Full Name" />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">MOTHER PHONE</label>
                                 <input type="tel" value={formData.motherMobile} onChange={e => setFormData({...formData, motherMobile: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black" placeholder="+91 XXXXX XXXXX" />
                              </div>
                           </div>
                           <div className="space-y-4">
                              <div className="space-y-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">FATHER NAME</label>
                                 <input type="text" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black" placeholder="Full Name" />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">FATHER NUMBER</label>
                                 <input type="tel" value={formData.fatherMobile} onChange={e => setFormData({...formData, fatherMobile: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black" placeholder="+91 XXXXX XXXXX" />
                              </div>
                           </div>
                           <div className="md:col-span-2 space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">RESIDENCE ADDRESS</label>
                              <textarea rows={3} value={formData.residenceAddress} onChange={e => setFormData({...formData, residenceAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-8 py-6 font-bold text-slate-800 dark:text-white outline-none resize-none shadow-inner" placeholder="Complete Street Address, City, Pincode" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex gap-4 pt-10 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-3xl uppercase text-[10px] tracking-widest">Discard Entry</button>
                  <button type="submit" disabled={isSyncing} className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                    {isSyncing ? 'Processing Transaction...' : 'Commit Profile to Education Cloud'}
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
              <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium text-xs leading-relaxed uppercase tracking-widest">Identity erase is permanent across all cloud connected terminals.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeleteId(null)} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-3xl uppercase text-[10px] tracking-widest">Cancel</button>
                 <button onClick={async () => {
                    await db.students.delete(deleteId);
                    setDeleteId(null);
                    fetchCloudData();
                 }} className="py-5 bg-rose-600 text-white font-black rounded-3xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Confirm Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManager;
