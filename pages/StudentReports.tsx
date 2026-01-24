
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Student } from '../types';
import { 
  Search, LayoutGrid, Layers, Plus, Trash2, Settings, 
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, 
  Save, X, RefreshCw, Filter, Globe, Edit2, 
  CheckCircle2, ShieldCheck, Type, Terminal, ArrowLeftRight, MoveHorizontal, Lock, Unlock,
  PlusCircle, Tag, FileDown, School, ClipboardList, AlertTriangle
} from 'lucide-react';
import { supabase, db } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';

interface StudentReportsProps { user: User; schoolLogo?: string | null; schoolName?: string; }

interface ReportFieldConfig {
  key: string;
  displayName: string;
  width: number;
  fontSize: number;
  isBold: boolean;
}

const WINGS = ['GIRLS', 'BOYS'];
const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const SECTIONS = ['A', 'B', 'C', 'D'];

const INITIAL_AVAILABLE_FIELDS = [
  { key: 'grNumber', label: 'GR NUMBER' },
  { key: 'fullName', label: 'FULL NAME' },
  { key: 'fatherName', label: 'FATHER NAME' },
  { key: 'motherName', label: 'MOTHER NAME' },
  { key: 'fatherMobile', label: 'FATHER MOBILE' },
  { key: 'motherMobile', label: 'MOTHER MOBILE' },
  { key: 'rollNo', label: 'ROLL NO' },
  { key: 'class', label: 'CLASS' },
  { key: 'section', label: 'SECTION' },
  { key: 'dob', label: 'DATE OF BIRTH' },
  { key: 'gender', label: 'GENDER' },
  { key: 'aadharNo', label: 'AADHAR NO' },
  { key: 'residenceAddress', label: 'ADDRESS' },
  { key: 'bloodGroup', label: 'BLOOD GROUP' },
];

