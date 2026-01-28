
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Student } from '../types';
import { 
  Search, LayoutGrid, Layers, Plus, Trash2, Settings, 
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, 
  Save, X, RefreshCw, Filter, Globe, Edit2, 
  CheckCircle2, ShieldCheck, Type, Terminal, ArrowLeftRight, MoveHorizontal, Lock, Unlock,
  PlusCircle, Tag, FileDown, School, ClipboardList, AlertTriangle,
  Loader2, Printer, Eye, Download, FileText, Check, Ruler, Box, Grid, ArrowUp, ArrowDown,
  Minus, FileType, Monitor, Smartphone, CheckSquare, Square
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

interface PageSettings {
  reportTitle: string;
  fieldHeight: string;
  marginLeft: string;
  marginRight: string;
  pageSize: 'A3' | 'A4' | 'LEGAL' | 'B5';
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  includeLeftStudent: boolean;
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
  <div className={`relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md ${className}`}>
    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-indigo-600"></div>
    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-indigo-600"></div>
    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-indigo-600"></div>
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-indigo-600"></div>
    
    <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
      <div className="flex items-center gap-3">
        <span className="bg-indigo-600 text-white font-black text-[9px] px-2 py-0.5 rounded shadow-sm">{id}</span>
        <h3 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-wider">{title}</h3>
      </div>
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        <div className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
      </div>
    </div>
    <div className="p-5">
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
  const [showPageConfigModal, setShowPageConfigModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showDeleteProfileConfirm, setShowDeleteProfileConfirm] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  
  const [availableFields, setAvailableFields] = useState(INITIAL_AVAILABLE_FIELDS);
  const [pendingFieldFromInfo, setPendingFieldFromInfo] = useState<string | null>(null);
  const [lastSelectedConfigKey, setLastSelectedConfigKey] = useState<string | null>(null);

  const [reportData, setReportData] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Load Page Settings from LocalStorage
  const [pageSettings, setPageSettings] = useState<PageSettings>(() => {
    const saved = localStorage.getItem('student_report_page_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved page settings", e);
      }
    }
    return {
      reportTitle: '',
      fieldHeight: '10',
      marginLeft: '10',
      marginRight: '10',
      pageSize: 'A4',
      orientation: 'LANDSCAPE',
      includeLeftStudent: false
    };
  });

  // Persist Page Settings to LocalStorage whenever they change
  useEffect(() => {
    localStorage.setItem('student_report_page_settings', JSON.stringify(pageSettings));
  }, [pageSettings]);

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
    const channel = supabase.channel('realtime-report-profiles-sync-v7')
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
      key, displayName: fieldDef.label, width: 40, fontSize: 10, isBold: false
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
      alert("Please select at least one field in the Data Architecture Grid.");
      return;
    }
    if (Object.keys(selectedClasses).length === 0) {
      alert("Please select target Standards/Sections in the Selection Matrix.");
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
        bloodGroup: s.blood_group,
        class: s.class,
        section: s.section,
        gender: s.gender,
        admissionDate: s.admission_date
      }));

      if (filtered.length === 0) {
        alert("No students found matching your selected Matrix criteria.");
        setIsGenerating(false);
        return;
      }

      setReportData(filtered);
      setShowPreviewModal(true);
      await createAuditLog(user, 'EXPORT', 'Reports', `Generated preview for ${filtered.length} students.`);
    } catch (e) {
      alert("Sync error during data synthesis.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) return;
    
    const headers = reportConfigs.map(c => c.displayName).join(',');
    const rows = reportData.map(student => {
      return reportConfigs.map(config => {
        const val = (student as any)[config.key] || '-';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${pageSettings.reportTitle || 'STUDENT_REPORT'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    createAuditLog(user, 'EXPORT', 'Reports', `Exported CSV archive with ${reportData.length} identities.`);
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

  const totalConfigWidth = useMemo(() => {
    return reportConfigs.reduce((acc, c) => acc + c.width, 0);
  }, [reportConfigs]);

  const pageLimit = pageSettings.pageSize === 'A4' ? (pageSettings.orientation === 'LANDSCAPE' ? 297 : 210) : (pageSettings.orientation === 'LANDSCAPE' ? 420 : 297);
  const usableWidth = pageLimit - (parseInt(pageSettings.marginLeft) || 10) - (parseInt(pageSettings.marginRight) || 10);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 p-4 lg:p-6 animate-in fade-in duration-500">
      
      {/* PRINT ENGINE STYLES */}
      <style>{`
        @media print {
          body > :not(.report-print-buffer) { display: none !important; }
          #root { display: none !important; }
          .no-print { display: none !important; }
          
          .report-print-buffer {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: ${pageSettings.marginLeft}mm ${pageSettings.marginRight}mm !important;
            color: black !important;
            min-height: 100vh;
          }
          
          .report-print-buffer * { visibility: visible !important; color: black !important; border-color: black !important; }
          
          @page { 
            size: ${pageSettings.pageSize} ${pageSettings.orientation.toLowerCase()}; 
            margin: 0; 
          }
          
          .print-table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            border: 1.5pt solid #000 !important;
            table-layout: fixed !important;
          }
          
          .print-table th { 
            border: 1pt solid #000 !important; 
            padding: 4pt 3pt !important; 
            text-align: left; 
            background-color: #f1f5f9 !important; 
            -webkit-print-color-adjust: exact;
            font-weight: 900;
            text-transform: uppercase;
            height: ${pageSettings.fieldHeight}mm;
            overflow: hidden;
          }
          
          .print-table td { 
            border: 1pt solid #000 !important; 
            padding: 4pt 3pt !important; 
            text-align: left; 
            word-break: break-word;
            height: ${pageSettings.fieldHeight}mm;
            overflow: hidden;
          }
        }
      `}</style>

      {/* OFF-SCREEN PRINT BUFFER */}
      <div className="report-print-buffer hidden">
         <div className="flex items-end justify-between border-b-4 border-slate-900 pb-6 mb-8">
            <div className="flex items-center gap-6">
               <div className="w-20 h-20 overflow-hidden rounded-2xl border-2 border-slate-200">
                  {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white font-black text-xs">LOGO</div>}
               </div>
               <div>
                  <h1 className="text-2xl font-black uppercase text-slate-900 leading-tight">{schoolName || 'DEEN-E-ISLAM SCHOOL'}</h1>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">Institutional Data Extract</p>
               </div>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Date: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
         </div>
         
         {pageSettings.reportTitle && (
            <div className="mb-6 text-center">
               <h2 className="text-lg font-black uppercase text-slate-800 tracking-[0.2em]">{pageSettings.reportTitle}</h2>
               <div className="w-32 h-1 bg-slate-900 mx-auto mt-2"></div>
            </div>
         )}
         
         <div className="mb-6">
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">NODES: {formattedSelectedClasses.join(' • ') || 'FULL DIRECTORY'}</p>
         </div>
         
         <table className="print-table">
            <colgroup>
               {reportConfigs.map(c => <col key={c.key} style={{ width: `${c.width}mm` }} />)}
            </colgroup>
            <thead>
               <tr>
                  {reportConfigs.map(config => (
                     <th key={config.key} style={{ fontSize: `${config.fontSize}px` }}>
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

         <div className="mt-12 flex justify-between items-end border-t border-slate-200 pt-8">
            <div className="text-center">
               <div className="w-32 h-0.5 bg-slate-400 mb-2 mx-auto opacity-50"></div>
               <p className="text-[8px] font-black uppercase text-slate-400">Class Teacher</p>
            </div>
            <div className="text-center">
               <ShieldCheck size={32} className="text-slate-200 mx-auto mb-2" />
               <p className="text-[7px] font-black uppercase text-slate-300">Digitally Verified Document</p>
            </div>
            <div className="text-center">
               <div className="w-32 h-0.5 bg-slate-900 mb-2 mx-auto"></div>
               <p className="text-[8px] font-black uppercase text-slate-900">Registrar Signature</p>
            </div>
         </div>
      </div>

      {/* MEDIUM MAIN UI */}
      <div className="no-print space-y-6 max-w-[1500px] mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-4 gap-4">
           <div>
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">Report Control Node <FileDown size={28} className="text-indigo-600" /></h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Data Synthesis & Institutional Export Protokol</p>
           </div>
           <div className="flex items-center gap-4">
              {isSyncing && <div className="flex items-center gap-3 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800"><RefreshCw size={14} className="animate-spin" /><span className="text-[10px] font-black uppercase tracking-widest">Cloud Neural Sync</span></div>}
              <button onClick={() => setShowPageConfigModal(true)} className="p-3 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"><Settings size={18}/> Page Setup</button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column - Filters and Repository */}
          <div className="lg:col-span-5 space-y-6">
            <ModuleWrapper title="SELECTION MATRIX" id="MOD-01">
              <div ref={matrixScrollRef} className="h-[320px] w-full overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl overflow-hidden">
                <table className="w-full text-[10px] font-black uppercase border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left p-3 text-slate-400 border-r border-slate-200 dark:border-slate-700">STD / WING NODE</th>
                      {SECTIONS.map(s => <th key={s} className="p-3 text-center text-slate-400">SEC {s}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {WINGS.map(wing => (
                      <React.Fragment key={wing}>
                        <tr className="bg-indigo-50/30 dark:bg-indigo-900/5">
                          <td colSpan={5} className="p-2 text-[8px] font-black text-indigo-500 uppercase tracking-[0.3em] border-b border-indigo-100/50 dark:border-indigo-900/30">{wing} WING REGISTRY</td>
                        </tr>
                        {CLASSES.map(std => (
                           <tr key={`${std}-${wing}`} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors">
                              <td className="p-3 font-black text-slate-600 dark:text-slate-400 border-r border-slate-100 dark:border-slate-800">STANDARD {std}</td>
                              {SECTIONS.map(sec => (
                                 <td key={sec} className="p-3 text-center">
                                    <input 
                                      type="checkbox" 
                                      checked={(selectedClasses[`${std} - ${wing}`] || []).includes(sec)} 
                                      onChange={() => toggleClassSection(wing, std, sec)} 
                                      className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer shadow-sm" 
                                    />
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

            <ModuleWrapper title="FIELD REPOSITORY" id="MOD-02" className={!isModifying ? 'opacity-50 grayscale pointer-events-none' : ''}>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  placeholder="FILTER VAULT FIELDS..." 
                  value={fieldSearch} 
                  onChange={e => setFieldSearch(e.target.value)} 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" 
                />
              </div>
              <div ref={fieldScrollRef} className="grid grid-cols-2 gap-2 h-[220px] w-full overflow-y-auto custom-scrollbar pr-2 bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl p-2">
                 {filteredAvailableFields.map(field => (
                    <div 
                      key={field.key} 
                      onClick={() => setPendingFieldFromInfo(field.key)} 
                      className={`p-4 border transition-all cursor-pointer select-none text-center rounded-xl flex flex-col justify-center gap-2 shadow-sm ${pendingFieldFromInfo === field.key ? 'bg-indigo-600 border-indigo-600 text-white transform scale-[0.98]' : 'bg-white dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-100'}`}
                    >
                       <span className="text-[9px] font-black uppercase tracking-widest leading-none">{field.label}</span>
                    </div>
                 ))}
              </div>
              <div className="mt-5 flex gap-3">
                 <button onClick={handleMoveRight} disabled={!isModifying || !pendingFieldFromInfo} className={`flex-1 py-4 rounded-2xl shadow-xl border transition-all flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest ${isModifying && pendingFieldFromInfo ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700' : 'bg-slate-100 text-slate-300 border-slate-100'}`}>
                    Inject Node <ChevronRight size={14} />
                 </button>
                 <button onClick={handleMoveLeft} disabled={!isModifying || !lastSelectedConfigKey} className={`flex-1 py-4 rounded-2xl shadow-xl border transition-all flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest ${isModifying && lastSelectedConfigKey ? 'bg-slate-800 text-white border-slate-600 hover:bg-slate-900' : 'bg-slate-100 text-slate-300 border-slate-100'}`}>
                    <ChevronLeft size={14} /> Revert Node
                 </button>
              </div>
            </ModuleWrapper>
          </div>

          {/* Right Column - Architecture and Profiles */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
               <div className="md:col-span-8">
                  <ModuleWrapper title="IDENTITY PROFILES" id="MOD-03">
                    <div className="flex gap-3 items-center">
                      <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner relative">
                        <select 
                          value={activeProfileName} 
                          onChange={e => setActiveProfileName(e.target.value)} 
                          className="w-full bg-transparent border-none font-black text-[11px] outline-none uppercase text-indigo-600 dark:text-indigo-400 cursor-pointer appearance-none"
                        >
                           <option value="">SELECT SYSTEM PROFILE NODE</option>
                           {profiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <button onClick={() => setShowProfileModal(true)} className="px-6 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest transition-all active:scale-95">
                         <Plus size={16} strokeWidth={3}/> NEW
                      </button>
                      <button disabled={!activeProfileName} onClick={() => setShowDeleteProfileConfirm(true)} className={`p-4 font-black rounded-2xl transition-all border ${activeProfileName ? 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white shadow-lg' : 'bg-slate-50 text-slate-200 border-slate-50'}`}>
                         <Trash2 size={18}/>
                      </button>
                    </div>
                  </ModuleWrapper>
               </div>
               <div className="md:col-span-4">
                  <ModuleWrapper title="TERMINAL STATE" id="MOD-05">
                     <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center ${activeProfileName ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-100 text-slate-300'}`}><Monitor size={20}/></div>
                        <div>
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">ACTIVE NODE</p>
                           <p className="text-xs font-black text-indigo-600 uppercase mt-1.5 truncate max-w-[100px]">{activeProfileName || 'NEUTRAL'}</p>
                        </div>
                     </div>
                  </ModuleWrapper>
               </div>
            </div>

            <ModuleWrapper title="DATA ARCHITECTURE GRID" id="MOD-04">
              <div className="flex flex-col min-h-[450px] bg-white dark:bg-slate-950/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-inner">
                <div className="grid grid-cols-12 gap-2 p-4 bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                   <div className="col-span-1 text-center">ORDER</div>
                   <div className="col-span-2 px-2">ID</div>
                   <div className="col-span-3 px-2">DISPLAY LABEL</div>
                   <div className="col-span-3 text-center">WIDTH(mm)</div>
                   <div className="col-span-2 text-center">SIZE</div>
                   <div className="col-span-1 text-center">B</div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-2 h-[350px]">
                   {reportConfigs.map((config, index) => (
                      <div key={config.key} onClick={() => setLastSelectedConfigKey(config.key)} className={`grid grid-cols-12 gap-2 items-center p-4 rounded-2xl border transition-all cursor-pointer ${lastSelectedConfigKey === config.key ? 'border-indigo-500 bg-white dark:bg-slate-800 shadow-xl scale-[1.01]' : 'border-transparent hover:bg-white dark:hover:bg-slate-900'}`}>
                         <div className="col-span-1 flex flex-col items-center">
                            <button disabled={!isModifying || index === 0} onClick={(e) => { e.stopPropagation(); moveConfig(index, 'UP'); }} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><ChevronUp size={14} strokeWidth={3} /></button>
                            <button disabled={!isModifying || index === reportConfigs.length - 1} onClick={(e) => { e.stopPropagation(); moveConfig(index, 'DOWN'); }} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><ChevronDown size={14} strokeWidth={3} /></button>
                         </div>
                         <div className="col-span-2 px-2">
                            <span className="text-[10px] font-black text-indigo-600 truncate block uppercase">{config.key}</span>
                         </div>
                         <div className="col-span-3 px-2">
                            <input type="text" value={config.displayName} disabled={!isModifying} onChange={e => updateConfig(config.key, { displayName: e.target.value.toUpperCase() })} className="w-full bg-transparent border-b-2 border-slate-100 dark:border-slate-700 outline-none text-[11px] font-black py-1 focus:border-indigo-500 uppercase text-slate-800 dark:text-white" />
                         </div>
                         <div className="col-span-3 flex items-center justify-center gap-3">
                            <button disabled={!isModifying} onClick={(e) => { e.stopPropagation(); updateConfig(config.key, { width: Math.max(1, config.width - 2) }) }} className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-slate-400"><Minus size={12} strokeWidth={4} /></button>
                            <span className="text-[11px] font-black w-10 text-center">{config.width}mm</span>
                            <button disabled={!isModifying} onClick={(e) => { e.stopPropagation(); updateConfig(config.key, { width: config.width + 2 }) }} className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-slate-400"><Plus size={12} strokeWidth={4} /></button>
                         </div>
                         <div className="col-span-2 flex items-center justify-center gap-3">
                            <button disabled={!isModifying} onClick={(e) => { e.stopPropagation(); updateConfig(config.key, { fontSize: Math.max(1, config.fontSize - 1) }) }} className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-slate-400"><Minus size={12} strokeWidth={4} /></button>
                            <span className="text-[11px] font-black w-6 text-center">{config.fontSize}</span>
                            <button disabled={!isModifying} onClick={(e) => { e.stopPropagation(); updateConfig(config.key, { fontSize: config.fontSize + 1 }) }} className="w-7 h-7 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-slate-400"><Plus size={12} strokeWidth={4} /></button>
                         </div>
                         <div className="col-span-1 flex justify-center">
                            <button disabled={!isModifying} onClick={() => updateConfig(config.key, { isBold: !config.isBold })} className={`p-2 rounded-xl transition-all ${config.isBold ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-200 hover:bg-slate-50'}`}><Type size={14}/></button>
                         </div>
                      </div>
                   ))}

                   {reportConfigs.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-10 text-center animate-pulse">
                         <Box size={80} className="mb-4" />
                         <p className="font-black text-xs uppercase tracking-[0.5em]">EMPTY GRID ARCHITECTURE</p>
                      </div>
                   )}
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                   <div className="flex justify-between items-center mb-6 px-2">
                      <div className="flex items-center gap-3">
                         <Ruler size={18} className="text-indigo-600" />
                         <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                           Total Grid Width: <span className={totalConfigWidth > usableWidth ? 'text-rose-500 underline decoration-double' : 'text-indigo-600'}>{totalConfigWidth}mm</span> / {usableWidth}mm available
                         </p>
                      </div>
                      {totalConfigWidth > usableWidth && (
                         <div className="flex items-center gap-2 text-rose-500 animate-pulse">
                            <AlertTriangle size={14}/>
                            <span className="text-[8px] font-black uppercase">Content Overflow Detected</span>
                         </div>
                      )}
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button onClick={() => setIsModifying(!isModifying)} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 border ${isModifying ? 'bg-indigo-600 border-indigo-600 text-white animate-pulse' : 'bg-white dark:bg-slate-900 border-indigo-100 dark:border-indigo-900 text-indigo-600 hover:bg-indigo-50'}`}>
                         {isModifying ? <Unlock size={16} /> : <Lock size={16} />} {isModifying ? 'LOCK CONFIG' : 'MODIFY GRID'}
                      </button>
                      <button onClick={handleSaveProfile} disabled={!activeProfileName || isSyncing} className="py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 shadow-md flex items-center justify-center gap-3 hover:bg-indigo-50 transition-all disabled:opacity-50">
                         {isSyncing ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} SYNC PROFILE
                      </button>
                      <button onClick={handleGenerateReport} disabled={isGenerating} className="py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
                         {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} GENERATE PREVIEW
                      </button>
                   </div>
                </div>
              </div>
            </ModuleWrapper>
          </div>
        </div>
      </div>

      {/* PAGE CONFIGURATION MODAL */}
      {showPageConfigModal && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl w-[440px] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <FileType size={24} className="text-indigo-600"/>
                    <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">LAYOUT ARCHITECTURE</h3>
                 </div>
                 <button onClick={() => setShowPageConfigModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              
              <div className="p-10 space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Main Report Heading</label>
                    <input type="text" value={pageSettings.reportTitle} onChange={e => setPageSettings({...pageSettings, reportTitle: e.target.value.toUpperCase()})} placeholder="E.G. ANNUAL FEE SUMMARY" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Row Height (mm)</label>
                       <input type="number" value={pageSettings.fieldHeight} onChange={e => setPageSettings({...pageSettings, fieldHeight: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-black outline-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sheet Format</label>
                       <select value={pageSettings.pageSize} onChange={e => setPageSettings({...pageSettings, pageSize: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-4 text-xs font-black outline-none appearance-none cursor-pointer">
                          <option>A4</option><option>A3</option><option>LEGAL</option><option>B5</option>
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Margin Left (mm)</label>
                       <input type="number" value={pageSettings.marginLeft} onChange={e => setPageSettings({...pageSettings, marginLeft: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-xs font-black outline-none shadow-inner" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Orientation</label>
                       <select value={pageSettings.orientation} onChange={e => setPageSettings({...pageSettings, orientation: e.target.value as any})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-4 text-xs font-black outline-none appearance-none cursor-pointer">
                          <option value="PORTRAIT">PORTRAIT</option>
                          <option value="LANDSCAPE">LANDSCAPE</option>
                       </select>
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                 <button onClick={() => setShowPageConfigModal(false)} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all">COMMIT CHANGES</button>
                 <button onClick={() => { 
                   setShowPageConfigModal(false); 
                 }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] hover:bg-slate-200 transition-all">CLOSE</button>
              </div>
           </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 lg:p-10 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300 no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[4rem] w-full max-w-7xl h-full flex flex-col shadow-2xl border border-white/5 overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/30"><FileText size={28}/></div>
                    <div>
                       <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">LIVE EXPORT PREVIEW</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{reportData.length} Student Identities Sequenced • {pageSettings.pageSize} {pageSettings.orientation}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <button onClick={handleExportCSV} className="px-6 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all flex items-center gap-3 active:scale-95"><Download size={20}/> Download Data (CSV)</button>
                    <button onClick={handlePrint} className="px-8 py-4 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95"><Printer size={20}/> Print Report (PDF)</button>
                    <button onClick={() => setShowPreviewModal(false)} className="p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 transition-all"><X size={28} /></button>
                 </div>
              </div>
              
              <div className="flex-1 overflow-auto p-12 bg-slate-200 dark:bg-slate-950 flex justify-center">
                 <div 
                    className="bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] p-0 transform scale-90 origin-top transition-transform" 
                    style={{ 
                       width: pageSettings.orientation === 'LANDSCAPE' ? (pageSettings.pageSize === 'A3' ? '420mm' : '297mm') : (pageSettings.pageSize === 'A3' ? '297mm' : '210mm'),
                       minHeight: pageSettings.orientation === 'LANDSCAPE' ? (pageSettings.pageSize === 'A3' ? '297mm' : '210mm') : (pageSettings.pageSize === 'A3' ? '420mm' : '297mm'),
                       padding: `${pageSettings.marginLeft}mm ${pageSettings.marginRight}mm`
                    }}
                 >
                    {/* SIMULATED HEADER */}
                    <div className="flex items-end justify-between border-b-4 border-slate-900 pb-8 mb-10 mt-10">
                       <div className="flex items-center gap-8">
                          <div className="w-24 h-24 bg-slate-100 rounded-3xl border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                             {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" /> : <Box size={32} className="text-slate-300"/>}
                          </div>
                          <div>
                             <h1 className="text-3xl font-black text-slate-900 uppercase leading-none">{schoolName}</h1>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">Institutional Resource Distribution</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Date: {new Date().toLocaleDateString('en-GB')}</p>
                       </div>
                    </div>

                    {pageSettings.reportTitle && (
                       <div className="mb-10 text-center">
                          <h2 className="text-xl font-black uppercase tracking-[0.3em] text-slate-800">{pageSettings.reportTitle}</h2>
                          <div className="w-48 h-1.5 bg-indigo-600 mx-auto mt-3 rounded-full shadow-sm"></div>
                       </div>
                    )}

                    <div className="overflow-x-visible">
                      <table className="border-collapse border-[1.5pt] border-slate-900 w-full" style={{ tableLayout: 'fixed' }}>
                         <colgroup>
                            {reportConfigs.map(c => <col key={c.key} style={{ width: `${c.width}mm` }} />)}
                         </colgroup>
                         <thead>
                            <tr className="bg-slate-100 border-b border-slate-900">
                               {reportConfigs.map(config => (
                                  <th key={config.key} className="border-r border-slate-900 p-3 text-left uppercase overflow-hidden" style={{ fontSize: `${config.fontSize}px` }}>
                                     {config.displayName}
                                  </th>
                               ))}
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-300">
                            {reportData.map((student, idx) => (
                               <tr key={student.id + idx} className="border-b border-slate-900">
                                  {reportConfigs.map(config => (
                                     <td key={config.key} className="border-r border-slate-900 p-3 text-left overflow-hidden" style={{ fontSize: `${config.fontSize * 0.9}px`, fontWeight: config.isBold ? 'bold' : 'normal', height: `${pageSettings.fieldHeight}mm` }}>
                                        {(student as any)[config.key] || '-'}
                                     </td>
                                  ))}
                               </tr>
                            ))}
                         </tbody>
                      </table>
                    </div>
                    
                    <div className="mt-20 flex justify-between px-10 pb-20">
                       <div className="text-center opacity-30">
                          <div className="w-40 h-px bg-slate-900 mb-2"></div>
                          <p className="text-[9px] font-black uppercase tracking-widest">Office Signature</p>
                       </div>
                       <div className="text-center">
                          <div className="w-40 h-px bg-slate-900 mb-2"></div>
                          <p className="text-[9px] font-black uppercase tracking-widest">Principal / Authorized Sync</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* PROFILE INITIALIZER MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 no-print">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 w-[320px] shadow-2xl animate-in zoom-in-95 border-t-4 border-indigo-600">
              <div className="space-y-4">
                <div className="text-center">
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">NEW PROFILE TOKEN</label>
                  <input 
                    type="text" 
                    value={newProfileName} 
                    onChange={e => setNewProfileName(e.target.value)} 
                    placeholder="E.G. CLASS_LIST_2026" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 font-black text-center text-[10px] outline-none focus:ring-1 focus:ring-indigo-500 uppercase shadow-inner" 
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddProfile} disabled={isSyncing} className="flex-[2] py-3 bg-indigo-600 text-white font-black rounded-xl text-[8px] uppercase tracking-widest shadow-md active:scale-95 disabled:opacity-50">
                    {isSyncing ? <Loader2 size={12} className="animate-spin mx-auto"/> : 'INITIALIZE'}
                  </button>
                  <button onClick={() => { setShowProfileModal(false); setNewProfileName(''); }} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-xl text-[8px] uppercase tracking-widest hover:bg-slate-200 transition-all">CLOSE</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {showSuccess && (
        <div className="fixed bottom-10 right-10 z-[2500] animate-in slide-in-from-bottom-6 duration-500 no-print">
           <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-emerald-500 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <span className="font-black text-xs uppercase tracking-widest">Protocol Sync Successful</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default StudentReports;
