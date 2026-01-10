
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Student } from '../types';
import { 
  Plus, 
  Search, 
  Printer, 
  ChevronRight, 
  Filter, 
  GraduationCap, 
  Contact, 
  User as UserIcon, 
  Download, 
  CheckCircle2, 
  ShieldCheck,
  QrCode,
  MapPin,
  Phone,
  Calendar,
  Layers,
  LayoutGrid,
  FileDown,
  Info,
  FileSignature,
  Upload,
  Trash2,
  CreditCard,
  Loader2,
  RefreshCw,
  // Fix: Added missing Smartphone icon import from lucide-react
  Smartphone
} from 'lucide-react';
import { db, supabase } from '../supabase';
import { APP_NAME } from '../constants';

interface IdCardGeneratorProps {
  user: User;
  schoolLogo: string | null;
}

const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const IdCardGenerator: React.FC<IdCardGeneratorProps> = ({ user, schoolLogo }) => {
  const [selectedClass, setSelectedClass] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [principalSign, setPrincipalSign] = useState<string | null>(() => localStorage.getItem('school_principal_sign'));
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const signInputRef = useRef<HTMLInputElement>(null);

  const fetchCloudStudents = async () => {
    try {
      const data = await db.students.getAll();
      const mapped = data.map((s: any) => ({
        id: s.id, fullName: s.full_name, name: s.full_name, email: s.email, rollNo: s.roll_no,
        class: s.class, section: s.section, grNumber: s.gr_number, profileImage: s.profile_image,
        fatherName: s.father_name, motherName: s.mother_name, fatherMobile: s.father_mobile,
        residenceAddress: s.residence_address, aadharNumber: s.aadhar_number || ''
      }));
      setStudents(mapped);
    } catch (err) { console.error("Identity Sync Error"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudStudents();
    const channel = supabase.channel('id-generator-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchCloudStudents().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = selectedClass === 'All' || s.class === selectedClass;
      const matchesSearch = (s.fullName || s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (s.rollNo || '').includes(searchQuery) || 
                            (s.grNumber || '').includes(searchQuery);
      return matchesClass && matchesSearch;
    });
  }, [students, selectedClass, searchQuery]);

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPrincipalSign(dataUrl);
        localStorage.setItem('school_principal_sign', dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSignature = () => {
    setPrincipalSign(null);
    localStorage.removeItem('school_principal_sign');
  };

  const toggleSelection = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const handleDownloadPdf = () => {
    if (selectedStudents.length === 0) {
      alert("Please select students.");
      return;
    }
    window.print();
  };

  const selectedData = useMemo(() => 
    students.filter(s => selectedStudents.includes(s.id)),
    [students, selectedStudents]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Updating Student Pool...</span>
           </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .id-card-print-container, .id-card-print-container * { visibility: visible; }
          .id-card-print-container {
            position: absolute; left: 0; top: 0; width: 100%;
            display: grid; grid-template-columns: repeat(2, 1fr);
            gap: 20px; padding: 20px; background: white !important;
          }
          .id-card-item { page-break-inside: avoid; break-inside: avoid; margin-bottom: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="hidden print:block">
        <div className="id-card-print-container">
          {selectedData.map(student => (
            <div key={student.id} className="id-card-item">
              <IdCardComponent student={student} schoolLogo={schoolLogo} principalSign={principalSign} />
            </div>
          ))}
        </div>
      </div>

      <div className="no-print space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase flex items-center gap-3">PVC ID Generation <Smartphone className="text-indigo-600" /></h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Batch process official student cards with global cloud verification.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownloadPdf}
              disabled={selectedStudents.length === 0}
              className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center gap-3 hover:-translate-y-1 transition-all disabled:opacity-50 uppercase text-xs tracking-widest"
            >
              <FileDown size={20} strokeWidth={3} /> Print Batch ({selectedStudents.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <FileSignature className="text-indigo-600" size={20} />
                 <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest">Authority Auth</h3>
              </div>
              <div 
                onClick={() => signInputRef.current?.click()}
                className={`h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden bg-slate-50 dark:bg-slate-800/50 relative group ${principalSign ? 'border-indigo-300' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}
              >
                <input type="file" ref={signInputRef} className="hidden" accept="image/*" onChange={handleSignatureUpload} />
                {principalSign ? (
                  <>
                    <img src={principalSign} className="w-full h-full object-contain p-2 mix-blend-multiply dark:mix-blend-normal" alt="Sign" />
                    <button onClick={(e) => { e.stopPropagation(); clearSignature(); }} className="absolute top-1 right-1 p-2 bg-white dark:bg-slate-700 rounded-xl shadow-xl text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                  </>
                ) : (
                  <div className="text-center p-2"><Upload size={20} className="text-slate-300 mx-auto mb-1"/><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signature</span></div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Search Registry</label>
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Name or GR..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
                <select 
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white"
                >
                   <option value="All">All Grades</option>
                   {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest">Cloud Recipients</h3>
                  <button onClick={selectAll} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase hover:underline">Toggle All</button>
                </div>

                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                   {isLoading ? (
                     <div className="py-10 flex flex-col items-center justify-center opacity-50">
                        <Loader2 className="animate-spin mb-2" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Connecting to registry...</span>
                     </div>
                   ) : filteredStudents.map(s => (
                      <div key={s.id} onClick={() => toggleSelection(s.id)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedStudents.includes(s.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800'}`}>
                         <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-indigo-600 overflow-hidden shadow-inner">
                            {s.profileImage ? <img src={s.profileImage} className="w-full h-full object-cover" alt="S" /> : (s.fullName || s.name || '').charAt(0)}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className={`font-black text-sm truncate uppercase ${selectedStudents.includes(s.id) ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>{s.fullName || s.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">GR: {s.grNumber}</p>
                         </div>
                         {selectedStudents.includes(s.id) && <CheckCircle2 size={16} className="text-indigo-500" />}
                      </div>
                   ))}
                   {!isLoading && filteredStudents.length === 0 && (
                     <p className="text-center py-10 text-slate-300 font-bold uppercase text-[10px]">No matches found</p>
                   )}
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-8">
             <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group min-h-[600px]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                
                <div className="flex items-center justify-between mb-12 relative z-10">
                   <div>
                      <h3 className="text-white font-black text-2xl tracking-tight uppercase">Template Rendering</h3>
                      <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest mt-1">Live Institutional PVC Preview</p>
                   </div>
                </div>

                <div className="flex flex-wrap gap-10 justify-center items-start py-4">
                   {selectedData.length > 0 ? (
                     selectedData.slice(0, 1).map(s => (
                        <div key={s.id} className="relative shadow-2xl hover:scale-105 transition-transform duration-500">
                          <IdCardComponent student={s} schoolLogo={schoolLogo} principalSign={principalSign} />
                        </div>
                     ))
                   ) : (
                     <div className="w-full h-80 border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-10 opacity-50">
                        <Contact size={64} className="text-white/20 mb-4" />
                        <h4 className="text-white font-black text-xl mb-2 uppercase">Queue Empty</h4>
                        <p className="text-slate-500 text-sm max-w-xs font-medium">Select students from the cloud registry to populate the rendering engine.</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const IdCardComponent: React.FC<{ student: Student, schoolLogo: string | null, principalSign: string | null }> = ({ student, schoolLogo, principalSign }) => {
  return (
    <div className="w-[340px] h-[520px] bg-white rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl relative border border-slate-100">
      <div className="h-36 bg-indigo-600 relative overflow-hidden p-6 flex flex-col items-center justify-center">
         <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 animate-pulse"></div>
         <div className="w-14 h-14 bg-white rounded-2xl mb-3 flex items-center justify-center overflow-hidden border-2 border-white/50 shadow-xl relative z-10">
            {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <GraduationCap className="text-indigo-600" size={28} />}
         </div>
         <h4 className="text-white font-black text-sm uppercase tracking-[0.2em] relative z-10 leading-none">{APP_NAME}</h4>
         <p className="text-indigo-200 font-bold text-[8px] uppercase tracking-[0.3em] mt-2 relative z-10">Student Identity Card</p>
      </div>

      <div className="flex-1 flex flex-col items-center px-8 pt-8 pb-4 text-center">
         <div className="w-28 h-28 bg-slate-50 rounded-[3rem] border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden mb-5 ring-1 ring-slate-100 transform -mt-16 relative z-20">
            {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" alt="S" /> : <UserIcon size={40} className="text-slate-200" />}
         </div>

         <div className="space-y-1 mb-8">
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-tight">{student.fullName || student.name}</h2>
            <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
               Std {student.class}-{student.section}
            </div>
         </div>

         <div className="w-full space-y-4 text-left border-t border-slate-50 pt-8">
            <div className="flex items-center justify-between">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><QrCode size={12} className="text-indigo-500" /> GR REFERENCE</span>
               <span className="text-xs font-black text-slate-800">{student.grNumber}</span>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Phone size={12} className="text-emerald-500" /> CONTACT</span>
               <span className="text-xs font-black text-slate-800">{student.fatherMobile}</span>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CreditCard size={12} className="text-amber-500" /> AADHAR NO</span>
               <span className="text-xs font-black text-slate-800">{student.aadharNumber || 'Pending'}</span>
            </div>
            <div className="flex flex-col gap-2">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12} className="text-rose-500" /> RESIDENTIAL ADDRESS</span>
               <span className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2 uppercase italic">{student.residenceAddress || 'Campus Hostel / Local Resident'}</span>
            </div>
         </div>
      </div>

      <div className="p-10 pt-4 flex justify-between items-end">
         <div className="text-left flex flex-col items-center">
            <div className="h-10 w-28 relative flex items-center justify-center mb-1">
               {principalSign ? <img src={principalSign} className="max-h-full max-w-full object-contain mix-blend-multiply opacity-90" alt="Sign" /> : <div className="w-full border-b border-slate-200"></div>}
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Principal Authority</p>
         </div>
         <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <QrCode size={32} className="text-slate-800 opacity-20" />
         </div>
      </div>
      
      <div className="h-1 bg-indigo-600"></div>
    </div>
  );
};

export default IdCardGenerator;