const StudentReports: React.FC<StudentReportsProps> = ({ user, schoolLogo, schoolName }) => {
  const [selectedClasses, setSelectedClasses] = useState<Record<string, string[]>>({});
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [reportConfigs, setReportConfigs] = useState<ReportFieldConfig[]>([]);
  
  // Profile States
  const [profiles, setProfiles] = useState<string[]>(['ANNUAL MASTER LIST', 'FEE PENDING SUMMARY']);
  const [activeProfile, setActiveProfile] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showDeleteProfileConfirm, setShowDeleteProfileConfirm] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  
  // Custom Field/Label states
  const [availableFields, setAvailableFields] = useState(INITIAL_AVAILABLE_FIELDS);
  const [showNewLabelModal, setShowNewLabelModal] = useState(false);
  const [newLabelData, setNewLabelData] = useState({ name: '', displayName: '' });

  // Selection states for migration
  const [pendingFieldFromInfo, setPendingFieldFromInfo] = useState<string | null>(null);
  const [lastSelectedConfigKey, setLastSelectedConfigKey] = useState<string | null>(null);

  // Report Generation State
  const [reportData, setReportData] = useState<Student[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Scroll Refs
  const matrixScrollRef = useRef<HTMLDivElement>(null);
  const fieldScrollRef = useRef<HTMLDivElement>(null);

  const scrollHandler = (ref: React.RefObject<HTMLDivElement | null>, direction: 'UP' | 'DOWN') => {
    if (ref.current) {
      const scrollAmount = direction === 'UP' ? -100 : 100;
      ref.current.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }
  };

  const toggleClassSection = (wing: string, std: number, sec: string) => {
    const key = `${std} - ${wing}`;
    setSelectedClasses(prev => {
      const currentSecs = prev[key] || [];
      const newSecs = currentSecs.includes(sec) 
        ? currentSecs.filter(s => s !== sec) 
        : [...currentSecs, sec];
      return { ...prev, [key]: newSecs };
    });
  };

  const formattedSelectedClasses = useMemo(() => {
    const active: string[] = [];
    Object.entries(selectedClasses).forEach(([cls, secs]) => {
      if (secs.length > 0) active.push(`${cls} (${secs.join(',')})`);
    });
    return active;
  }, [selectedClasses]);

  const handleMoveRight = () => {
    if (!isModifying || !pendingFieldFromInfo) return;
    const key = pendingFieldFromInfo;
    if (selectedFields.includes(key)) return;
    
    const fieldDef = availableFields.find(f => f.key === key);
    if (!fieldDef) return;
    
    setSelectedFields(prev => [...prev, key]);
    setReportConfigs(prev => [...prev, {
      key, displayName: fieldDef.label, width: 120, fontSize: 10, isBold: false
    }]);
    setPendingFieldFromInfo(null);
  };

  const handleMoveLeft = () => {
    if (!isModifying || !lastSelectedConfigKey) return;
    const key = lastSelectedConfigKey;
    setSelectedFields(prev => prev.filter(f => f !== key));
    setReportConfigs(prev => prev.filter(f => f.key !== key));
    setLastSelectedConfigKey(null);
  };

  const moveConfig = (direction: 'UP' | 'DOWN') => {
    if (!isModifying || !lastSelectedConfigKey) return;
    const idx = reportConfigs.findIndex(c => c.key === lastSelectedConfigKey);
    if (idx === -1) return;
    
    const next = [...reportConfigs];
    const target = direction === 'UP' ? idx - 1 : idx + 1;
    if (target < 0 || target >= next.length) return;
    
    [next[idx], next[target]] = [next[target], next[idx]];
    setReportConfigs(next);
  };

  const updateConfig = (key: string, updates: Partial<ReportFieldConfig>) => {
    if (!isModifying) return;
    setReportConfigs(prev => prev.map(c => c.key === key ? { ...c, ...updates } : c));
  };

  const handleAddNewLabel = () => {
    if (!newLabelData.name || !newLabelData.displayName) return;
    const key = `custom_${newLabelData.name.toLowerCase().replace(/\s+/g, '_')}`;
    const newField = { key, label: newLabelData.displayName.toUpperCase() };
    setAvailableFields(prev => [...prev, newField]);
    setSelectedFields(prev => [...prev, key]);
    setReportConfigs(prev => [...prev, {
      key, displayName: newField.label, width: 120, fontSize: 10, isBold: false
    }]);
    setNewLabelData({ name: '', displayName: '' });
    setShowNewLabelModal(false);
  };

  const handleAddProfile = () => {
    if (!newProfileName.trim()) return;
    const name = newProfileName.trim().toUpperCase();
    if (!profiles.includes(name)) {
      setProfiles(prev => [...prev, name]);
      setActiveProfile(name);
    }
    setNewProfileName('');
    setShowProfileModal(false);
  };

  const confirmDeleteProfile = () => {
    if (!activeProfile) return;
    setProfiles(prev => prev.filter(p => p !== activeProfile));
    setActiveProfile('');
    setShowDeleteProfileConfirm(false);
    createAuditLog(user, 'DELETE', 'Reports', `Deleted report profile: ${activeProfile}`);
  };

  const handleSaveProfile = async () => {
    if (!activeProfile) {
      alert("Please select or create a profile first.");
      return;
    }
    setIsLoading(true);
    try {
      const profileData = {
        name: activeProfile,
        configs: reportConfigs,
        fields: selectedFields
      };
      localStorage.setItem(`report_profile_${profileData.name}`, JSON.stringify(profileData));
      await createAuditLog(user, 'UPDATE', 'Reports', `Saved report profile: ${profileData.name}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      alert("Failed to save profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (reportConfigs.length === 0) {
      alert("Select at least one field for the report.");
      return;
    }

    if (Object.keys(selectedClasses).length === 0) {
      alert("Please select at least one class and section from the Matrix.");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: students, error } = await supabase.from('students').select('*');
      if (error) throw error;

      // Filter based on exact match with the Matrix selection keys (e.g. "1 - GIRLS")
      const filtered = (students || []).filter(s => {
        const studentClassKey = s.class; // e.g. "1 - GIRLS"
        const targetSecs = selectedClasses[studentClassKey] || [];
        return targetSecs.includes(s.section);
      }).map(s => ({
        ...s,
        fullName: s.full_name,
        grNumber: s.gr_number,
        fatherName: s.father_name,
        motherName: s.mother_name,
        fatherMobile: s.father_mobile,
        motherMobile: s.mother_mobile,
        rollNo: s.roll_no,
        dob: s.dob,
        residenceAddress: s.residence_address,
        aadharNo: s.aadhar_no,
        bloodGroup: s.blood_group
      }));

      if (filtered.length === 0) {
        alert("No students found matching your matrix criteria.");
        setIsGenerating(false);
        return;
      }

      setReportData(filtered as any);
      
      // Delay to ensure rendering before print trigger
      setTimeout(() => {
        window.print();
        setIsGenerating(false);
      }, 800);

    } catch (e) {
      alert("Failed to generate report.");
      setIsGenerating(false);
    }
  };

  const filteredAvailableFields = useMemo(() => {
    return availableFields
      .filter(f => !selectedFields.includes(f.key))
      .filter(f => f.label.toLowerCase().includes(fieldSearch.toLowerCase()));
  }, [availableFields, selectedFields, fieldSearch]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-6 animate-in fade-in duration-500">
      
      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .report-print-area, .report-print-area * { visibility: visible; }
          .report-print-area {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white !important; padding: 10mm !important;
            display: block !important;
          }
          .no-print { display: none !important; }
          @page { size: landscape; margin: 10mm; }
        }
        .excel-table { border-collapse: collapse; width: 100%; border: 1px solid #000; }
        .excel-table th, .excel-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
      `}</style>

      {/* HIDDEN PRINT VIEW - SHOWN ONLY DURING PRINTING */}
      <div className="report-print-area hidden">
         <div className="flex items-center justify-between border-b-4 border-slate-900 pb-6 mb-8">
            <div className="flex items-center gap-6">
               <div className="w-20 h-20 overflow-hidden rounded-xl border-2 border-slate-200">
                  {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white font-black">LOGO</div>}
               </div>
               <div>
                  <h1 className="text-3xl font-black uppercase text-slate-900">{schoolName || 'INSTITUTION REPORT'}</h1>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600 mt-1">Official Student Progress Record Node</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Generated: {new Date().toLocaleString('en-GB')}</p>
               </div>
            </div>
            <div className="text-right">
               <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-black text-xs uppercase mb-1">Branded Data Dump</div>
               <p className="text-[9px] font-bold uppercase text-slate-500">Profile: {activeProfile || 'Standard Export'}</p>
            </div>
         </div>
         
         <table className="excel-table">
            <thead>
               <tr className="bg-slate-100">
                  {reportConfigs.map(config => (
                     <th key={config.key} style={{ fontSize: `${config.fontSize}px`, width: `${config.width}px` }} className="uppercase font-black border-2 border-slate-900">
                        {config.displayName}
                     </th>
                  ))}
               </tr>
            </thead>
            <tbody>
               {reportData.map((student, idx) => (
                  <tr key={student.id}>
                     {reportConfigs.map(config => (
                        <td key={config.key} style={{ fontSize: `${config.fontSize}px`, fontWeight: config.isBold ? 'bold' : 'normal' }} className="uppercase truncate border border-slate-300">
                           {(student as any)[config.key] || '-'}
                        </td>
                     ))}
                  </tr>
               ))}
            </tbody>
         </table>
         <div className="mt-12 flex justify-between items-end opacity-60">
            <p className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-400">Institutional Cloud Sync Node-v4</p>
            <div className="text-center">
               <div className="w-48 border-b border-slate-900 mb-2"></div>
               <p className="text-[9px] font-black uppercase">Registrar Signature</p>
            </div>
         </div>
      </div>

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 no-print">
           <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-emerald-500">
              <CheckCircle2 size={24} />
              <p className="font-black text-xs uppercase tracking-widest">ACTION COMPLETED</p>
           </div>
        </div>
      )}

      {/* NEW LABEL POPUP MODAL */}
      {showNewLabelModal && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl animate-in zoom-in-95 border-2 border-indigo-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><Tag size={20}/></div>
                <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest">Add New Label</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase ml-1 mb-1.5">Field Name</label>
                  <input type="text" value={newLabelData.name} onChange={e => setNewLabelData({...newLabelData, name: e.target.value})} placeholder="Internal Key..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-[10px] outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase ml-1 mb-1.5">Display Name</label>
                  <input type="text" value={newLabelData.displayName} onChange={e => setNewLabelData({...newLabelData, displayName: e.target.value})} placeholder="Table Heading..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-[10px] outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleAddNewLabel} className="flex-1 py-3.5 bg-indigo-600 text-white font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg">Add</button>
                  <button onClick={() => setShowNewLabelModal(false)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-xl text-[9px] uppercase tracking-widest hover:bg-slate-200">Close</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* NEW PROFILE POPUP MODAL - AS REQUESTED: SMALL SIZE, NAME LABEL, INPUT BOX BELOW, BUTTONS SIDE-BY-SIDE */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl animate-in zoom-in-95 border-2 border-indigo-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><ClipboardList size={20}/></div>
                <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest leading-none">New Profile</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 mb-2">Profile Name</label>
                  <input 
                    type="text" 
                    value={newProfileName} 
                    onChange={e => setNewProfileName(e.target.value)} 
                    placeholder="ENTER NAME..." 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-4 font-black text-[11px] outline-none focus:ring-2 focus:ring-indigo-500 uppercase shadow-inner" 
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={handleAddProfile} 
                    className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg active:scale-95 transition-all"
                  >
                    Add
                  </button>
                  <button 
                    onClick={() => { setShowProfileModal(false); setNewProfileName(''); }} 
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* DELETE PROFILE CONFIRMATION */}
      {showDeleteProfileConfirm && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-xs w-full shadow-2xl text-center border-2 border-rose-100 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-4 mx-auto shadow-inner">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Purge Profile?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium text-[9px] leading-relaxed uppercase tracking-widest">
                Delete <b>{activeProfile}</b>?
              </p>
              <div className="grid grid-cols-2 gap-2">
                 <button onClick={confirmDeleteProfile} className="py-4 bg-rose-600 text-white font-black rounded-xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Delete</button>
                 <button onClick={() => setShowDeleteProfileConfirm(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl uppercase text-[10px]">Close</button>
              </div>
           </div>
        </div>
      )}

      {/* MAIN UI */}
      <div className="no-print space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: MATRIX AND FIELD INFO BELOW IT */}
          <div className="lg:col-span-5 space-y-6">
             {/* CLASS SELECTION MATRIX */}
             <div className="bg-white dark:bg-slate-900 rounded-none border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 leading-none">
                     <LayoutGrid size={12}/> CLASS SELECTION MATRIX
                   </h3>
                   <div className="flex gap-1 no-print">
                      <button onClick={() => scrollHandler(matrixScrollRef, 'UP')} className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-600 shadow-sm"><ChevronUp size={14}/></button>
                      <button onClick={() => scrollHandler(matrixScrollRef, 'DOWN')} className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-600 shadow-sm"><ChevronDown size={14}/></button>
                   </div>
                </div>
                <div ref={matrixScrollRef} className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
                   <table className="w-full text-[8px] font-black uppercase">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                         <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="text-left p-2.5 text-slate-400">STD / WING</th>
                            {SECTIONS.map(s => <th key={s} className="p-2.5 text-center text-slate-400">SEC {s}</th>)}
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                         {WINGS.map(wing => (
                            <React.Fragment key={wing}>
                              <tr className="bg-slate-100/50 dark:bg-slate-800/50">
                                <td colSpan={5} className="p-2 text-[7px] font-black text-indigo-500 uppercase tracking-widest">{wing} WING</td>
                              </tr>
                              {CLASSES.map(std => (
                                 <tr key={`${std}-${wing}`} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                                    <td className="p-2 font-bold text-slate-600 dark:text-slate-400">STD {std}</td>
                                    {SECTIONS.map(sec => (
                                       <td key={sec} className="p-2 text-center">
                                          <input type="checkbox" checked={(selectedClasses[`${std} - ${wing}`] || []).includes(sec)} onChange={() => toggleClassSection(wing, std, sec)} className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-0" />
                                       </td>
                                    ))}
                                 </tr>
                              ))}
                            </React.Fragment>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>

             {/* FIELD INFORMATION (BELOW MATRIX) */}
             <div className={`bg-white dark:bg-slate-900 rounded-none border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col transition-all duration-300 ${!isModifying ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50 dark:border-slate-800">
                   <h3 className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] leading-none flex items-center gap-2">
                     <Layers size={12}/> FIELD INFORMATION
                   </h3>
                   <div className="flex gap-1 no-print">
                      <button onClick={() => scrollHandler(fieldScrollRef, 'UP')} className="p-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600"><ChevronUp size={12}/></button>
                      <button onClick={() => scrollHandler(fieldScrollRef, 'DOWN')} className="p-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600"><ChevronDown size={12}/></button>
                   </div>
                </div>
                <div ref={fieldScrollRef} className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1.5 max-h-64">
                   {filteredAvailableFields.map(field => (
                      <div key={field.key} onClick={() => setPendingFieldFromInfo(field.key)} className={`p-3 border transition-all cursor-pointer select-none ${pendingFieldFromInfo === field.key ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-indigo-200 text-slate-600 dark:text-slate-400'}`}>
                         <span className="text-[8px] font-black uppercase truncate block tracking-wider">{field.label}</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          {/* RIGHT COLUMN: PROFILE INFORMATION CREATE AND CONFIG */}
          <div className="lg:col-span-7 space-y-6">
             {/* PROFILE INFORMATION CREATE BOX */}
             <div className="bg-white dark:bg-slate-900 rounded-none border-2 border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col justify-center">
                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Terminal size={14}/> PROFILE INFORMATION CREATE
                </h3>
                <div className="space-y-4">
                   <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-700">
                      <select value={activeProfile} onChange={e => setActiveProfile(e.target.value)} className="w-full bg-transparent border-none font-bold text-xs outline-none uppercase text-slate-700 dark:text-white">
                         <option value="">SELECT REPORT PROFILE</option>
                         {profiles.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setShowProfileModal(true)} className="py-3.5 bg-indigo-600 text-white font-black rounded-none shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest active:scale-95 transition-all">
                         <Plus size={14} strokeWidth={3}/> ADD NEW PROFILE
                      </button>
                      <button 
                       disabled={!activeProfile}
                       onClick={() => setShowDeleteProfileConfirm(true)} 
                       className={`py-3.5 font-black rounded-none transition-all border text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 ${activeProfile ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white' : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'}`}
                      >
                         <Trash2 size={14}/> DELETE PROFILE
                      </button>
                   </div>
                </div>
             </div>

             {/* FIELD CONFIGURATION HUB */}
             <div className="flex gap-4 relative">
                
                {/* CENTER ENGINE / MOVE ENGINE */}
                <div className={`flex flex-col gap-4 items-center justify-center transition-all duration-300 min-w-[120px] ${!isModifying ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                   <button onClick={() => setShowNewLabelModal(true)} className="w-full py-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-100 dark:border-emerald-900 rounded-none font-black text-[8px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm">ADD LABEL</button>
                   <div className="relative w-full">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={10} />
                      <input type="text" placeholder="FIND..." value={fieldSearch} onChange={e => setFieldSearch(e.target.value.toUpperCase())} className="w-full pl-6 pr-2 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-none font-bold text-[8px] outline-none shadow-inner uppercase" />
                   </div>
                   <div className="flex flex-col gap-3">
                      <button onClick={handleMoveRight} disabled={!isModifying || !pendingFieldFromInfo} className={`w-12 h-12 rounded-none shadow-lg border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center ${isModifying && pendingFieldFromInfo ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-300'}`}><ChevronRight size={24} strokeWidth={2.5}/></button>
                      <button onClick={handleMoveLeft} disabled={!isModifying || !lastSelectedConfigKey} className={`w-12 h-12 rounded-none shadow-lg border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center ${isModifying && lastSelectedConfigKey ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-300'}`}><ChevronLeft size={24} strokeWidth={2.5}/></button>
                   </div>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                   <div className="bg-white dark:bg-slate-900 rounded-none border-2 border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden min-h-[450px]">
                      <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                         <div className="grid grid-cols-5 gap-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="col-span-1">FIELD NAME</span>
                            <span className="col-span-2">DISPLAY NAME</span>
                            <span className="text-center">WIDTH</span>
                            <span className="text-center">FONT</span>
                         </div>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                         {formattedSelectedClasses.length > 0 && (
                           <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl mb-4 animate-in slide-in-from-top-2">
                              <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-1">Matrix Selection:</p>
                              <p className="text-[9px] font-bold text-indigo-600 truncate">{formattedSelectedClasses.join(' | ')}</p>
                           </div>
                         )}

                         {reportConfigs.map((config) => (
                            <div key={config.key} onClick={() => setLastSelectedConfigKey(config.key)} className={`grid grid-cols-5 gap-4 items-center p-3 border transition-all cursor-pointer ${lastSelectedConfigKey === config.key ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                               <span className="text-[9px] font-black text-indigo-600 truncate">{config.key}</span>
                               <div className="col-span-2 relative group">
                                 <input type="text" value={config.displayName} disabled={!isModifying} onChange={e => updateConfig(config.key, { displayName: e.target.value.toUpperCase() })} className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none text-[10px] font-bold py-1 focus:border-indigo-500 uppercase" />
                                 <Edit2 size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100" />
                               </div>
                               <input type="number" value={config.width} disabled={!isModifying} onChange={e => updateConfig(config.key, { width: parseInt(e.target.value) || 0 })} className="bg-slate-100 dark:bg-slate-800 border-none px-2 py-1 text-center font-bold text-[10px] outline-none" />
                               <div className="flex items-center justify-center gap-2">
                                  <input type="number" value={config.fontSize} disabled={!isModifying} onChange={e => updateConfig(config.key, { fontSize: parseInt(e.target.value) || 0 })} className="w-8 bg-slate-100 dark:bg-slate-800 border-none px-1 py-1 text-center font-bold text-[9px]" />
                                  <button onClick={() => updateConfig(config.key, { isBold: !config.isBold })} className={`p-1.5 rounded-md transition-all ${config.isBold ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}><Type size={10} strokeWidth={4}/></button>
                               </div>
                            </div>
                         ))}
                         {reportConfigs.length === 0 && (
                           <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                              <Layers size={40} className="mb-4" />
                              <p className="text-[9px] font-black uppercase tracking-widest text-center">CONFIGURE REPORT FIELDS</p>
                           </div>
                         )}
                      </div>

                      <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 grid grid-cols-5 gap-2">
                         <button onClick={() => setIsModifying(!isModifying)} className={`py-2.5 border-2 rounded-none text-[7px] font-black uppercase shadow-sm transition-all flex items-center justify-center gap-1.5 ${isModifying ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-indigo-600'}`}>
                            {isModifying ? <Unlock size={10} /> : <Lock size={10} />} MODIFY
                         </button>
                         <button onClick={handleSaveProfile} className="py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-[7px] font-black uppercase text-indigo-600 shadow-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-1"><Save size={10}/> SAVE PROFILE</button>
                         <button onClick={handleGenerateReport} disabled={isGenerating} className="py-2.5 bg-indigo-600 text-white rounded-none text-[7px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-1">{isGenerating ? <RefreshCw size={10} className="animate-spin" /> : <FileDown size={10} />} GENERATE REPORT</button>
                         <button onClick={() => { setReportConfigs([]); setSelectedFields([]); setSelectedClasses({}); setIsModifying(false); }} className="py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-[7px] font-black uppercase text-slate-400 hover:text-rose-500 transition-all">RESET</button>
                         <button onClick={() => window.history.back()} className="py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-none text-[7px] font-black uppercase shadow-lg hover:bg-black transition-all">CLOSE</button>
                      </div>
                   </div>
                </div>

                {/* VERTICAL ORDER ARROWS */}
                <div className={`flex flex-col gap-3 justify-center no-print transition-opacity duration-300 ${!isModifying ? 'opacity-0 w-0 overflow-hidden pointer-events-none' : 'opacity-100'}`}>
                   <button onClick={() => moveConfig('UP')} className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-indigo-600 shadow-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"><ChevronUp size={24} strokeWidth={3}/></button>
                   <button onClick={() => moveConfig('DOWN')} className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-indigo-600 shadow-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"><ChevronDown size={24} strokeWidth={3}/></button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReports;
