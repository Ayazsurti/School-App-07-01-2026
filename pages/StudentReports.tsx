import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Student } from '../types';
import { 
  Search, LayoutGrid, Layers, Plus, Trash2, Settings, 
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, 
  Save, X, RefreshCw, Filter, Globe, Edit2, 
  CheckCircle2, ShieldCheck, Type, Terminal, ArrowLeftRight, MoveHorizontal, Lock, Unlock,
  PlusCircle, Tag, FileDown, School, ClipboardList, AlertTriangle,
  Loader2, Printer, Eye, Download, FileText, Check, Ruler, Box, Grid, ArrowUp, ArrowDown,
  Minus
} from 'lucide-react';
import { supabase, db, getErrorMessage } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';

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

const ModuleWrapper: React.FC<{ title: string; id: string; children: React.ReactNode; className?: string }> = ({ title, id, children, className = "" }) => (
  <div className={`relative bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md ${className}`}>
    <div className="absolute top-0 left-0 w-2 h-2 border-t-4 border-l-4 border-indigo-600"></div>
    <div className="absolute top-0 right-0 w-2 h-2 border-t-4 border-r-4 border-indigo-600"></div>
    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-4 border-l-4 border-indigo-600"></div>
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-4 border-r-4 border-indigo-600"></div>
    
    <div className="px-6 py-4 border-b-2 border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
      <div className="flex items-center gap-3">
        <span className="bg-indigo-600 text-white font-black text-[8px] px-2 py-1 rounded shadow-sm">{id}</span>
        <h3 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">{title}</h3>
      </div>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        <div className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
      </div>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

const StudentReports: React.FC<{ user: User; schoolLogo?: string | null; schoolName?: string; }> = ({ user, schoolLogo, schoolName }) => {
  const [selectedClasses, setSelectedClasses] = useState<Record<string, string[]>>({});
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [reportConfigs, setReportConfigs] = useState<ReportFieldConfig[]>([]);
  
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileName, setActiveProfileName] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showDeleteProfileConfirm, setShowDeleteProfileConfirm] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  
  const [availableFields, setAvailableFields] = useState(INITIAL_AVAILABLE_FIELDS);
  const [pendingFieldFromInfo, setPendingFieldFromInfo] = useState<string | null>(null);
  const [lastSelectedConfigKey, setLastSelectedConfigKey] = useState<string | null>(null);

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
    const channel = supabase.channel('realtime-report-profiles-sync')
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

  const handleMoveRight = () => {
    if (!isModifying || !pendingFieldFromInfo) return;
    const key = pendingFieldFromInfo;
    if (selectedFields.includes(key)) return;
    
    const fieldDef = availableFields.find(f => f.key === key);
    if (!fieldDef) return;
    
    setSelectedFields(prev => [...prev, key]);
    setReportConfigs(prev => [...prev, {
      key, displayName: fieldDef.label, width: 35, fontSize: 10, isBold: false
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

  const moveConfig = (index: number, direction: 'UP' | 'DOWN') => {
    if (!isModifying) return;
    const newConfigs = [...reportConfigs];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newConfigs.length) {
      [newConfigs[index], newConfigs[targetIndex]] = [newConfigs[targetIndex], newConfigs[index]];
      setReportConfigs(newConfigs);
      setSelectedFields(newConfigs.map(c => c.key));
    }
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
      await fetchCloudData();
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
      await fetchCloudData();
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
        const key = `${s.class}`; 
        const targetSecs = selectedClasses[key] || [];
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
    window.print();
  };

  const filteredAvailableFields = useMemo(() => {
    return availableFields
      .filter(f => !selectedFields.includes(f.key))
      .filter(f => f.label.toLowerCase().includes(fieldSearch.toLowerCase()));
  }, [availableFields, selectedFields, fieldSearch]);

  const formattedSelectedClasses = useMemo(() => {
    const active: string[] = [];
    Object.entries(selectedClasses).forEach(([cls, secs]) => {
      const s = secs as string[];
      if (s.length > 0) active.push(`${cls} (${s.join(',')})`);
    });
    return active;
  }, [selectedClasses]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-6 animate-in fade-in duration-500">
      
      {/* PRINT STYLES */}
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
            padding: 15mm !important;
            color: black !important;
          }
          
          .report-print-area * { visibility: visible !important; color: black !important; }
          @page { size: A4 landscape; margin: 0; }
          
          .report-table { 
            width: 100%; 
            border-collapse: collapse; 
            border: 1px solid #000; 
            table-layout: fixed;
          }
          .report-table th { 
            border: 1px solid #000; 
            padding: 8px 4px; 
            text-align: left; 
            background-color: #f8fafc !important; 
            -webkit-print-color-adjust: exact;
            font-weight: 900;
            text-transform: uppercase;
          }
          .report-table td { 
            border: 1px solid #000; 
            padding: 6px 4px; 
            text-align: left; 
            word-break: break-word;
          }
        }
      `}</style>

      {/* OFF-SCREEN PRINT BUFFER */}
      <div className="report-print-area hidden">
         <div className="flex items-center justify-between border-b-4 border-slate-900 pb-6">
            <div className="flex items-center gap-6">
               <div className="w-20 h-20 overflow-hidden rounded-xl border-2 border-slate-200">
                  {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white font-black text-xs">LOGO</div>}
               </div>
               <div>
                  <h1 className="text-2xl font-black uppercase text-slate-900 leading-tight">{schoolName || 'INSTITUTIONAL DATABASE'}</h1>
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mt-1">Date: {new Date().toLocaleDateString('en-GB')}</p>
               </div>
            </div>
            <div className="text-right">
               <div className="bg-slate-900 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase mb-1">Authenticated Record</div>
            </div>
         </div>
         
         <div className="mt-3 mb-8">
            <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">CLASS: {formattedSelectedClasses.join(' • ') || 'ALL CLASSES'}</p>
         </div>
         
         <table className="report-table">
            <thead>
               <tr>
                  {reportConfigs.map(config => (
                     <th key={config.key} style={{ fontSize: `${config.fontSize}px`, width: `${config.width}mm` }}>
                        {config.displayName}
                     </th>
                  ))}
               </tr>
            </thead>
            <tbody>
               {reportData.map((student, idx) => (
                  <tr key={student.id + idx}>
                     {reportConfigs.map(config => (
                        <td key={config.key} style={{ fontSize: `${config.fontSize * 0.9}px`, fontWeight: config.isBold ? 'bold' : 'normal' }}>
                           {(student as any)[config.key] || '-'}
                        </td>
                     ))}
                  </tr>
               ))}
            </tbody>
         </table>

         <div className="mt-12 flex justify-end opacity-40">
            <div className="text-center">
               <div className="w-40 border-b border-slate-900 mb-1"></div>
               <p className="text-[8px] font-black uppercase tracking-widest text-slate-900">Authenticated By</p>
            </div>
         </div>
      </div>

      {/* A4 SIZE PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[2000] bg-slate-950/85 backdrop-blur-md flex flex-col p-4 animate-in fade-in duration-300 no-print">
           {/* Top Control Bar */}
           <div className="w-full max-w-[210mm] mx-auto mb-4 flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><FileText size={20}/></div>
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">Document Preview</h3>
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1.5">{reportData.length} Records In Grid</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={handleDownload} 
                   className="px-6 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-xl flex items-center gap-2 hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest"
                 >
                    <Download size={14} strokeWidth={3} /> Download PDF
                 </button>
                 <button onClick={() => setShowPreviewModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-all"><X size={20} /></button>
              </div>
           </div>
           
           <div className="flex-1 overflow-auto custom-scrollbar p-2 flex justify-center">
              <div 
                className="bg-white shadow-2xl p-[15mm] mx-auto mb-10 animate-in zoom-in-95 origin-top" 
                style={{ width: '210mm', minHeight: '297mm', color: 'black' }}
              >
                 <div className="flex items-center justify-between border-b-4 border-slate-900 pb-6">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-slate-900 font-black text-[10px] overflow-hidden border-2 border-slate-100">
                          {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" /> : "LOGO"}
                       </div>
                       <div>
                          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">{schoolName || 'INSTITUTIONAL DATABASE'}</h1>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Generated On</p>
                       <p className="text-[10px] font-black text-slate-900 uppercase">{new Date().toLocaleDateString('en-GB')}</p>
                    </div>
                 </div>

                 <div className="mt-3 mb-8">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">CLASS: {formattedSelectedClasses.join(' • ') || 'ALL CLASSES'}</p>
                 </div>
                 
                 <table className="w-full border-collapse border border-slate-900" style={{ tableLayout: 'fixed' }}>
                    <thead>
                       <tr className="bg-slate-50">
                          {reportConfigs.map(config => (
                             <th key={config.key} className="border border-slate-900 p-2 text-left font-black uppercase" style={{ fontSize: `${config.fontSize * 0.8}px`, width: `${config.width}mm` }}>
                                {config.displayName}
                             </th>
                          ))}
                       </tr>
                    </thead>
                    <tbody>
                       {reportData.map((student, idx) => (
                          <tr key={student.id + idx} className="hover:bg-slate-50 transition-colors">
                             {reportConfigs.map(config => (
                                <td key={config.key} className="border border-slate-900 p-2 truncate" style={{ fontSize: `${config.fontSize * 0.75}px`, fontWeight: config.isBold ? 'bold' : 'normal', width: `${config.width}mm` }}>
                                   {(student as any)[config.key] || '-'}
                                </td>
                             ))}
                          </tr>
                       ))}
                    </tbody>
                 </table>

                 <div className="mt-12 flex justify-between items-end opacity-40">
                    <div className="flex-1"></div>
                    <div className="text-center">
                       <div className="w-32 border-b border-slate-900 mb-1"></div>
                       <p className="text-[8px] font-black uppercase tracking-widest text-slate-900">Authenticated By</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* NORMAL PAGE UI */}
      <div className="no-print space-y-8 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-8">
            <ModuleWrapper title="CLASS SELECTION MATRIX" id="MOD-01">
              <div ref={matrixScrollRef} className="max-h-[400px] overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
                <table className="w-full text-[8px] font-black uppercase border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left p-3 text-slate-400 border-r border-slate-200 dark:border-slate-700">STD / WING</th>
                      {SECTIONS.map(s => <th key={s} className="p-3 text-center text-slate-400">SEC {s}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {WINGS.map(wing => (
                      <React.Fragment key={wing}>
                        <tr className="bg-indigo-50/30 dark:bg-indigo-900/10">
                          <td colSpan={5} className="p-2.5 text-[7px] font-black text-indigo-500 uppercase tracking-widest border-b border-indigo-100 dark:border-indigo-900/50">{wing} WING</td>
                        </tr>
                        {CLASSES.map(std => (
                           <tr key={`${std}-${wing}`} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                              <td className="p-3 font-black text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">STD {std}</td>
                              {SECTIONS.map(sec => (
                                 <td key={sec} className="p-3 text-center">
                                    <div className="relative flex items-center justify-center">
                                      <input 
                                        type="checkbox" 
                                        checked={(selectedClasses[`${std} - ${wing}`] || []).includes(sec)} 
                                        onChange={() => toggleClassSection(wing, std, sec)} 
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer" 
                                      />
                                    </div>
                                 </td>
                              ))}
                           </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </ModuleWrapper>

            <ModuleWrapper title="FIELD REPOSITORY" id="MOD-02" className={!isModifying ? 'opacity-40 grayscale pointer-events-none' : ''}>
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input 
                  type="text" 
                  placeholder="FILTER REPOSITORY..." 
                  value={fieldSearch} 
                  onChange={e => setFieldSearch(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[9px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" 
                />
              </div>
              <div ref={fieldScrollRef} className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                 {filteredAvailableFields.map(field => (
                    <div 
                      key={field.key} 
                      onClick={() => setPendingFieldFromInfo(field.key)} 
                      className={`p-3 border-2 transition-all cursor-pointer select-none text-center rounded-xl flex flex-col justify-center gap-1 ${pendingFieldFromInfo === field.key ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg scale-[1.02]' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-200'}`}
                    >
                       <span className="text-[8px] font-black uppercase tracking-wider leading-none">{field.label}</span>
                    </div>
                 ))}
              </div>
              <div className="mt-6 flex gap-2">
                 <button onClick={handleMoveRight} disabled={!isModifying || !pendingFieldFromInfo} className={`flex-1 py-4 rounded-xl shadow-lg border transition-all flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest ${isModifying && pendingFieldFromInfo ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-100 text-slate-300 border-slate-100'}`}>
                    Inject Field <ChevronRight size={14} />
                 </button>
                 <button onClick={handleMoveLeft} disabled={!isModifying || !lastSelectedConfigKey} className={`flex-1 py-4 rounded-xl shadow-lg border transition-all flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest ${isModifying && lastSelectedConfigKey ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-100 text-slate-300 border-slate-100'}`}>
                    <ChevronLeft size={14} /> Revert Field
                 </button>
              </div>
            </ModuleWrapper>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 space-y-8">
            <ModuleWrapper title="PROFILE IDENTIFICATION CONTROL" id="MOD-03">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-6 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-inner relative group">
                  <label className="absolute -top-2 left-4 bg-white dark:bg-slate-900 px-2 text-[7px] font-black text-slate-400 uppercase tracking-widest">ACTIVE REGISTRY</label>
                  <select 
                    value={activeProfileName} 
                    onChange={e => setActiveProfileName(e.target.value)} 
                    className="w-full bg-transparent border-none font-black text-xs outline-none uppercase text-indigo-600 dark:text-indigo-400 cursor-pointer"
                  >
                     <option value="">SELECT SYSTEM PROFILE</option>
                     {profiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-6 flex gap-3">
                  <button onClick={() => setShowProfileModal(true)} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest transition-all">
                     <Plus size={16} strokeWidth={3}/> INITIALIZE PROFILE
                  </button>
                  <button disabled={!activeProfileName} onClick={() => setShowDeleteProfileConfirm(true)} className={`p-5 font-black rounded-2xl transition-all border shadow-sm ${activeProfileName ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white' : 'bg-slate-50 text-slate-200 cursor-not-allowed border-slate-50'}`}>
                     <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            </ModuleWrapper>

            <ModuleWrapper title="DATA ARCHITECTURE GRID" id="MOD-04">
              <div className="flex-1 flex flex-col min-h-[550px] bg-slate-50 dark:bg-slate-950/40 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 p-5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em]">
                   <div className="col-span-1 text-center">ORDER</div>
                   <div className="col-span-2 px-2 flex items-center gap-2"><Layers size={10}/> Node</div>
                   <div className="col-span-3 px-2 flex items-center gap-2"><Type size={10}/> Public Label</div>
                   <div className="col-span-3 text-center flex items-center justify-center gap-1"><Ruler size={10}/> Width (mm)</div>
                   <div className="col-span-2 text-center flex items-center justify-center gap-1"><Type size={10}/> Size</div>
                   <div className="col-span-1 text-center">Bold</div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                   {formattedSelectedClasses.length > 0 && (
                     <div className="p-4 bg-indigo-600 text-white rounded-2xl mb-6 shadow-lg border-2 border-indigo-400 flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-white/20 rounded-lg"><Grid size={14}/></div>
                           <div>
                              <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Selection Trace</p>
                              <p className="text-[10px] font-black truncate max-w-md">{formattedSelectedClasses.join(' • ')}</p>
                           </div>
                        </div>
                     </div>
                   )}

                   {reportConfigs.map((config, index) => (
                      <div key={config.key} onClick={() => setLastSelectedConfigKey(config.key)} className={`grid grid-cols-12 gap-2 items-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${lastSelectedConfigKey === config.key ? 'border-indigo-500 bg-white dark:bg-slate-800 shadow-xl' : 'border-transparent hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm'}`}>
                         <div className="col-span-1 flex flex-col items-center gap-1">
                            <button 
                              disabled={!isModifying || index === 0} 
                              onClick={(e) => { e.stopPropagation(); moveConfig(index, 'UP'); }}
                              className={`p-1 rounded-md transition-all ${isModifying && index !== 0 ? 'hover:bg-indigo-600 hover:text-white text-indigo-600' : 'text-indigo-600'}`}
                            >
                               <ChevronUp size={14} strokeWidth={3} />
                            </button>
                            <button 
                              disabled={!isModifying || index === reportConfigs.length - 1} 
                              onClick={(e) => { e.stopPropagation(); moveConfig(index, 'DOWN'); }}
                              className={`p-1 rounded-md transition-all ${isModifying && index !== reportConfigs.length - 1 ? 'hover:bg-indigo-600 hover:text-white text-indigo-600' : 'text-indigo-600'}`}
                            >
                               <ChevronDown size={14} strokeWidth={3} />
                            </button>
                         </div>
                         <div className="col-span-2 px-2">
                            <span className="text-[10px] font-black text-indigo-600 truncate block">{config.key}</span>
                         </div>
                         <div className="col-span-3 px-2">
                            <input type="text" value={config.displayName} disabled={!isModifying} onChange={e => updateConfig(config.key, { displayName: e.target.value.toUpperCase() })} className="w-full bg-transparent border-b-2 border-slate-100 dark:border-slate-700 outline-none text-[11px] font-black py-1 focus:border-indigo-500 uppercase text-slate-800 dark:text-white" />
                         </div>
                         <div className="col-span-3 flex items-center justify-center gap-2">
                            <button 
                              disabled={!isModifying} 
                              onClick={(e) => { e.stopPropagation(); updateConfig(config.key, { width: Math.max(1, config.width - 1) }) }}
                              className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-slate-400"
                            >
                               <Minus size={12} strokeWidth={3} />
                            </button>
                            <input type="number" value={config.width} disabled={!isModifying} onChange={e => updateConfig(config.key, { width: parseInt(e.target.value) || 0 })} className="w-12 bg-slate-50 dark:bg-slate-900 border-none rounded-lg py-2 text-center font-black text-xs outline-none shadow-inner no-spinner" />
                            <button 
                              disabled={!isModifying} 
                              onClick={(e) => { e.stopPropagation(); updateConfig(config.key, { width: config.width + 1 }) }}
                              className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-slate-400"
                            >
                               <Plus size={12} strokeWidth={3} />
                            </button>
                         </div>
                         <div className="col-span-2 flex items-center justify-center gap-2">
                            <button 
                              disabled={!isModifying} 
                              onClick={(e) => { e.stopPropagation(); updateConfig(config.key, { fontSize: Math.max(1, config.fontSize - 1) }) }}
                              className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-slate-400"
                            >
                               <Minus size={10} strokeWidth={3} />
                            </button>
                            <input type="number" value={config.fontSize} disabled={!isModifying} onChange={e => updateConfig(config.key, { fontSize: parseInt(e.target.value) || 0 })} className="w-10 bg-slate-50 dark:bg-slate-900 border-none rounded-lg py-2 text-center font-black text-[11px] outline-none shadow-inner no-spinner" />
                            <button 
                              disabled={!isModifying} 
                              onClick={(e) => { e.stopPropagation(); updateConfig(config.key, { fontSize: config.fontSize + 1 }) }}
                              className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-indigo-600 hover:text-white transition-all text-slate-400"
                            >
                               <Plus size={10} strokeWidth={3} />
                            </button>
                         </div>
                         <div className="col-span-1 flex justify-center">
                            <button onClick={() => updateConfig(config.key, { isBold: !config.isBold })} className={`p-2 rounded-lg transition-all ${config.isBold ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><Type size={14}/></button>
                         </div>
                      </div>
                   ))}

                   {reportConfigs.length === 0 && (
                      <div className="py-32 flex flex-col items-center justify-center opacity-20 text-center grayscale">
                         <Box size={64} className="mb-6" />
                         <p className="font-black text-xs uppercase tracking-[0.4em]">Grid Ready</p>
                      </div>
                   )}
                </div>

                <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-4">
                   <button onClick={() => setIsModifying(!isModifying)} className={`py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 border-2 ${isModifying ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900 text-indigo-600'}`}>
                      {isModifying ? <Unlock size={14} /> : <Lock size={14} />} {isModifying ? 'Lock Grid' : 'Modify Grid'}
                   </button>
                   <button onClick={handleSaveProfile} disabled={!activeProfileName || isSyncing} className="py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 shadow-sm flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all">
                      {isSyncing ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Sync Profile
                   </button>
                   <button onClick={handleGenerateReport} disabled={isGenerating} className="py-4 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95">
                      {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />} Preview Report
                   </button>
                   <button onClick={() => window.history.back()} className="py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">Exit Module</button>
                </div>
              </div>
            </ModuleWrapper>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-sm w-full shadow-2xl animate-in zoom-in-95 border-t-8 border-indigo-600">
              <div className="flex items-center gap-3 mb-8 justify-center">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600"><ClipboardList size={28}/></div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase text-center tracking-[0.3em] mb-4">New Profile Identifier</label>
                  <input 
                    type="text" 
                    value={newProfileName} 
                    onChange={e => setNewProfileName(e.target.value)} 
                    placeholder="E.G. ANNUAL_LEDGER" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-5 font-black text-center text-xs outline-none focus:ring-2 focus:ring-indigo-500 uppercase shadow-inner" 
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleAddProfile} disabled={isSyncing} className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSyncing ? <Loader2 size={16} className="animate-spin"/> : <><Check size={16}/> Initialize</>}
                  </button>
                  <button onClick={() => { setShowProfileModal(false); setNewProfileName(''); }} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Close</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {showDeleteProfileConfirm && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-tight">Purge Profile?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] leading-relaxed uppercase tracking-widest">Delete <b>{activeProfileName}</b> permanently from cloud storage?</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setShowDeleteProfileConfirm(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={async () => {
                    if (!activeProfileName) return;
                    setIsSyncing(true);
                    try {
                      await db.reports.deleteProfile(activeProfileName);
                      await createAuditLog(user, 'DELETE', 'Reports', `Deleted report profile: ${activeProfileName}`);
                      setActiveProfileName('');
                      setShowDeleteProfileConfirm(false);
                      await fetchCloudData();
                    } catch (e: any) {
                      alert("Delete failed: " + getErrorMessage(e));
                    } finally {
                      setIsSyncing(false);
                    }
                 }} disabled={isSyncing} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] disabled:opacity-50">
                   {isSyncing ? <Loader2 size={16} className="animate-spin mx-auto"/> : 'Confirm Purge'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentReports;