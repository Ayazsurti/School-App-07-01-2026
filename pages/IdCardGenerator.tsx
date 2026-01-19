
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
  Smartphone,
  Eye,
  X,
  Check
} from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';
import { APP_NAME } from '../constants';

interface IdCardGeneratorProps {
  user: User;
  schoolLogo: string | null;
}

const ALL_CLASSES = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const IdCardGenerator: React.FC<IdCardGeneratorProps> = ({ user, schoolLogo }) => {
  const [selectedClass, setSelectedClass] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [principalSign, setPrincipalSign] = useState<string | null>(() => localStorage.getItem('school_principal_sign'));
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const signInputRef = useRef<HTMLInputElement>(null);

  const fetchCloudStudents = async () => {
    try {
      const data = await db.students.getAll();
      const mapped = (data || []).map((s: any) => ({
        id: s.id, fullName: s.full_name, name: s.full_name, email: s.email, rollNo: s.roll_no,
        class: s.class, section: s.section, grNumber: s.gr_number, profileImage: s.profile_image,
        fatherName: s.father_name, motherName: s.mother_name, fatherMobile: s.father_mobile,
        residenceAddress: s.residence_address, aadharNo: s.aadhar_no || '',
        dob: s.dob
      }));
      setStudents(mapped as Student[]);
    } catch (err: any) { 
      console.error("Identity Registry Fetch Error:", getErrorMessage(err)); 
    }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudStudents();
    const channel = supabase.channel('id-generator-sync-v17')
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

  const selectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id);
    const allCurrentlySelected = filteredIds.every(id => selectedStudents.includes(id));

    if (allCurrentlySelected) {
      setSelectedStudents(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedStudents(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleDownloadPdf = () => {
    if (selectedStudents.length === 0) {
      alert("No identities selected for batch processing.");
      return;
    }
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const selectedData = useMemo(() => 
    students.filter(s => selectedStudents.includes(s.id)),
    [students, selectedStudents]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce no-print">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Syncing ID Registry...</span>
           </div>
        </div>
      )}

      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: white; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .id-card-print-container {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 40px !important;
            padding: 20px !important;
            width: 100% !important;
          }
          .id-card-item { 
            page-break-inside: avoid !important; 
            break-inside: avoid !important;
            margin: 0 auto !important;
          }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>

      {/* HIDDEN PRINT LAYER (VERTICAL STACK) */}
      <div className="hidden print:block print-only">
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
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">PVC ID Generator</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-xs tracking-widest">Digitally Verified Identity Portal</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowPreviewModal(true)}
              disabled={selectedStudents.length === 0}
              className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-2xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-3 disabled:opacity-50 uppercase text-xs tracking-widest"
            >
              <Eye size={18} strokeWidth={3} /> Preview Batch ({selectedStudents.length})
            </button>
            <button 
              onClick={handleDownloadPdf}
              disabled={selectedStudents.length === 0}
              className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all disabled:opacity-50 uppercase text-xs tracking-widest"
            >
              <FileDown size={20} strokeWidth={3} /> Download Identity PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Controls Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3 mb-2 px-1">
                 <FileSignature className="text-indigo-600" size={22} />
                 <h3 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-widest">Authority Seal</h3>
              </div>
              <div 
                onClick={() => signInputRef.current?.click()}
                className={`h-28 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden bg-slate-50 dark:bg-slate-800 relative group ${principalSign ? 'border-indigo-300' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}
              >
                <input type="file" ref={signInputRef} className="hidden" accept="image/*" onChange={handleSignatureUpload} />
                {principalSign ? (
                  <>
                    <img src={principalSign} className="w-full h-full object-contain p-4 mix-blend-multiply dark:mix-blend-normal opacity-90" alt="Sign" />
                    <button onClick={(e) => { e.stopPropagation(); clearSignature(); }} className="absolute inset-0 bg-rose-600/10 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                       <div className="p-3 bg-white rounded-2xl shadow-2xl text-rose-600"><Trash2 size={20}/></div>
                    </button>
                  </>
                ) : (
                  <div className="text-center p-2"><Upload size={24} className="text-slate-300 mx-auto mb-2"/><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Sign</span></div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Filter</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Search by name or GR..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner uppercase text-xs" />
                </div>
                <select 
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 font-black text-slate-700 dark:text-white appearance-none cursor-pointer uppercase text-xs"
                >
                   <option value="All">All Grades</option>
                   {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-black text-slate-800 dark:text-white text-[10px] uppercase tracking-widest">Batch Selection</h3>
                  <button onClick={selectAllFiltered} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">All</button>
                </div>

                <div className="max-h-[450px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                   {isLoading ? (
                     <div className="py-20 flex flex-col items-center justify-center opacity-50"><Loader2 className="animate-spin text-indigo-500" /></div>
                   ) : filteredStudents.length > 0 ? (
                     filteredStudents.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => toggleSelection(s.id)} 
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group ${selectedStudents.includes(s.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 hover:bg-slate-50'}`}
                      >
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-inner overflow-hidden shrink-0 transition-all ${selectedStudents.includes(s.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {s.profileImage ? <img src={s.profileImage} className="w-full h-full object-cover" alt="S" /> : (s.fullName || s.name || '').charAt(0)}
                         </div>
                         <div className="flex-1 min-w-0 text-left">
                            <p className={`font-black text-xs truncate uppercase ${selectedStudents.includes(s.id) ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>{s.fullName || s.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">GR: {s.grNumber} • Std {s.class}</p>
                         </div>
                         {selectedStudents.includes(s.id) ? <div className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg"><Check size={12} strokeWidth={4} /></div> : <div className="w-5 h-5 border-2 border-slate-100 rounded-full" />}
                      </div>
                   ))
                   ) : searchQuery && <p className="text-center py-10 text-[10px] font-black text-slate-400 uppercase">No identity match</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Main Workspace Preview */}
          <div className="xl:col-span-3">
             <div className="bg-white dark:bg-slate-900 p-12 rounded-[4rem] shadow-sm border border-slate-100 dark:border-slate-800 min-h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-16">
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Render Interface</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">Official PVC Identity Template</p>
                   </div>
                   <div className="flex items-center gap-4 bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                      <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><QrCode size={20}/></div>
                      <div className="pr-4">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Layout Node</p>
                         <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase">Sequential PDF</p>
                      </div>
                   </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center">
                   {selectedData.length > 0 ? (
                     <div className="animate-in zoom-in-95 duration-700">
                        <IdCardComponent student={selectedData[0]} schoolLogo={schoolLogo} principalSign={principalSign} />
                        <div className="mt-12 p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 max-w-md mx-auto">
                           <Info size={24} className="text-indigo-500 shrink-0" />
                           <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-relaxed tracking-wider text-center">Batch Ready: <b>{selectedData.length}</b> identities bound to current template.</p>
                        </div>
                     </div>
                   ) : (
                     <div className="text-center opacity-30 group">
                        <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-[3rem] flex items-center justify-center mb-8 mx-auto shadow-inner group-hover:scale-110 transition-transform">
                           <LayoutGrid size={64} className="text-slate-200 dark:text-slate-700" />
                        </div>
                        <h4 className="text-2xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter">Sync Identity to Preview</h4>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* COMPACT BATCH PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 no-print animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-lg h-[80vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                       <ShieldCheck size={20} />
                    </div>
                    <div>
                       <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">Registry Proof</h3>
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{selectedData.length} Bound Identities</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={handleDownloadPdf}
                      className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
                    >
                       <FileDown size={18} />
                    </button>
                    <button onClick={() => setShowPreviewModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"><X size={20} /></button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-100 dark:bg-slate-950/50 flex flex-col items-center gap-12">
                 {selectedData.map(s => (
                   <div key={s.id} className="shadow-2xl bg-white rounded-[2.5rem] transform hover:scale-[1.02] transition-transform">
                      <IdCardComponent student={s} schoolLogo={schoolLogo} principalSign={principalSign} />
                   </div>
                 ))}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center">
                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.4em]">Official Institutional Preview Window</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const IdCardComponent: React.FC<{ student: Student, schoolLogo: string | null, principalSign: string | null }> = ({ student, schoolLogo, principalSign }) => {
  return (
    <div className="w-[340px] h-[520px] bg-white rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl relative border border-slate-100 flex-shrink-0 text-slate-900">
      <div className="h-44 bg-indigo-600 relative overflow-hidden p-8 flex flex-col items-center justify-center">
         <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
         <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mt-16"></div>
         
         <div className="w-16 h-16 bg-white rounded-2xl mb-4 flex items-center justify-center overflow-hidden border-2 border-white/50 shadow-xl relative z-10">
            {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <GraduationCap className="text-indigo-600" size={32} />}
         </div>
         <h4 className="text-white font-black text-sm uppercase tracking-[0.2em] relative z-10 leading-none text-center">{APP_NAME}</h4>
         <p className="text-indigo-200 font-bold text-[8px] uppercase tracking-[0.3em] mt-2 relative z-10">Identity Certificate</p>
      </div>

      <div className="flex-1 flex flex-col items-center px-8 pt-10 pb-4 text-center">
         <div className="w-28 h-28 bg-slate-50 rounded-[3rem] border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden mb-6 ring-1 ring-slate-100 transform relative z-20 transition-transform hover:scale-105">
            {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" alt="S" /> : <UserIcon size={40} className="text-slate-200" />}
         </div>

         <div className="space-y-1 mb-6">
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-tight">{student.fullName || student.name}</h2>
            <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 mt-2">
               Std {student.class}-{student.section}
            </div>
         </div>

         <div className="w-full space-y-4 text-left border-t border-slate-50 pt-8">
            <div className="flex flex-col gap-2">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">RESIDENCE ADDRESS</span>
               <span className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2 uppercase italic">{student.residenceAddress || 'Campus Hostel'}</span>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">PARENT CONTACT</span>
               <span className="text-xs font-black text-slate-800">{student.fatherMobile}</span>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">GR NUMBER</span>
               <span className="text-xs font-black text-slate-800">{student.grNumber}</span>
            </div>
         </div>
      </div>

      <div className="px-10 pb-10 pt-0 flex justify-between items-end -mt-4">
         <div className="text-left flex flex-col items-center">
            <div className="h-10 w-28 relative flex items-center justify-center mb-1">
               {principalSign ? <img src={principalSign} className="max-h-full max-w-full object-contain mix-blend-multiply opacity-90" alt="Sign" /> : <div className="w-full border-b border-slate-200 opacity-20"></div>}
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Principal Authority</p>
         </div>
         <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 opacity-40">
            <QrCode size={32} className="text-slate-800" />
         </div>
      </div>
      
      <div className="h-1.5 bg-indigo-600"></div>
    </div>
  );
};

export default IdCardGenerator;
