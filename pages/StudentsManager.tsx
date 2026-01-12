
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Student } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { 
  Plus, Search, Trash2, Edit2, X, UserPlus, User as UserIcon, Camera, Upload, MapPin, 
  CheckCircle2, ShieldCheck, Smartphone, Loader2, Calendar, Mail, FileText, SwitchCamera, StopCircle
} from 'lucide-react';

interface StudentsManagerProps { user: User; }
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
  
  // Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Student>>({
    fullName: '', email: '', grNumber: '', residenceAddress: '', fatherName: '', motherName: '', 
    fatherMobile: '', class: '1st', section: 'A', rollNo: '', profileImage: ''
  });

  const fetchCloudData = async () => {
    try {
      const data = await db.students.getAll();
      const mapped = data.map((s: any) => ({
        id: s.id, fullName: s.full_name, name: s.full_name, email: s.email, rollNo: s.roll_no,
        class: s.class, section: s.section, grNumber: s.gr_number, profileImage: s.profile_image,
        fatherName: s.father_name, motherName: s.mother_name, fatherMobile: s.father_mobile,
        residenceAddress: s.residence_address
      }));
      setStudents(mapped);
    } catch (err) { console.error("Cloud Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-students')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchCloudData())
      .subscribe();
    return () => { 
      stopCamera();
      supabase.removeChannel(channel); 
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      alert("Camera Access Denied: Please check browser permissions.");
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
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, profileImage: dataUrl }));
        stopCamera();
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await db.students.upsert({ ...formData, id: editingStudent?.id || '' });
      setShowModal(false);
      stopCamera();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      createAuditLog(user, editingStudent ? 'UPDATE' : 'CREATE', 'Registry', `Cloud Sync: ${formData.fullName}`);
    } catch (err) { alert("Failed to save to cloud."); }
    finally { setIsLoading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await db.students.delete(deleteId);
      setDeleteId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
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
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Sync Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Cloud Ledger Updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase flex items-center gap-3">
             Student Cloud Registry <ShieldCheck className="text-indigo-600" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Managing global database across all devices.</p>
        </div>
        <button onClick={() => { setEditingStudent(null); setFormData({fullName: '', email: '', grNumber: '', class: '1st', section: 'A', rollNo: '', profileImage: ''}); setShowModal(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest"><UserPlus size={20} /> Enroll to Cloud</button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center text-slate-400 animate-pulse">
            <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
            <p className="font-black text-xs uppercase tracking-[0.3em]">Connecting to Registry Cloud...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
             <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative group w-full max-w-md">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input type="text" placeholder="Search global database..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" />
                </div>
                <div className="flex gap-2">
                   {ALL_CLASSES.slice(0, 4).map(c => (
                     <button key={c} onClick={() => setSelectedClass(c)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedClass === c ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Std {c}</button>
                   ))}
                   <button onClick={() => setSelectedClass('All')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedClass === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>All</button>
                </div>
             </div>
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                  <th className="px-10 py-6 text-left">Student Profile</th>
                  <th className="px-8 py-6 text-left">Cloud ID (GR)</th>
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
                          {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" alt="S" /> : (student.fullName || '').charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-200 text-base uppercase">{student.fullName}</p>
                          <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{student.email || 'No Email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-600 dark:text-slate-400 text-xs uppercase">{student.grNumber}</td>
                    <td className="px-8 py-6">
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase inline-block border border-indigo-100 dark:border-indigo-800">Std {student.class}-{student.section}</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingStudent(student); setFormData(student); setShowModal(true); }} className="p-3 bg-white dark:bg-slate-800 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white transition-all"><Edit2 size={18} /></button>
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

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
               <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cloud Enrollment Form</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2"><Smartphone size={12}/> Unified Data Access Protocol</p>
               </div>
               <button onClick={() => { setShowModal(false); stopCamera(); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
               <div className="flex flex-col md:flex-row gap-10">
                  <div className="flex flex-col items-center gap-5 shrink-0">
                     <div className="w-48 h-48 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center relative group">
                        {isCameraActive ? (
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                        ) : (
                          formData.profileImage ? <img src={formData.profileImage} className="w-full h-full object-cover" /> : <UserIcon size={64} className="text-slate-200" />
                        )}
                        
                        {/* Overlay Controls */}
                        {!isCameraActive && (
                          <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                             <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 font-bold uppercase text-[9px] tracking-widest bg-white/20 px-4 py-2 rounded-full hover:bg-white/40"><Upload size={16}/> File</button>
                             <button type="button" onClick={startCamera} className="flex items-center gap-2 font-bold uppercase text-[9px] tracking-widest bg-indigo-600 px-4 py-2 rounded-full hover:bg-indigo-500"><Camera size={16}/> Camera</button>
                          </div>
                        )}
                     </div>
                     <canvas ref={canvasRef} className="hidden" />
                     
                     <div className="flex flex-col gap-2 w-full">
                        {isCameraActive ? (
                          <>
                            <button type="button" onClick={capturePhoto} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg flex items-center justify-center gap-2"><Camera size={18}/> Snap Snapshot</button>
                            <button type="button" onClick={stopCamera} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2"><StopCircle size={18}/> Exit Camera</button>
                          </>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                             <button type="button" onClick={startCamera} className="py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-2"><Camera size={14}/> Take Photo</button>
                             <button type="button" onClick={() => fileInputRef.current?.click()} className="py-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-2"><Upload size={14}/> Upload</button>
                          </div>
                        )}
                     </div>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Legal Name</label>
                        <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none transition-all shadow-inner" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">GR Registry Number</label>
                        <input type="text" required value={formData.grNumber} onChange={e => setFormData({...formData, grNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none transition-all shadow-inner" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Academic Grade</label>
                        <select value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none">
                           {ALL_CLASSES.map(c => <option key={c} value={c}>{c} Std</option>)}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Institutional Roll</label>
                        <input type="text" value={formData.rollNo} onChange={e => setFormData({...formData, rollNo: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none transition-all shadow-inner" />
                     </div>
                     <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Residential Address</label>
                        <textarea rows={2} value={formData.residenceAddress} onChange={e => setFormData({...formData, residenceAddress: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-2xl px-5 py-4 font-bold text-slate-800 dark:text-white outline-none transition-all shadow-inner resize-none" />
                     </div>
                  </div>
               </div>
               <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => { setShowModal(false); stopCamera(); }} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-3xl uppercase text-[10px] tracking-widest">Discard</button>
                  <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-[0.2em]">Finalize & Sync to Cloud</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 max-sm w-full shadow-2xl text-center border border-rose-100 dark:border-rose-900/50 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-inner border border-rose-100">
                 <Trash2 size={48} strokeWidth={2.5} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Purge Student?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium text-xs leading-relaxed uppercase tracking-widest">This identity and all associated financial/academic records will be erased from the global cloud.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeleteId(null)} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-3xl uppercase text-[10px] tracking-widest">Keep Record</button>
                 <button onClick={confirmDelete} className="py-5 bg-rose-600 text-white font-black rounded-3xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Delete Identity</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManager;
