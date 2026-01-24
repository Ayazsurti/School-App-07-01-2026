
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Student } from '../types';
import { 
  Search, LayoutGrid, Layers, Plus, Trash2, Settings, 
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, 
  Save, X, RefreshCw, Filter, Globe, Edit2, 
  CheckCircle2, ShieldCheck, Type, Terminal, ArrowLeftRight, MoveHorizontal, Lock, Unlock,
  PlusCircle, Tag, FileDown, School, ClipboardList, AlertTriangle,
  Loader2, Printer, Eye, Download, FileText, Check
} from 'lucide-react';
import { supabase, db, getErrorMessage } from '../supabase';
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
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileName, setActiveProfileName] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showDeleteProfileConfirm, setShowDeleteProfileConfirm] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  
  // Custom Field/Label states
  const [availableFields, setAvailableFields] = useState(INITIAL_AVAILABLE_FIELDS);
  const [showNewLabelModal, setShowNewLabelModal] = useState(false);
  const [newLabelData, setNewLabelData] = useState({ name: '', displayName: '' });

  // Selection states
  const [pendingFieldFromInfo, setPendingFieldFromInfo] = useState<string | null>(null);
  const [lastSelectedConfigKey, setLastSelectedConfigKey] = useState<string | null>(null);

  // Report Preview States
  const [reportData, setReportData] = useState<Student[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const matrixScrollRef = useRef<HTMLDivElement>(null);
  const fieldScrollRef = useRef<HTMLDivElement>(null);

  const fetchCloudData = async () => {
    try {
      const data = await db.reports.getProfiles();
      setProfiles(data || []);
    } catch (err) {
      console.error("Profiles Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-report-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'report_profiles' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (activeProfileName) {
      const profile = profiles.find(p => p.name === activeProfileName);
      if (profile) {
        setReportConfigs(profile.configs || []);
        setSelectedFields(profile.fields || []);
      }
    } else {
      setReportConfigs([]);
      setSelectedFields([]);
    }
  }, [activeProfileName, profiles]);

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
      const s = secs as string[];
      if (s.length > 0) active.push(`${cls} (${s.join(',')})`);
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

  const handleAddProfile = async () => {
    if (!newProfileName.trim()) return;
    const name = newProfileName.trim().toUpperCase();
    setIsSyncing(true);
    try {
      await db.reports.upsertProfile({ name, configs: [], fields: [] });
      await createAuditLog(user, 'CREATE', 'Reports', `Created report profile: ${name}`);
      setActiveProfileName(name);
      setShowProfileModal(false);
      setNewProfileName('');
    } catch (e: any) {
      alert("Failed to create profile: " + getErrorMessage(e));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!activeProfileName) return;
    setIsSyncing(true);
    try {
      await db.reports.upsertProfile({
        name: activeProfileName,
        configs: reportConfigs,
        fields: selectedFields
      });
      await createAuditLog(user, 'UPDATE', 'Reports', `Synced report profile: ${activeProfileName}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setIsModifying(false);
    } catch (e: any) {
      alert("Failed to sync profile: " + getErrorMessage(e));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (reportConfigs.length === 0) {
      alert("Select at least one field for the report.");
      return;
    }
    if (Object.keys(selectedClasses).length === 0) {
      alert("Please select at least one class/section from the Matrix.");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: students, error } = await supabase.from('students').select('*');
      if (error) throw error;

      const filtered = (students || []).filter(s => {
        const targetSecs = selectedClasses[s.class] || [];
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
      setShowPreviewModal(true);
      await createAuditLog(user, 'EXPORT', 'Reports', `Generated report with ${filtered.length} students.`);
    } catch (e) {
      alert("Failed to generate report.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    // Print the specific area
    window.print();
  };

  const filteredAvailableFields = useMemo(() => {
    return availableFields
      .filter(f => !selectedFields.includes(f.key))
      .filter(f => f.label.toLowerCase().includes(fieldSearch.toLowerCase()));
  }, [availableFields, selectedFields, fieldSearch]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-6 animate-in fade-in duration-500">
      
      {/* IMPROVED PRINT STYLES */}
      <style>{`
        @media print {
          body > :not(.report-print-area) { display: none !important; }
          #root { display: none !important; }
          .no-print { display: none !important; }
          
          .report-print-area {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 10mm !important;
            color: black !important;
          }
          
          .report-print-area * { visibility: visible !important; color: black !important; }
          @page { size: landscape; margin: 5mm; }
          
          .excel-table { border-collapse: collapse; width: 100%; border: 1.5px solid #000; }
          .excel-table th { border: 1.5px solid #000; padding: 6px; text-align: left; background: #f1f5f9 !important; -webkit-print-color-adjust: exact; font-weight: 900; }
          .excel-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
        }
      `}</style>

      {/* 
          OFF-SCREEN PRINT BUFFER
          Used for generating the PDF output
      */}
      <div className="report-print-area hidden">
         <div className="flex items-center justify-between border-b-4 border-slate-900 pb-8 mb-10">
            <div className="flex items-center gap-8">
               <div className="w-24 h-24 overflow-hidden rounded-2xl border-2 border-slate-200">
                  {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white font-black">LOGO</div>}
               </div>
               <div>
                  <h1 className="text-4xl font-black uppercase text-slate-900 leading-tight">{schoolName || 'INSTITUTIONAL DATABASE'}</h1>
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-600 mt-2">Official Student Registry Node-v8</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Generated: {new Date().toLocaleString('en-GB')}</p>
               </div>
            </div>
            <div className="text-right">
               <div className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase mb-2">Authenticated Data Record</div>
               <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Report Profile: {activeProfileName || 'Standard View'}</p>
            </div>
         </div>
         
         <table className="excel-table">
            <thead>
               <tr>
                  {reportConfigs.map(config => (
                     <th key={config.key} style={{ fontSize: `${config.fontSize}px`, width: `${config.width}px` }} className="uppercase font-black">
                        {config.displayName}
                     </th>
                  ))}
               </tr>
            </thead>
            <tbody>
               {reportData.map((student, idx) => (
                  <tr key={student.id + idx}>
                     {reportConfigs.map(config => (
                        <td key={config.key} style={{ fontSize: `${config.fontSize}px`, fontWeight: config.isBold ? 'bold' : 'normal' }} className="uppercase truncate">
                           {(student as any)[config.key] || '-'}
                        </td>
                     ))}
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      {/* PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/95 backdrop-blur-xl flex flex-col p-4 lg:p-10 animate-in fade-in duration-300 no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-7xl mx-auto h-full flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><FileText size={24}/></div>
                    <div>
                       <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Report PreviewTerminal</h3>
                       <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">{activeProfileName}</span>
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{reportData.length} Students Captured</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <button 
                      onClick={handleDownload} 
                      className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center gap-3 hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest"
                    >
                       <Download size={18} strokeWidth={3} /> Download PDF
                    </button>
                    <button onClick={() => setShowPreviewModal(false)} className="p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-all"><X size={28} /></button>
                 </div>
              </div>
              
              <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-slate-200/50 dark:bg-slate-950/50">
                 <div className="bg-white p-12 shadow-2xl min-h-[1000px] max-w-[297mm] mx-auto overflow-x-auto">
                    <div className="flex items-center justify-between border-b-4 border-slate-900 pb-8 mb-10 text-slate-900">
                        <div className="flex items-center gap-8">
                           <div className="w-20 h-20 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black">LOGO</div>
                           <div>
                              <h1 className="text-3xl font-black uppercase">{schoolName}</h1>
                              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-indigo-600 mt-1">Registry Export Terminal</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[8px] font-black uppercase text-slate-400">Security Hash: DIS-0x42-RES</p>
                           <p className="text-xs font-black text-slate-900">{new Date().toLocaleDateString('en-GB')}</p>
                        </div>
                    </div>
                    
                    <table className="excel-table text-slate-900">
                       <thead>
                          <tr>
                             {reportConfigs.map(config => (
                                <th key={config.key} style={{ fontSize: `${config.fontSize}px`, width: `${config.width}px` }} className="uppercase font-black">
                                   {config.displayName}
                                </th>
                             ))}
                          </tr>
                       </thead>
                       <tbody>
                          {reportData.map((student, idx) => (
                             <tr key={student.id + idx}>
                                {reportConfigs.map(config => (
                                   <td key={config.key} style={{ fontSize: `${config.fontSize}px`, fontWeight: config.isBold ? 'bold' : 'normal' }} className="uppercase truncate">
                                      {(student as any)[config.key] || '-'}
                                   </td>
                                ))}
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* NORMAL PAGE UI */}
      <div className="no-print space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
             <div className="bg-white dark:bg-slate-900 rounded-none border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 leading-none">
                     <LayoutGrid size={12}/> CLASS SELECTION MATRIX
                   </h3>
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

             <div className={`bg-white dark:bg-slate-900 rounded-none border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col transition-all duration-300 ${!isModifying ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50 dark:border-slate-800">
                   <h3 className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                     <Layers size={12}/> FIELD INFORMATION
                   </h3>
                </div>
                <div ref={fieldScrollRef} className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1.5 max-h-64">
                   {filteredAvailableFields.map(field => (
                      <div key={field.key} onClick={() => setPendingFieldFromInfo(field.key)} className={`p-3 border transition-all cursor-pointer select-none ${pendingFieldFromInfo === field.key ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400'}`}>
                         <span className="text-[8px] font-black uppercase truncate block tracking-wider">{field.label}</span>
                      </div>
                   ))}
                </div>
             </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
             <div className="bg-white dark:bg-slate-900 rounded-none border-2 border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col justify-center">
                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Terminal size={14}/> PROFILE INFORMATION CREATE
                </h3>
                <div className="space-y-4">
                   <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-700">
                      <select value={activeProfileName} onChange={e => setActiveProfileName(e.target.value)} className="w-full bg-transparent border-none font-bold text-xs outline-none uppercase text-slate-700 dark:text-white">
                         <option value="">SELECT REPORT PROFILE</option>
                         {profiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setShowProfileModal(true)} className="py-3.5 bg-indigo-600 text-white font-black rounded-none shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest transition-all">
                         <Plus size={14} strokeWidth={3}/> ADD NEW PROFILE
                      </button>
                      <button disabled={!activeProfileName} onClick={() => setShowDeleteProfileConfirm(true)} className={`py-3.5 font-black rounded-none transition-all border text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 ${activeProfileName ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}>
                         <Trash2 size={14}/> DELETE PROFILE
                      </button>
                   </div>
                </div>
             </div>

             <div className="flex gap-4 relative">
                <div className={`flex flex-col gap-4 items-center justify-center transition-all duration-300 min-w-[120px] ${!isModifying ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                   <button onClick={() => setShowNewLabelModal(true)} className="w-full py-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-100 rounded-none font-black text-[8px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm">ADD LABEL</button>
                   <div className="flex flex-col gap-3">
                      <button onClick={handleMoveRight} disabled={!isModifying || !pendingFieldFromInfo} className={`w-12 h-12 rounded-none shadow-lg border border-slate-100 transition-all flex items-center justify-center ${isModifying && pendingFieldFromInfo ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-300'}`}><ChevronRight size={24} strokeWidth={2.5}/></button>
                      <button onClick={handleMoveLeft} disabled={!isModifying || !lastSelectedConfigKey} className={`w-12 h-12 rounded-none shadow-lg border border-slate-100 transition-all flex items-center justify-center ${isModifying && lastSelectedConfigKey ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-300'}`}><ChevronLeft size={24} strokeWidth={2.5}/></button>
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
                         {reportConfigs.map((config) => (
                            <div key={config.key} onClick={() => setLastSelectedConfigKey(config.key)} className={`grid grid-cols-5 gap-4 items-center p-3 border transition-all cursor-pointer ${lastSelectedConfigKey === config.key ? 'border-indigo-500 bg-indigo-50/30' : 'border-transparent hover:bg-slate-50'}`}>
                               <span className="text-[9px] font-black text-indigo-600 truncate">{config.key}</span>
                               <div className="col-span-2">
                                 <input type="text" value={config.displayName} disabled={!isModifying} onChange={e => updateConfig(config.key, { displayName: e.target.value.toUpperCase() })} className="w-full bg-transparent border-b border-slate-200 outline-none text-[10px] font-bold py-1 focus:border-indigo-500 uppercase" />
                               </div>
                               <input type="number" value={config.width} disabled={!isModifying} onChange={e => updateConfig(config.key, { width: parseInt(e.target.value) || 0 })} className="bg-slate-100 dark:bg-slate-800 border-none px-2 py-1 text-center font-bold text-[10px] outline-none" />
                               <div className="flex items-center justify-center gap-2">
                                  <input type="number" value={config.fontSize} disabled={!isModifying} onChange={e => updateConfig(config.key, { fontSize: parseInt(e.target.value) || 0 })} className="w-8 bg-slate-100 dark:bg-slate-800 border-none px-1 py-1 text-center font-bold text-[9px]" />
                                  <button onClick={() => updateConfig(config.key, { isBold: !config.isBold })} className={`p-1.5 rounded-md transition-all ${config.isBold ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}><Type size={10}/></button>
                               </div>
                            </div>
                         ))}
                      </div>

                      <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 grid grid-cols-5 gap-2">
                         <button onClick={() => setIsModifying(!isModifying)} className={`py-2.5 border-2 rounded-none text-[7px] font-black uppercase shadow-sm transition-all flex items-center justify-center gap-1.5 ${isModifying ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-indigo-600'}`}>
                            {isModifying ? <Unlock size={10} /> : <Lock size={10} />} MODIFY
                         </button>
                         <button onClick={handleSaveProfile} disabled={!activeProfileName || isSyncing} className="py-2.5 bg-white dark:bg-slate-900 border border-slate-200 rounded-none text-[7px] font-black uppercase text-indigo-600 shadow-sm flex items-center justify-center gap-1">
                            {isSyncing ? <Loader2 size={10} className="animate-spin"/> : <Save size={10}/>} SYNC PROFILE
                         </button>
                         <button onClick={handleGenerateReport} disabled={isGenerating} className="py-2.5 bg-indigo-600 text-white rounded-none text-[7px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-1">{isGenerating ? <RefreshCw size={10} className="animate-spin" /> : <Eye size={10} />} PREVIEW REPORT</button>
                         <button onClick={() => window.history.back()} className="py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-none text-[7px] font-black uppercase shadow-lg">CLOSE</button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReports;
