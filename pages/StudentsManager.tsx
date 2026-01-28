
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Student } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Plus, Search, Trash2, Edit2, X, UserPlus, User as UserIcon, Camera, Upload, 
  CheckCircle2, ShieldCheck, Smartphone, Loader2, RefreshCw,
  GraduationCap, ChevronDown, Heart, Shield,
  Filter, Grid3X3, RotateCcw, Database, MousePointer2, UserSearch,
  // Fix: Added missing icon imports to resolve build errors
  Fingerprint, CreditCard, AlertTriangle
} from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';

interface StudentsManagerProps { user: User; }

const SECTIONS_LIST = ['A', 'B', 'C', 'D'];

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];

const StudentsManager: React.FC<StudentsManagerProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Initial states set to empty to hide list by default
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Dropdown States
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  
  // Camera & File States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [captureTarget, setCaptureTarget] = useState<'profileImage' | 'fatherPhoto' | 'motherPhoto'>('profileImage');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const initialFormData: Partial<Student> = {
    fullName: '', firstName: '', middleName: '', lastName: '', email: '', grNumber: '', class: '1 - GIRLS', section: 'A', rollNo: '', profileImage: '',
    gender: 'Male', dob: '', admissionDate: new Date().toISOString().split('T')[0], aadharNo: '', panNo: '', uidId: '',
    studentType: '', birthPlace: '', medium: 'ENGLISH MEDIUM',
    fatherName: '', motherName: '', fatherMobile: '', motherMobile: '', residenceAddress: '',
    fatherPhoto: '', motherPhoto: '', password: 'student786', status: 'ACTIVE'
  };

  const [formData, setFormData] = useState<Partial<Student>>(initialFormData);

  const fetchCloudData = async () => {
    try {
      const data = await db.students.getAll();
      const mapped = (data || []).map((s: any) => {
        const nameParts = (s.full_name || '').trim().split(/\s+/);
        let fName = '', mName = '', lName = '';
        
        if (nameParts.length === 1) {
          fName = nameParts[0];
        } else if (nameParts.length === 2) {
          fName = nameParts[0];
          lName = nameParts[1];
        } else if (nameParts.length >= 3) {
          fName = nameParts[0];
          lName = nameParts[nameParts.length - 1];
          mName = nameParts.slice(1, -1).join(' ');
        }

        return {
          id: s.id, 
          fullName: s.full_name,
          firstName: fName,
          middleName: mName,
          lastName: lName,
          name: s.full_name, 
          email: s.email, 
          rollNo: s.roll_no,
          class: s.class, 
          section: s.section, 
          medium: s.medium,
          wing: s.wing,
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
          student_type: s.student_type,
          birthPlace: s.birth_place,
          fatherPhoto: s.father_photo,
          motherPhoto: s.mother_photo,
          password: s.password,
          status: s.status
        };
      });
      setStudents(mapped as Student[]);
    } catch (err: any) { 
      console.error("Student Cloud Fetch Error:", getErrorMessage(err)); 
    }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-students-v22')
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
      alert("Camera Access Denied.");
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
    const combinedFullName = [formData.firstName, formData.middleName, formData.lastName]
      .filter(Boolean)
      .join(' ')
      .trim()
      .toUpperCase();

    if (!combinedFullName || !formData.grNumber) {
      alert("Name (First/Last) and GR Number are mandatory.");
      return;
    }

    setIsSyncing(true);
    try {
      const studentToSync = { 
        ...formData, 
        fullName: combinedFullName,
        id: editingStudent ? editingStudent.id : undefined,
        grNumber: String(formData.grNumber).trim() 
      };
      
      await db.students.upsert(studentToSync);
      
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      createAuditLog(user, editingStudent ? 'UPDATE' : 'CREATE', 'Registry', `Cloud Sync: ${combinedFullName} (GR: ${formData.grNumber})`);
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
    // REQUIREMENT: Return empty if Class or Section is not selected
    if (!selectedClass || !selectedSection) {
      return [];
    }

    let list = students.filter(s => {
      if (s.status === 'CANCELLED') return false;
      const query = searchQuery.toLowerCase();
      const nameMatch = (s.fullName || '').toLowerCase().includes(query);
      const grMatch = (s.grNumber || '').toLowerCase().includes(query);
      
      const matchesClass = s.class === selectedClass;
      const matchesSection = s.section === selectedSection;
      
      return (nameMatch || grMatch) && matchesClass && matchesSection;
    });
    return list.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
  }, [students, searchQuery, selectedClass, selectedSection]);

  const isSelectionActive = selectedClass !== '' && selectedSection !== '';

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce no-print">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Syncing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Registry Updated</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Cloud Storage Synced</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 no-print px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase leading-none">Student Registry <ShieldCheck className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-3">Institutional Identity Management System</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { setEditingStudent(null); setFormData(initialFormData); setShowModal(true); stopCamera(); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:-translate-y-1 transition-all uppercase text-xs tracking-widest active:scale-95"><UserPlus size={20} strokeWidth={3} /> Register Student</button>
        </div>
      </div>

      {/* FILTER TERMINAL */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8 mx-4 sm:mx-0 no-print">
          {/* SEARCH BAR FULL WIDTH */}
          <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
              <input 
                type="text" 
                placeholder="Identity name or GR number..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-16 pr-6 py-6 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-100 dark:focus:border-indigo-900 rounded-[2.5rem] font-black outline-none shadow-inner dark:text-white uppercase text-base tracking-tight transition-all placeholder:text-slate-300" 
              />
          </div>

          <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-2 px-2 mb-6">
                 <Filter size={14} className="text-indigo-500" />
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Academic Standard Filters</label>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-6">
                 {/* CUSTOM CLASS DROPDOWN */}
                 <div className="flex-1 w-full space-y-2 relative">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><GraduationCap size={12}/> Standard Selection</label>
                    <button 
                      onClick={() => { setIsClassDropdownOpen(!isClassDropdownOpen); setIsSectionDropdownOpen(false); }}
                      className={`w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black flex items-center justify-between transition-all hover:border-indigo-200 outline-none ${selectedClass ? 'text-slate-800 dark:text-white border-indigo-100 dark:border-indigo-900' : 'text-slate-300 border-slate-100 dark:border-slate-700'}`}
                    >
                       <span className="uppercase text-xs">{selectedClass || 'Select Standard'}</span>
                       <ChevronDown className={`text-slate-400 transition-transform duration-300 ${isClassDropdownOpen ? 'rotate-180' : ''}`} size={20} />
                    </button>
                    
                    {isClassDropdownOpen && (
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl z-[100] py-4 max-h-[300px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2">
                         {ALL_CLASSES.map(c => (
                           <button 
                            key={c} 
                            onClick={() => { setSelectedClass(c); setIsClassDropdownOpen(false); }}
                            className={`w-full px-6 py-3.5 text-left text-xs font-black uppercase transition-all ${selectedClass === c ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                           >
                              {c}
                           </button>
                         ))}
                      </div>
                    )}
                 </div>

                 {/* CUSTOM SECTION DROPDOWN */}
                 <div className="flex-1 w-full space-y-2 relative">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><Grid3X3 size={12}/> Node Section</label>
                    <button 
                      onClick={() => { setIsSectionDropdownOpen(!isSectionDropdownOpen); setIsClassDropdownOpen(false); }}
                      className={`w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-6 py-4 font-black flex items-center justify-between transition-all hover:border-indigo-200 outline-none ${selectedSection ? 'text-slate-800 dark:text-white border-indigo-100 dark:border-indigo-900' : 'text-slate-300 border-slate-100 dark:border-slate-700'}`}
                    >
                       <span className="uppercase text-xs">{selectedSection ? `Section ${selectedSection}` : 'Select Section'}</span>
                       <ChevronDown className={`text-slate-400 transition-transform duration-300 ${isSectionDropdownOpen ? 'rotate-180' : ''}`} size={20} />
                    </button>

                    {isSectionDropdownOpen && (
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl z-[100] py-4 animate-in slide-in-from-top-2">
                         {SECTIONS_LIST.map(sec => (
                           <button 
                             key={sec} 
                             onClick={() => { setSelectedSection(sec); setIsSectionDropdownOpen(false); }}
                             className={`w-full px-6 py-3.5 text-left text-xs font-black uppercase transition-all ${selectedSection === sec ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                           >
                              Section {sec}
                           </button>
                         ))}
                      </div>
                    )}
                 </div>

                 <div className="shrink-0 flex items-center gap-3 pt-6 md:pt-0">
                    <button 
                      onClick={() => { setSelectedClass(''); setSelectedSection(''); setSearchQuery(''); setIsClassDropdownOpen(false); setIsSectionDropdownOpen(false); }}
                      className="p-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all shadow-sm"
                      title="Reset Selection"
                    >
                       <RotateCcw size={20} />
                    </button>
                    {isSelectionActive && (
                      <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl animate-in fade-in slide-in-from-right-2">
                         <p className="text-[8px] font-black text-indigo-400 uppercase">Nodes Found</p>
                         <p className="text-sm font-black text-indigo-600 dark:text-indigo-300 leading-none mt-1">{filteredStudents.length} Students</p>
                      </div>
                    )}
                 </div>
              </div>
          </div>
      </div>

      {/* CLICK OVERLAY TO CLOSE DROPDOWNS */}
      {(isClassDropdownOpen || isSectionDropdownOpen) && (
        <div className="fixed inset-0 z-[90]" onClick={() => { setIsClassDropdownOpen(false); setIsSectionDropdownOpen(false); }} />
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[500px] mx-4 sm:mx-0 no-print">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center justify-center text-slate-400 animate-pulse">
            <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
            <p className="font-black text-xs uppercase tracking-widest text-slate-400">Pinging Archive...</p>
          </div>
        ) : !isSelectionActive ? (
          /* PLACEHOLDER STATE - Shown when no selection is made */
          <div className="py-40 flex flex-col items-center justify-center text-slate-400 text-center animate-in fade-in">
             <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                <UserSearch size={48} className="text-slate-200 dark:text-slate-700" />
             </div>
             <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-3">Sync Node Required</h3>
             <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto text-sm leading-relaxed">Choose an academic <b>Standard</b> and <b>Section Node</b> from the terminal above to fetch student identities from the cloud.</p>
             <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 rounded-full">
                <MousePointer2 size={12} className="text-indigo-500" />
                <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Awaiting User Selection</span>
             </div>
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
                  <th className="px-8 py-6 text-left">Parental Data</th>
                  <th className="px-8 py-6 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
                    <td className="px-8 py-6 text-center">
                       <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black text-sm border border-indigo-100 dark:border-indigo-800 mx-auto">
                         {student.rollNo || '-'}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">{student.grNumber}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
                           {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" /> : <UserIcon size={20}/>}
                        </div>
                        <div>
                           <p className="font-black text-slate-800 dark:text-white text-base uppercase leading-tight">{student.fullName}</p>
                           <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">{student.gender} • {student.dob}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="inline-flex flex-col">
                         <span className="font-black text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-tighter">STD {student.class}</span>
                         <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Section {student.section}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase truncate max-w-[150px]">{student.fatherName}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Smartphone size={10}/> {student.fatherMobile}</p>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingStudent(student); setFormData(student); setShowModal(true); stopCamera(); }} className="p-3 bg-white dark:bg-slate-900 text-emerald-600 rounded-xl border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"><Edit2 size={18} /></button>
                        <button onClick={() => setDeleteId(student.id)} className="p-3 bg-white dark:bg-slate-900 text-rose-500 rounded-xl border border-rose-100 dark:border-rose-900 hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-20 text-center opacity-50">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No matching identities found in {selectedClass} Section {selectedSection}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in no-print">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
               <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingStudent ? 'Update Enrollment' : 'New Enrollment'}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Identity Terminal</p>
               </div>
               <button onClick={() => { stopCamera(); setShowModal(false); }} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={28} /></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-10 bg-white dark:bg-slate-900">
               <div className="flex flex-wrap items-center justify-center gap-10 py-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center relative group">
                       {isCameraActive && captureTarget === 'profileImage' ? (
                         <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                       ) : (
                         formData.profileImage ? <img src={formData.profileImage} className="w-full h-full object-cover" alt="Profile" /> : <UserIcon size={40} className="text-slate-200" />
                       )}
                       <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {!isCameraActive ? (
                            <>
                              <button type="button" onClick={() => startCamera('profileImage')} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-50 transition-all"><Camera size={14}/></button>
                              <button type="button" onClick={() => { setCaptureTarget('profileImage'); fileInputRef.current?.click(); }} className="p-2 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all"><Upload size={14}/></button>
                            </>
                          ) : (
                            captureTarget === 'profileImage' && <button type="button" onClick={capturePhoto} className="p-3 bg-emerald-600 text-white rounded-2xl animate-pulse"><Camera size={18}/></button>
                          )}
                       </div>
                    </div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Student Photo</p>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center relative group">
                       {isCameraActive && captureTarget === 'fatherPhoto' ? (
                         <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                       ) : (
                         formData.fatherPhoto ? <img src={formData.fatherPhoto} className="w-full h-full object-cover" alt="Father" /> : <UserIcon size={40} className="text-slate-200" />
                       )}
                       <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {!isCameraActive ? (
                            <>
                              <button type="button" onClick={() => startCamera('fatherPhoto')} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-50 transition-all"><Camera size={14}/></button>
                              <button type="button" onClick={() => { setCaptureTarget('fatherPhoto'); fileInputRef.current?.click(); }} className="p-2 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all"><Upload size={14}/></button>
                            </>
                          ) : (
                            captureTarget === 'fatherPhoto' && <button type="button" onClick={capturePhoto} className="p-3 bg-emerald-600 text-white rounded-2xl animate-pulse"><Camera size={18}/></button>
                          )}
                       </div>
                    </div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Father Photo</p>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center relative group">
                       {isCameraActive && captureTarget === 'motherPhoto' ? (
                         <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                       ) : (
                         formData.motherPhoto ? <img src={formData.motherPhoto} className="w-full h-full object-cover" alt="Mother" /> : <Heart size={40} className="text-slate-200" />
                       )}
                       <div className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {!isCameraActive ? (
                            <>
                              <button type="button" onClick={() => startCamera('motherPhoto')} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-50 transition-all"><Camera size={14}/></button>
                              <button type="button" onClick={() => { setCaptureTarget('motherPhoto'); fileInputRef.current?.click(); }} className="p-2 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all"><Upload size={14}/></button>
                            </>
                          ) : (
                            captureTarget === 'motherPhoto' && <button type="button" onClick={capturePhoto} className="p-3 bg-emerald-600 text-white rounded-2xl animate-pulse"><Camera size={18}/></button>
                          )}
                       </div>
                    </div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mother Photo</p>
                  </div>
                  
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, captureTarget)} />
                  <canvas ref={canvasRef} className="hidden" />
               </div>

               <div className="space-y-8">
                  <div className="space-y-6">
                     <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">Academic & Personal</h4>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Grade</label>
                           <select value={formData.class} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500">
                              {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Section</label>
                           <select value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500">
                              <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                           </select>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll No</label>
                           <input type="text" value={formData.rollNo} onChange={e => setFormData({...formData, rollNo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>

                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                           <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Middle Name</label>
                           <input type="text" value={formData.middleName} onChange={e => setFormData({...formData, middleName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                           <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>

                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GR Number</label>
                           <input type="text" required value={formData.grNumber} onChange={e => setFormData({...formData, grNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DATE OF ADMISSION</label>
                           <input type="date" value={formData.admissionDate} onChange={e => setFormData({...formData, admissionDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DOB</label>
                           <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                           <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500">
                             <option value="Male">Male</option><option value="Female">Female</option>
                           </select>
                        </div>
                        
                        {/* Identification Fields */}
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aadhar Number</label>
                           <div className="relative">
                              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                              <input type="text" maxLength={12} value={formData.aadharNo} onChange={e => setFormData({...formData, aadharNo: e.target.value.replace(/[^0-9]/g, '')})} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" placeholder="12-digit number" />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">UID ID / Number</label>
                           <div className="relative">
                              <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                              <input type="text" value={formData.uidId} onChange={e => setFormData({...formData, uidId: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" placeholder="UID Identity" />
                           </div>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PAN Card Number</label>
                           <div className="relative">
                              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                              <input type="text" maxLength={10} value={formData.panNo} onChange={e => setFormData({...formData, panNo: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ABCDE1234F" />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 dark:border-indigo-900/30 pb-2">Parental Registry</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FATHER NAME</label>
                           <input type="text" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FATHER NUMBER</label>
                           <input type="tel" maxLength={10} value={formData.fatherMobile} onChange={e => setFormData({...formData, fatherMobile: e.target.value.replace(/[^0-9]/g, '')})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MOTHER NAME</label>
                           <input type="text" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MOTHER NUMBER</label>
                           <input type="tel" maxLength={10} value={formData.motherMobile} onChange={e => setFormData({...formData, motherMobile: e.target.value.replace(/[^0-9]/g, '')})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Residence Address</label>
                           <textarea rows={2} value={formData.residenceAddress} onChange={e => setFormData({...formData, residenceAddress: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={() => { stopCamera(); setShowModal(false); }} className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-black rounded-2xl uppercase text-[9px] tracking-widest shadow-sm">Cancel</button>
                  <button type="submit" disabled={isSyncing} className="flex-[2] py-3.5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-[9px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                    Finalize Registration
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md no-print animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 max-xs w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Purge Data?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] uppercase tracking-widest leading-relaxed">Permanent erase action.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteId(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Keep</button>
                 <button onClick={async () => { try { await db.students.delete(deleteId); setDeleteId(null); fetchCloudData(); } catch(e: any) { alert(getErrorMessage(e)); } }} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentsManager;
