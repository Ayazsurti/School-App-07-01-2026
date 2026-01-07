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
  CreditCard
} from 'lucide-react';
import { MOCK_STUDENTS, APP_NAME } from '../constants';

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
  
  const signInputRef = useRef<HTMLInputElement>(null);

  const students = useMemo(() => {
    const saved = localStorage.getItem('school_students_db');
    return saved ? JSON.parse(saved) as Student[] : MOCK_STUDENTS as any as Student[];
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
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
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">PVC ID Generation</h1>
            <p className="text-slate-500 font-medium text-lg">Batch process official student cards with 7-field verification.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownloadPdf}
              disabled={selectedStudents.length === 0}
              className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center gap-3 hover:-translate-y-1 transition-all disabled:opacity-50"
            >
              <FileDown size={20} strokeWidth={3} /> Print Batch ({selectedStudents.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <FileSignature className="text-indigo-600" size={20} />
                 <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Authority Auth</h3>
              </div>
              <div 
                onClick={() => signInputRef.current?.click()}
                className={`h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden bg-slate-50 relative group ${principalSign ? 'border-indigo-300' : 'border-slate-200 hover:border-indigo-400'}`}
              >
                <input type="file" ref={signInputRef} className="hidden" accept="image/*" onChange={handleSignatureUpload} />
                {principalSign ? (
                  <>
                    <img src={principalSign} className="w-full h-full object-contain p-2 mix-blend-multiply" alt="Sign" />
                    <button onClick={(e) => { e.stopPropagation(); clearSignature(); }} className="absolute top-1 right-1 p-2 bg-white rounded-xl shadow-xl text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                  </>
                ) : (
                  <div className="text-center p-2"><Upload size={20} className="text-slate-300 mx-auto mb-1"/><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signature</span></div>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Search Registry</label>
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Name or GR..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Recipients</h3>
                  <button onClick={selectAll} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Toggle All</button>
                </div>

                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                   {filteredStudents.map(s => (
                      <div key={s.id} onClick={() => toggleSelection(s.id)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedStudents.includes(s.id) ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-50'}`}>
                         <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-indigo-600 overflow-hidden">
                            {s.profileImage ? <img src={s.profileImage} className="w-full h-full object-cover" alt="S" /> : (s.fullName || s.name || '').charAt(0)}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className={`font-black text-sm truncate ${selectedStudents.includes(s.id) ? 'text-indigo-900' : 'text-slate-800'}`}>{s.fullName || s.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">GR: {s.grNumber}</p>
                         </div>
                         {selectedStudents.includes(s.id) && <CheckCircle2 size={16} className="text-indigo-500" />}
                      </div>
                   ))}
                </div>
              </div>
            </div>
          </div>

          <div className="xl:col-span-2 space-y-8">
             <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                
                <div className="flex items-center justify-between mb-12 relative z-10">
                   <div>
                      <h3 className="text-white font-black text-2xl tracking-tight">Template Rendering</h3>
                      <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest mt-1">Live Institutional PVC Preview</p>
                   </div>
                </div>

                <div className="flex flex-wrap gap-10 justify-center items-start py-4">
                   {selectedData.length > 0 ? (
                     selectedData.slice(0, 1).map(s => (
                        <div key={s.id} className="relative shadow-2xl hover:scale-105 transition-transform">
                          <IdCardComponent student={s} schoolLogo={schoolLogo} principalSign={principalSign} />
                        </div>
                     ))
                   ) : (
                     <div className="w-full h-80 border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-10 opacity-50">
                        <Contact size={64} className="text-white/20 mb-4" />
                        <h4 className="text-white font-black text-xl mb-2">Queue Empty</h4>
                        <p className="text-slate-500 text-sm max-w-xs">Select students to populate the rendering engine.</p>
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
    <div className="w-[340px] h-[520px] bg-white rounded-[2rem] overflow-hidden flex flex-col shadow-2xl relative border border-slate-100">
      <div className="h-32 bg-indigo-600 relative overflow-hidden p-6 flex flex-col items-center justify-center">
         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
         <div className="w-12 h-12 bg-white rounded-xl mb-2 flex items-center justify-center overflow-hidden border-2 border-white/50 shadow-lg">
            {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <GraduationCap className="text-indigo-600" size={24} />}
         </div>
         <h4 className="text-white font-black text-xs uppercase tracking-[0.2em]">{APP_NAME}</h4>
         <p className="text-indigo-200 font-bold text-[8px] uppercase tracking-widest mt-1">Student Identity Card</p>
      </div>

      <div className="flex-1 flex flex-col items-center px-8 pt-8 pb-4 text-center">
         <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] border-4 border-white shadow-xl flex items-center justify-center overflow-hidden mb-4 ring-1 ring-slate-100">
            {student.profileImage ? <img src={student.profileImage} className="w-full h-full object-cover" alt="S" /> : <UserIcon size={32} className="text-slate-200" />}
         </div>

         <div className="space-y-1 mb-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-tight">{student.fullName || student.name}</h2>
            <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">
               Std {student.class}-{student.section}
            </div>
         </div>

         <div className="w-full space-y-3.5 text-left border-t border-slate-50 pt-6">
            <div className="flex items-center justify-between">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><QrCode size={10} className="text-indigo-500" /> GR NO</span>
               <span className="text-xs font-black text-slate-800">{student.grNumber}</span>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Phone size={10} className="text-emerald-500" /> CONTACT</span>
               <span className="text-xs font-black text-slate-800">{student.fatherMobile}</span>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CreditCard size={10} className="text-amber-500" /> AADHAR</span>
               <span className="text-xs font-black text-slate-800">{student.aadharNumber || 'N/A'}</span>
            </div>
            <div className="flex flex-col gap-1">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={10} className="text-rose-500" /> RESIDENCE</span>
               <span className="text-[9px] font-bold text-slate-700 leading-tight line-clamp-2 uppercase">{student.residenceAddress || '---'}</span>
            </div>
         </div>
      </div>

      <div className="p-8 pt-0 flex justify-between items-end">
         <div className="text-left flex flex-col items-center">
            <div className="h-8 w-24 relative flex items-center justify-center">
               {principalSign ? <img src={principalSign} className="max-h-full max-w-full object-contain mix-blend-multiply" alt="Sign" /> : <div className="w-full border-b border-slate-200"></div>}
            </div>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1">Principal Sign</p>
         </div>
         <QrCode size={28} className="text-slate-100" />
      </div>
    </div>
  );
};

export default IdCardGenerator;