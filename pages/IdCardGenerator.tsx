
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student, IdCardTemplate } from '../types';
import { 
  Search, Printer, Loader2, RefreshCw, Eye, X, Check, Contact, LayoutTemplate,
  FileDown, Filter, Users, Download
} from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';
import { IdCardComponent } from './IdCardDesigner';

interface IdCardGeneratorProps {
  user: User;
  schoolLogo: string | null;
}

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];

const IdCardGenerator: React.FC<IdCardGeneratorProps> = ({ user, schoolLogo }) => {
  const [selectedClass, setSelectedClass] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [templates, setTemplates] = useState<IdCardTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<IdCardTemplate | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSide, setPreviewSide] = useState<'FRONT' | 'BACK'>('FRONT');

  const fetchData = async () => {
    try {
      const [studentData, templateData] = await Promise.all([
        db.students.getAll(),
        db.idCards.getTemplates()
      ]);
      
      const mapped = (studentData || []).map((s: any) => ({
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
        residenceAddress: s.residence_address, 
        aadharNo: s.aadhar_no || '',
        panNo: s.pan_no || '',
        penNo: s.pen_no || '',
        uidId: s.uid_id || '',
        dob: s.dob,
        bloodGroup: s.blood_group || 'N/A',
        studentType: s.student_type || 'GENERAL',
        birthPlace: s.birth_place || 'N/A'
      }));
      
      setStudents(mapped as Student[]);
      setTemplates(templateData);
      if (templateData.length > 0 && !activeTemplate) setActiveTemplate(templateData[0]);
    } catch (err: any) { 
      console.error("Registry Sync Error:", getErrorMessage(err)); 
    }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('id-gen-realtime-v22')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = selectedClass === 'All' || s.class === selectedClass;
      const matchesSearch = (s.fullName || s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (s.grNumber || '').includes(searchQuery);
      return matchesClass && matchesSearch;
    });
  }, [students, selectedClass, searchQuery]);

  // AUTO-SELECT LOGIC: When class is selected, auto-select all students in that class
  useEffect(() => {
    if (selectedClass !== 'All') {
      const classStudentIds = filteredStudents.map(s => s.id);
      setSelectedStudentIds(classStudentIds);
    }
  }, [selectedClass, students, searchQuery]);

  const toggleSelection = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id);
    const allCurrentlySelected = filteredIds.every(id => selectedStudentIds.includes(id));
    if (allCurrentlySelected) {
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const selectedData = useMemo(() => 
    students.filter(s => selectedStudentIds.includes(s.id)),
    [students, selectedStudentIds]
  );

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: white !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .id-card-print-container {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10mm !important;
            padding: 15mm !important;
            width: 210mm !important; /* A4 Width */
            background: white !important;
            margin: 0 auto !important;
          }
          .id-card-item { 
            page-break-inside: avoid !important; 
            break-inside: avoid !important;
            margin-bottom: 5mm !important;
          }
          @page { 
            size: A4 portrait; 
            margin: 0; 
          }
        }
      `}</style>

      {/* PRINT LAYER (Grid Layout for A4) */}
      <div className="hidden print:block print-only">
        <div className="id-card-print-container">
          {selectedData.map(student => (
            <div key={student.id} className="id-card-item">
               {activeTemplate && (
                 <div className="space-y-2 flex flex-col items-center">
                    <IdCardComponent template={activeTemplate} student={student} side="FRONT" />
                    {activeTemplate.showBackSide && <IdCardComponent template={activeTemplate} student={student} side="BACK" />}
                 </div>
               )}
            </div>
          ))}
        </div>
      </div>

      <div className="no-print space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Bulk ID Generator</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-xs tracking-[0.3em]">Identity Hub • Class-wise PDF Batcher</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => { setPreviewSide('FRONT'); setShowPreviewModal(true); }}
              disabled={selectedStudentIds.length === 0 || !activeTemplate}
              className="px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-2xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-3 disabled:opacity-50 uppercase text-[10px] tracking-widest"
            >
              <Eye size={18} strokeWidth={3} /> Preview Batch ({selectedStudentIds.length})
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={selectedStudentIds.length === 0 || !activeTemplate}
              className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 uppercase text-[10px] tracking-widest flex items-center gap-3"
            >
              <Download size={20} strokeWidth={3} /> Download ID PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-1 space-y-6">
            {/* Template Selection */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-4 block">Designer Blueprint</label>
               <select 
                value={activeTemplate?.id || ''} 
                onChange={e => setActiveTemplate(templates.find(t => t.id === e.target.value) || null)}
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 font-black text-indigo-600 appearance-none cursor-pointer uppercase text-xs outline-none focus:ring-2 focus:ring-indigo-500"
               >
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                  {templates.length === 0 && <option>NO TEMPLATES FOUND</option>}
               </select>
            </div>

            {/* Smart Filters */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class-wise Auto-Select</label>
                <div className="relative group">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    value={selectedClass} 
                    onChange={e => setSelectedClass(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-10 py-4 font-black text-slate-700 dark:text-white appearance-none cursor-pointer uppercase text-xs shadow-inner outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                     <option value="All">All Grades (Manual Select)</option>
                     {ALL_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search by Name/GR..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner uppercase text-[10px]" 
                  />
                </div>
              </div>

              {/* Selection List */}
              <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-black text-slate-800 dark:text-white text-[10px] uppercase tracking-widest">Queue ({selectedStudentIds.length})</h3>
                  <button onClick={selectAllFiltered} className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">Toggle All</button>
                </div>

                <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                   {isLoading ? (
                     <div className="py-20 flex flex-col items-center justify-center opacity-50"><Loader2 className="animate-spin text-indigo-500" /></div>
                   ) : filteredStudents.length > 0 ? filteredStudents.map(s => (
                    <div key={s.id} onClick={() => toggleSelection(s.id)} className={`flex items-center gap-4 p-4 rounded-[2rem] border-2 transition-all cursor-pointer ${selectedStudentIds.includes(s.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800'}`}>
                       <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${selectedStudentIds.includes(s.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                          {s.profileImage ? <img src={s.profileImage} className="w-full h-full object-cover rounded-xl" /> : <Users size={16} />}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className={`font-black text-[10px] truncate uppercase ${selectedStudentIds.includes(s.id) ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>{s.fullName}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">GR: {s.grNumber}</p>
                       </div>
                       {selectedStudentIds.includes(s.id) ? <div className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg"><Check size={12} strokeWidth={4} /></div> : <div className="w-5 h-5 border-2 border-slate-100 dark:border-slate-800 rounded-full" />}
                    </div>
                   )) : (
                     <div className="py-12 text-center opacity-30">
                        <Contact size={32} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No matching results</p>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Preview Area */}
          <div className="xl:col-span-3">
             <div className="bg-white dark:bg-slate-900 p-12 rounded-[4rem] shadow-sm border border-slate-100 dark:border-slate-800 min-h-[700px] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute top-10 flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner no-print">
                    <button onClick={() => setPreviewSide('FRONT')} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewSide === 'FRONT' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>Front Side</button>
                    <button onClick={() => setPreviewSide('BACK')} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewSide === 'BACK' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-400'}`}>Back Side</button>
                </div>

                {activeTemplate && selectedData.length > 0 ? (
                   <div className="animate-in zoom-in-95 duration-700 flex flex-col items-center relative z-10">
                      <div className="shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)]">
                        <IdCardComponent template={activeTemplate} student={selectedData[0]} scale={6} side={previewSide} />
                      </div>
                      
                      <div className="mt-12 text-center">
                         <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Preview: {selectedData[0].fullName}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Batch Size: {selectedData.length} Students</p>
                      </div>
                   </div>
                ) : (
                   <div className="text-center opacity-30 relative z-10">
                      <LayoutTemplate size={100} className="mx-auto mb-6 text-slate-200" />
                      <h4 className="text-2xl font-black text-slate-300 uppercase tracking-tighter">Select a class to generate batch</h4>
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-2">All students will be processed for PDF export</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Batch Preview Modal */}
      {showPreviewModal && activeTemplate && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 lg:p-10 no-print animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                 <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white">Batch Export Grid</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedData.length} Identities Queued for PDF</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                       <button onClick={() => setPreviewSide('FRONT')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase ${previewSide === 'FRONT' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Front</button>
                       <button onClick={() => setPreviewSide('BACK')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase ${previewSide === 'BACK' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Back</button>
                    </div>
                    <button onClick={handleDownloadPDF} className="px-6 py-3 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg flex items-center gap-2"><Download size={16}/> Download PDF</button>
                    <button onClick={() => setShowPreviewModal(false)} className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"><X size={20} /></button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-100 dark:bg-slate-950/50">
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12 justify-items-center">
                   {selectedData.map(s => (
                      <div key={s.id} className="shadow-2xl scale-[0.8] origin-top">
                         <IdCardComponent template={activeTemplate} student={s} scale={6} side={previewSide} />
                      </div>
                   ))}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default IdCardGenerator;
