
import React, { useState, useMemo, useRef } from 'react';
import { User } from '../types';
import { 
  Search, LayoutGrid, Layers, Plus, Trash2, Settings, 
  ChevronRight, ChevronLeft, ChevronUp, ChevronDown, 
  Save, X, RefreshCw, Filter, Globe, Edit2, 
  CheckCircle2, ShieldCheck, Type, Terminal, ArrowLeftRight, MoveHorizontal, Lock, Unlock
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

const AVAILABLE_FIELDS = [
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

const StudentReports: React.FC<StudentReportsProps> = ({ user }) => {
  const [selectedClasses, setSelectedClasses] = useState<Record<string, string[]>>({});
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [reportConfigs, setReportConfigs] = useState<ReportFieldConfig[]>([]);
  const [activeProfile, setActiveProfile] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  
  // Selection states for migration
  const [pendingFieldFromInfo, setPendingFieldFromInfo] = useState<string | null>(null);
  const [lastSelectedConfigKey, setLastSelectedConfigKey] = useState<string | null>(null);

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

  const handleMoveRight = () => {
    if (!isModifying || !pendingFieldFromInfo) return;
    const key = pendingFieldFromInfo;
    if (selectedFields.includes(key)) return;
    
    const fieldDef = AVAILABLE_FIELDS.find(f => f.key === key);
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

  const filteredAvailableFields = useMemo(() => {
    return AVAILABLE_FIELDS.filter(f => !selectedFields.includes(f.key));
  }, [selectedFields]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 lg:p-6 animate-in fade-in duration-500">
      
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8">
           <div className="bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-emerald-500">
              <CheckCircle2 size={24} />
              <p className="font-black text-xs uppercase tracking-widest">REPORT GENERATED</p>
           </div>
        </div>
      )}

      {/* HEADER ROW: COMPACT MATRIX & PROFILE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* LEFT: SMALL SCROLLABLE MATRIX BOX */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-none border-2 border-slate-200 dark:border-slate-800 p-6 shadow-sm">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 leading-none">
                <LayoutGrid size={12}/> CLASS SELECTION MATRIX
              </h3>
              <div className="flex gap-1 no-print">
                 <button onClick={() => scrollHandler(matrixScrollRef, 'UP')} className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-600 shadow-sm"><ChevronUp size={14}/></button>
                 <button onClick={() => scrollHandler(matrixScrollRef, 'DOWN')} className="p-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-indigo-600 shadow-sm"><ChevronDown size={14}/></button>
              </div>
           </div>
           <div ref={matrixScrollRef} className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
              <table className="w-full text-[8px] font-black uppercase">
                 <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                       <th className="text-left p-2.5 text-slate-400">STD / WING</th>
                       {SECTIONS.map(s => <th key={s} className="p-2.5 text-center text-slate-400">SEC {s}</th>)}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {WINGS.map(wing => (
                       CLASSES.map(std => (
                          <tr key={`${std}-${wing}`} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                             <td className="p-2 font-bold text-slate-600 dark:text-slate-400">STD {std} - {wing}</td>
                             {SECTIONS.map(sec => (
                                <td key={sec} className="p-2 text-center">
                                   <input 
                                     type="checkbox" 
                                     checked={(selectedClasses[`${std} - ${wing}`] || []).includes(sec)}
                                     onChange={() => toggleClassSection(wing, std, sec)}
                                     className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-0" 
                                   />
                                </td>
                             ))}
                          </tr>
                       ))
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {/* RIGHT: PROFILE INFORMATION CREATE BOX */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-none border-2 border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col justify-center">
           <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
             <Terminal size={14}/> PROFILE INFORMATION CREATE
           </h3>
           <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-700">
                 <select className="w-full bg-transparent border-none font-bold text-xs outline-none uppercase text-slate-700 dark:text-white">
                    <option>SELECT REPORT PROFILE</option>
                    <option>ANNUAL MASTER LIST</option>
                    <option>FEE PENDING SUMMARY</option>
                 </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <button className="py-3.5 bg-indigo-600 text-white font-black rounded-none shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest">
                    <Plus size={14} strokeWidth={3}/> ADD NEW PROFILE
                 </button>
                 <button className="py-3.5 bg-rose-50 text-rose-600 font-black rounded-none hover:bg-rose-600 hover:text-white transition-all border border-rose-100 dark:border-rose-900 text-[9px] uppercase tracking-widest">
                    <Trash2 size={14}/> DELETE PROFILE
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* LOWER SECTION: FIELD INFO, CENTER ENGINE, CONFIG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* FIELD INFORMATION BOX (Left) - SQUARE BOX, NO TICK BOX */}
        <div className={`lg:col-span-2 bg-white dark:bg-slate-900 rounded-none border-2 border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col transition-opacity duration-300 ${!isModifying ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
           <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50 dark:border-slate-800">
              <h3 className="text-[8px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] leading-none">
                FIELD INFO
              </h3>
              <div className="flex gap-1 no-print">
                 <button onClick={() => scrollHandler(fieldScrollRef, 'UP')} className="p-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600"><ChevronUp size={12}/></button>
                 <button onClick={() => scrollHandler(fieldScrollRef, 'DOWN')} className="p-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600"><ChevronDown size={12}/></button>
              </div>
           </div>
           <div ref={fieldScrollRef} className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1.5 max-h-60">
              {filteredAvailableFields.map(field => (
                 <div 
                  key={field.key} 
                  onClick={() => setPendingFieldFromInfo(field.key)}
                  className={`p-3 border transition-all cursor-pointer select-none ${pendingFieldFromInfo === field.key ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-indigo-200 text-slate-600 dark:text-slate-400'}`}
                 >
                    <span className="text-[8px] font-black uppercase truncate block">{field.label}</span>
                 </div>
              ))}
              {filteredAvailableFields.length === 0 && (
                <p className="text-[7px] font-bold text-slate-400 text-center py-10 uppercase italic">All fields mapped</p>
              )}
           </div>
        </div>

        {/* CENTER CONSOLE: MOVE ENGINE */}
        <div className="lg:col-span-2 flex flex-col gap-4 items-center justify-center">
           <button className="w-full py-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-100 dark:border-emerald-900 rounded-none font-black text-[8px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
              ADD NEW LABEL
           </button>
           
           <div className="w-full space-y-4">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                 <input 
                   type="text" 
                   placeholder="SEARCH..." 
                   value={fieldSearch}
                   onChange={e => setFieldSearch(e.target.value.toUpperCase())}
                   className="w-full pl-8 pr-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-none font-bold text-[8px] outline-none shadow-inner uppercase"
                 />
              </div>
              <div className="flex flex-col gap-3 items-center">
                 <button 
                  onClick={handleMoveRight}
                  disabled={!isModifying || !pendingFieldFromInfo}
                  className={`w-14 h-14 rounded-none shadow-lg border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center ${isModifying && pendingFieldFromInfo ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-300'}`}
                 >
                    <ChevronRight size={28} strokeWidth={2.5}/>
                 </button>
                 <button 
                  onClick={handleMoveLeft}
                  disabled={!isModifying || !lastSelectedConfigKey}
                  className={`w-14 h-14 rounded-none shadow-lg border border-slate-100 dark:border-slate-700 transition-all flex items-center justify-center ${isModifying && lastSelectedConfigKey ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-300'}`}
                 >
                    <ChevronLeft size={28} strokeWidth={2.5}/>
                 </button>
                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.3em]">MOVE ENGINE</p>
              </div>
           </div>
        </div>

        {/* FIELD CONFIGURATION BOX (Right) */}
        <div className="lg:col-span-8 flex gap-4 relative">
           <div className="flex-1 flex flex-col gap-4">
              {/* TOP ACTIONS */}
              <div className="flex gap-2">
                 <button className="flex-1 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-2 shadow-sm">
                    <Filter size={12}/> ADVANCE FILTER
                 </button>
                 <button className="flex-1 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-2 shadow-sm">
                    <Globe size={12}/> PAGE & LANG CONFIG
                 </button>
              </div>

              {/* MAIN CONFIG GRID BOX */}
              <div className="bg-white dark:bg-slate-900 rounded-none border-2 border-slate-200 dark:border-slate-800 flex-1 flex flex-col overflow-hidden min-h-[450px]">
                 <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-5 gap-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                       <span className="col-span-1">FIELD NAME</span>
                       <span className="col-span-2">DISPLAY NAME</span>
                       <span className="text-center">WIDTH</span>
                       <span className="text-center">FONT</span>
                    </div>
                 </div>
                 <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 transition-opacity duration-300 ${!isModifying ? 'opacity-50 pointer-events-none grayscale' : 'opacity-100'}`}>
                    {reportConfigs.map((config) => (
                       <div 
                        key={config.key} 
                        onClick={() => setLastSelectedConfigKey(config.key)}
                        className={`grid grid-cols-5 gap-4 items-center p-3 border transition-all cursor-pointer ${lastSelectedConfigKey === config.key ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                       >
                          <span className="text-[9px] font-black text-indigo-600 truncate">{config.key}</span>
                          <div className="col-span-2 relative group">
                            <input 
                              type="text" 
                              value={config.displayName} 
                              disabled={!isModifying}
                              onChange={e => updateConfig(config.key, { displayName: e.target.value.toUpperCase() })}
                              className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none text-[10px] font-bold py-1 focus:border-indigo-500 uppercase" 
                            />
                            <Edit2 size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover:opacity-100" />
                          </div>
                          <input 
                            type="number" 
                            value={config.width}
                            disabled={!isModifying}
                            onChange={e => updateConfig(config.key, { width: parseInt(e.target.value) || 0 })}
                            className="bg-slate-100 dark:bg-slate-800 border-none px-2 py-1 text-center font-bold text-[10px] outline-none" 
                          />
                          <div className="flex items-center justify-center gap-2">
                             <input 
                               type="number" 
                               value={config.fontSize}
                               disabled={!isModifying}
                               onChange={e => updateConfig(config.key, { fontSize: parseInt(e.target.value) || 0 })}
                               className="w-8 bg-slate-100 dark:bg-slate-800 border-none px-1 py-1 text-center font-bold text-[9px]" 
                             />
                             <button 
                               onClick={() => updateConfig(config.key, { isBold: !config.isBold })}
                               className={`p-1.5 rounded-md transition-all ${config.isBold ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
                             >
                                <Type size={10} strokeWidth={4}/>
                             </button>
                          </div>
                       </div>
                    ))}
                    {reportConfigs.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                         <Layers size={40} className="mb-4" />
                         <p className="text-[9px] font-black uppercase tracking-widest">MAP FIELDS TO BEGIN</p>
                      </div>
                    )}
                 </div>

                 {/* FOOTER TERMINAL ACTION ROW */}
                 <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 grid grid-cols-5 gap-2">
                    <button 
                      onClick={() => setIsModifying(!isModifying)}
                      className={`py-2.5 border-2 rounded-none text-[7px] font-black uppercase shadow-sm transition-all flex items-center justify-center gap-1.5 ${isModifying ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-indigo-600'}`}
                    >
                       {isModifying ? <Unlock size={10} /> : <Lock size={10} />} MODIFY
                    </button>
                    <button className="py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-[7px] font-black uppercase text-indigo-600 shadow-sm hover:bg-indigo-50 transition-all">SAVE PROFILE</button>
                    <button className="py-2.5 bg-indigo-600 text-white rounded-none text-[7px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-1">GENERATE REPORT</button>
                    <button onClick={() => { setReportConfigs([]); setSelectedFields([]); setSelectedClasses({}); setIsModifying(false); }} className="py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-[7px] font-black uppercase text-slate-400 hover:text-rose-500 transition-all">RESET</button>
                    <button onClick={() => window.history.back()} className="py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-none text-[7px] font-black uppercase shadow-lg hover:bg-black transition-all">CLOSE TAB</button>
                 </div>
              </div>
           </div>

           {/* EXTERNAL RIGHT SIDE ARROWS */}
           <div className={`flex flex-col gap-3 justify-center no-print transition-opacity duration-300 ${!isModifying ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
              <button 
                onClick={() => moveConfig('UP')}
                className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none text-indigo-600 shadow-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
              >
                 <ChevronUp size={24} strokeWidth={3}/>
              </button>
              <button 
                onClick={() => moveConfig('DOWN')}
                className="w-12 h-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none text-indigo-600 shadow-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center"
              >
                 <ChevronDown size={24} strokeWidth={3}/>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReports;
