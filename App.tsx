
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, Bell, Search, ChevronRight, User as UserIcon, Users, AlertTriangle, Camera, Upload, Trash2, Settings, Power, Image as ImageIcon, ShieldCheck, History, PencilRuler, UtensilsCrossed, MessageSquareQuote, Gem, Sparkles, Trophy, Gift, Star, Sun, Moon, Settings2, Eye, EyeOff, CheckCircle2, ChevronUp, ChevronDown, GripVertical, Plus, Edit2, Cloud, School, Loader2, RefreshCw, Video, FileText, BookOpen, SwitchCamera, StopCircle, Activity, Check, LogOut as OutIcon, GripHorizontal, LayoutTemplate, RotateCcw, ClipboardList, GraduationCap, Smartphone, MapPin, Fingerprint, Info, Phone, UserCircle, Heart, Shield, Hash, UserMinus, Palette, Terminal, Cpu, Layers, MonitorPlay, Zap, Megaphone, ArrowUpRight, Database, Download, CloudUpload, HardDriveDownload, Timer, ShieldAlert, Clock, FolderOpen, PowerOff, Save, Move, Wifi, WifiOff
} from 'lucide-react';
import { User, UserRole, DisplaySettings, Student } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import TeacherAttendance from './pages/TeacherAttendance';
import MarksEntry from './pages/MarksEntry';
import MarksSetup from './pages/MarksSetup';
import MarksheetGenerator from './pages/MarksheetGenerator';
import FeesManager from './pages/FeesManager';
import FeesManagement from './pages/FeesManagement';
import Homework from './pages/Homework';
import FoodChart from './pages/FoodChart';
import SMSPanel from './pages/SMSPanel';
import NoticeBoard from './pages/NoticeBoard';
import MediaGallery from './pages/MediaGallery';
import Timetable from './pages/Timetable';
import VideoGallery from './pages/VideoGallery';
import StudentsManager from './pages/StudentsManager';
import AdmissionCancellation from './pages/AdmissionCancellation';
import TeachersManager from './pages/TeachersManager';
import ClassManagement from './pages/ClassManagement';
import GradingSystem from './pages/GradingSystem';
import FeeSetup from './pages/FeeSetup';
import StudentwiseFee from './pages/StudentwiseFee';
import ReceiptSetup from './pages/ReceiptSetup';
import GeneralReceipt from './pages/GeneralReceipt';
import FeeSearch from './pages/FeeSearch';
import IdCardGenerator from './pages/IdCardGenerator';
import IdCardDesigner from './pages/IdCardDesigner';
import AuditLog from './pages/AuditLog';
import Curriculum from './pages/Curriculum';
import SchoolSettings from './pages/SchoolSettings';
import DisplayConfigure from './pages/DisplayConfigure';
import StudentReports from './pages/StudentReports';
import SlideshowManager from './pages/SlideshowManager';
import { APP_NAME as DEFAULT_APP_NAME, NAVIGATION } from './constants';
import { db, supabase, getErrorMessage } from './supabase';
import { createAuditLog } from './utils/auditLogger';
import JSZip from 'jszip';

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  fontFamily: "'Inter', sans-serif", fontColor: '#0f172a', accentColor: '#4f46e5', backgroundImage: null, bgOpacity: 10, cardOpacity: 90, glassBlur: 12
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('school_app_user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return JSON.parse(saved);
    } catch (e) { return null; }
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>(DEFAULT_APP_NAME);
  const [schoolAddress, setSchoolAddress] = useState<string>('');
  const [schoolEmail, setSchoolEmail] = useState<string>('');
  const [schoolContact, setSchoolContact] = useState<string>('');
  const [cloudSettings, setCloudSettings] = useState<any>({});
  const [isCloudHealthy, setIsCloudHealthy] = useState<boolean>(true);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const fetchGlobalSettings = async (retryCount = 0) => {
    try {
      const settings = await db.settings.getAll();
      setCloudSettings(settings);
      setIsCloudHealthy(true);
      setLastSyncError(null);

      if (settings.school_logo) setSchoolLogo(settings.school_logo);
      if (settings.school_name) setSchoolName(settings.school_name);
      if (settings.school_address) setSchoolAddress(settings.school_address);
      if (settings.school_email) setSchoolEmail(settings.school_email);
      if (settings.school_contact) setSchoolContact(settings.school_contact);
      
      if (settings.global_display_settings) {
        try {
          const cloudDisplay = JSON.parse(settings.global_display_settings);
          setDisplaySettings(cloudDisplay);
        } catch (e) { console.warn("Invalid cloud display settings"); }
      }
    } catch (err: any) { 
      const msg = getErrorMessage(err);
      console.warn("Branding sync issue:", msg); 
      setIsCloudHealthy(false);
      setLastSyncError(msg);
      
      if (retryCount < 3) {
        setTimeout(() => fetchGlobalSettings(retryCount + 1), 5000);
      }
    }
  };

  useEffect(() => {
    fetchGlobalSettings();
    const channel = supabase.channel('settings-global-sync-v13')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchGlobalSettings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleUpdateDisplay = async (newSettings: DisplaySettings) => {
    setDisplaySettings(newSettings);
    await db.settings.update('global_display_settings', JSON.stringify(newSettings));
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('school_app_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('school_app_user');
  };

  const brandingData = { name: schoolName, logo: schoolLogo, address: schoolAddress, email: schoolEmail, contact: schoolContact };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <style>
        {`
          :root { --custom-font: ${displaySettings.fontFamily}; --custom-text: ${displaySettings.fontColor}; --accent-color: ${displaySettings.accentColor}; }
          body { font-family: var(--custom-font) !important; }
          .bg-custom-overlay { background-image: ${displaySettings.backgroundImage ? `url(${displaySettings.backgroundImage})` : 'none'}; background-size: cover; background-position: center; background-attachment: fixed; }
          .bg-dim-layer { background-color: ${darkMode ? '#020617' : '#f8fafc'}; opacity: ${displaySettings.bgOpacity / 100}; }
          .glass-card { background-color: ${darkMode ? `rgba(15, 23, 42, ${displaySettings.cardOpacity / 100})` : `rgba(255, 255, 255, ${displaySettings.cardOpacity / 100})`} !important; backdrop-filter: blur(${displaySettings.glassBlur}px) !important; -webkit-backdrop-filter: blur(${displaySettings.glassBlur}px) !important; }
          .nav-node-row:hover { transform: translateX(8px); border-color: var(--hover-color); box-shadow: -4px 0 0 0 var(--hover-color), 0 10px 20px -5px rgba(0,0,0,0.1); }
          .sidebar-customize-btn:hover { background: var(--accent-color); color: white; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.4); }
          .drag-active { opacity: 0.5; scale: 0.95; border: 2px dashed var(--accent-color) !important; }
          .drag-over { border-top: 4px solid var(--accent-color) !important; }
        `}
      </style>
      <HashRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} schoolLogo={schoolLogo} schoolName={schoolName} /> : <Navigate to="/" />} />
          <Route path="/*" element={user ? <Layout user={user} cloudHealthy={isCloudHealthy} cloudError={lastSyncError} cloudSettings={cloudSettings} branding={brandingData} displaySettings={displaySettings} onUpdateDisplay={handleUpdateDisplay} onLogout={handleLogout} schoolLogo={schoolLogo} schoolName={schoolName} darkMode={darkMode} setDarkMode={setDarkMode} /> : <Navigate to="/login" />} />
        </Routes>
      </HashRouter>
    </div>
  );
};

interface LayoutProps {
  user: User; cloudHealthy: boolean; cloudError: string | null; cloudSettings: any; branding: { name: string; logo: string | null; address: string; email: string; contact: string; };
  onUpdateDisplay: (settings: DisplaySettings) => void; displaySettings: DisplaySettings; onLogout: () => void; schoolLogo: string | null; schoolName: string; darkMode: boolean; setDarkMode: (val: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, cloudHealthy, cloudError, cloudSettings, branding, onUpdateDisplay, displaySettings, onLogout, schoolLogo, schoolName, darkMode, setDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isCustomizingMenu, setIsCustomizingMenu] = useState(false);
  const [isSavingNav, setIsSavingNav] = useState(false);
  const [orderedNav, setOrderedNav] = useState<any[]>([]);

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [backupPath, setBackupPath] = useState('C:/Institutional/Archives/');

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const location = useLocation();
  const navigate = useNavigate();
  const restoreFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.role) return;
    const defaultNav = (NAVIGATION as any)[user.role] || [];
    const cloudOrderKey = `nav_order_${user.role.toLowerCase()}`;
    const savedOrder = cloudSettings[cloudOrderKey];

    if (savedOrder) {
      try {
        const orderNames = JSON.parse(savedOrder);
        const sorted = [...defaultNav].sort((a, b) => {
          const idxA = orderNames.indexOf(a.name);
          const idxB = orderNames.indexOf(b.name);
          return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
        });
        setOrderedNav(sorted);
      } catch (e) { setOrderedNav(defaultNav); }
    } else {
      setOrderedNav(defaultNav);
    }
  }, [user?.role, cloudSettings]);

  useEffect(() => {
    if (cloudSettings.backup_protocol) {
      try {
        const meta = typeof cloudSettings.backup_protocol === 'string' 
          ? JSON.parse(cloudSettings.backup_protocol) 
          : cloudSettings.backup_protocol;
        setLastBackupTime(meta.last_executed || null);
        setBackupPath(meta.target_path || 'C:/Institutional/Archives/');
      } catch (e) {}
    }
  }, [cloudSettings.backup_protocol]);

  const runFullBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    setRecoveryError(null);
    setBackupProgress('Connecting to Data Nodes...');
    try {
      const tables = ['students', 'teachers', 'attendance', 'teacher_attendance', 'fee_ledger', 'fee_structures', 'notices', 'gallery', 'homework', 'settings', 'audit_logs', 'id_card_templates', 'curriculum_folders', 'curriculum_files'];
      const zip = new JSZip();
      
      for (const table of tables) {
        setBackupProgress(`Exporting ${table.toUpperCase()}...`);
        const { data, error } = await supabase.from(table).select('*');
        if (error) continue;
        if (data) zip.file(`${table}.json`, JSON.stringify(data, null, 2));
      }
      
      setBackupProgress('Generating Secure Archive...');
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `SCHOOL_MASTER_ARCHIVE_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
      
      const newLastTime = new Date().toISOString();
      setLastBackupTime(newLastTime);
      await db.settings.update('backup_protocol', JSON.stringify({
        last_executed: newLastTime,
        target_path: backupPath
      }));
      setBackupProgress('Archive Successfully Exported');
      setTimeout(() => setShowBackupModal(false), 2000);
    } catch (e: any) { 
      setRecoveryError(getErrorMessage(e));
    } finally { 
      setIsBackingUp(false); 
    }
  };

  const runFullRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !window.confirm("CRITICAL WARNING: This will overwrite your existing database. Proceed?")) return;
    
    setIsBackingUp(true);
    setRecoveryError(null);
    setBackupProgress('Initializing Restore Engine...');
    try {
      const zip = await JSZip.loadAsync(file);
      for (const fileName of Object.keys(zip.files)) {
        if (!fileName.endsWith('.json')) continue;
        const tableName = fileName.replace('.json', '');
        setBackupProgress(`Restoring ${tableName.toUpperCase()}...`);
        const content = await zip.file(fileName)?.async('string');
        if (content) {
          const rows = JSON.parse(content);
          if (rows.length > 0) {
            await supabase.from(tableName).upsert(rows, { onConflict: 'id' });
          }
        }
      }
      setBackupProgress('System State Restored');
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: any) { 
      setRecoveryError(getErrorMessage(e));
    } finally { 
      setIsBackingUp(false); 
    }
  };

  const handleSaveMenuOrder = async () => {
    setIsSavingNav(true);
    try {
      const orderNames = orderedNav.map(n => n.name);
      const cloudOrderKey = `nav_order_${user.role.toLowerCase()}`;
      await db.settings.update(cloudOrderKey, JSON.stringify(orderNames));
      await createAuditLog(user, 'UPDATE', 'System', `Menu Layout Reordered for ${user.role}`);
      setIsCustomizingMenu(false);
    } catch (e) { alert("Failed to save layout."); }
    finally { setIsSavingNav(false); }
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    if (!isCustomizingMenu) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    if (!isCustomizingMenu) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  const onDragEnd = () => {
    if (!isCustomizingMenu || draggedIndex === null || dragOverIndex === null) {
      setDraggedIndex(null); setDragOverIndex(null); return;
    }
    const newItems = [...orderedNav];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(dragOverIndex, 0, draggedItem);
    setOrderedNav(newItems);
    setDraggedIndex(null); setDragOverIndex(null);
  };

  const getNavColor = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes('DASHBOARD')) return '#6366f1'; 
    if (n.includes('STUDENT') || n.includes('TEACHER')) return '#10b981'; 
    if (n.includes('FEE')) return '#f59e0b'; 
    return '#6366f1';
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex transition-colors duration-300 relative bg-slate-50 dark:bg-slate-950 app-container">
      <div className="fixed inset-0 z-0 bg-custom-overlay no-print"></div>
      <div className="fixed inset-0 z-0 bg-dim-layer no-print"></div>

      {showBackupModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-1 shadow-2xl max-w-3xl w-full border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 overflow-hidden">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-indigo-50 dark:bg-indigo-900/10 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <Database size={24} className="text-indigo-600" />
                    <div>
                       <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">System Recovery Console</h3>
                       <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cloud Integrated Archival Module</p>
                    </div>
                 </div>
                 <button onClick={() => setShowBackupModal(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all text-slate-400"><X size={20}/></button>
              </div>

              <div className="p-10 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                 {isBackingUp ? (
                    <div className="py-10 flex flex-col items-center justify-center text-center space-y-6">
                       <Loader2 size={64} className="animate-spin text-indigo-600" />
                       <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em]">{backupProgress}</p>
                    </div>
                 ) : (
                    <div className="space-y-8">
                       <div className={`p-6 rounded-3xl border-2 flex items-center gap-6 transition-all ${cloudHealthy ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/50'}`}>
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${cloudHealthy ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
                             {cloudHealthy ? <Wifi size={24}/> : <WifiOff size={24}/>}
                          </div>
                          <div>
                             <h4 className={`text-xs font-black uppercase ${cloudHealthy ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>Cloud Link: {cloudHealthy ? 'ACTIVE' : 'OFFLINE'}</h4>
                             <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                {cloudHealthy ? 'Supabase Node Online • Identity Verified' : cloudError || 'Connection timed out.'}
                             </p>
                          </div>
                       </div>

                       {recoveryError && (
                         <div className="p-5 bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-2">
                            <AlertTriangle size={24} className="text-rose-500 shrink-0 mt-1" />
                            <div>
                               <h4 className="text-xs font-black text-rose-700 dark:text-rose-400 uppercase">Engine Diagnostic Error</h4>
                               <p className="text-[10px] font-medium text-rose-600/70 dark:text-rose-400/60 uppercase mt-1 leading-relaxed">{recoveryError}</p>
                            </div>
                         </div>
                       )}

                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button onClick={runFullBackup} disabled={!cloudHealthy} className={`group p-6 rounded-[2rem] border-2 transition-all text-left flex items-center gap-6 ${cloudHealthy ? 'bg-indigo-50 dark:bg-indigo-900/20 border-transparent hover:border-indigo-500' : 'bg-slate-100 opacity-50 grayscale'}`}>
                             <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform"><HardDriveDownload size={28} /></div>
                             <div><h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Manual Archive</h4><p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Instant Cloud Export</p></div>
                          </button>
                          <button onClick={() => restoreFileRef.current?.click()} disabled={!cloudHealthy} className={`group p-6 rounded-[2rem] border-2 transition-all text-left flex items-center gap-6 ${cloudHealthy ? 'bg-emerald-50 dark:bg-emerald-900/20 border-transparent hover:border-emerald-500' : 'bg-slate-100 opacity-50 grayscale'}`}>
                             <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform"><CloudUpload size={28} /></div>
                             <div><h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Restore State</h4><p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Load Institutional Archive</p></div>
                          </button>
                          <input type="file" ref={restoreFileRef} className="hidden" accept=".zip" onChange={runFullRestore} />
                       </div>

                       <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <Clock size={16} className="text-slate-400" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Backup Sequence: {lastBackupTime ? new Date(lastBackupTime).toLocaleString() : 'NEVER'}</span>
                             </div>
                             <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${cloudHealthy ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : 'bg-rose-50 text-rose-500 border-rose-100'}`}>STATUS: {cloudHealthy ? 'CLOUD SYNCED' : 'DISCONNECTED'}</span>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2"><FolderOpen size={12}/> Target Archive Directory</label>
                             <input type="text" value={backupPath} onChange={e => setBackupPath(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white text-[10px] outline-none shadow-inner" placeholder="C:/Backups/School/" />
                          </div>
                       </div>
                    </div>
                 )}
                 <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-start gap-4">
                    <ShieldCheck size={20} className="text-indigo-500 shrink-0 mt-1" />
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wide">Security Node: All recovery operations are logged. Ensure valid .zip archives are used to prevent database fragmentation.</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white/90 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 transform transition-all duration-300 ease-in-out glass-card ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col relative overflow-hidden">
          <div className="p-8 relative z-10">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold overflow-hidden shadow-2xl border-2 border-white/20">{schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={28} />}</div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white tracking-tighter uppercase truncate block">{schoolName}</span>
                    <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest">Control Node</span>
                    {isAdmin && (
                      <button onClick={() => setIsCustomizingMenu(!isCustomizingMenu)} className={`mt-2 flex items-center gap-1.5 px-3 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all sidebar-customize-btn w-fit shadow-sm border ${isCustomizingMenu ? 'bg-indigo-600 text-white border-indigo-500 animate-pulse' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800'}`}>
                        {isCustomizingMenu ? <Check size={10} /> : <Move size={10} />} {isCustomizingMenu ? 'Exit Rearrange' : 'Rearrange Menu'}
                      </button>
                    )}
                  </div>
               </div>
               <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:text-indigo-600 transition-all shadow-sm">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            </div>
          </div>

          <nav className="flex-1 px-6 space-y-3 overflow-y-auto custom-scrollbar relative z-10 pb-10">
            {orderedNav.map((item: any, index: number) => {
              const isActive = location.pathname === item.path; 
              const hoverColor = getNavColor(item.name);
              return (
                <div key={item.name} draggable={isCustomizingMenu} onDragStart={(e) => onDragStart(e, index)} onDragOver={(e) => onDragOver(e, index)} onDragEnd={onDragEnd} style={{ '--hover-color': hoverColor } as React.CSSProperties} className={`nav-node-row group relative ${isCustomizingMenu ? 'cursor-move' : ''} ${draggedIndex === index ? 'drag-active' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}>
                  {isCustomizingMenu && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 opacity-40 group-hover:opacity-100 transition-opacity"><GripVertical size={14} /></div>}
                  <Link to={isCustomizingMenu ? '#' : item.path} onClick={(e) => { if(isCustomizingMenu) { e.preventDefault(); return; } setSidebarOpen(false); }} className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all relative overflow-hidden ${isActive ? 'bg-indigo-600 text-white shadow-xl translate-x-2' : 'bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 shadow-sm'} ${isCustomizingMenu ? 'border-dashed border-indigo-200 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-4 min-w-0">
                      <span className={`shrink-0 transition-transform duration-500 group-hover:rotate-12 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-50'}`}>{item.icon}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest truncate">{item.name}</span>
                    </div>
                    {!isCustomizingMenu && <ChevronRight size={12} className={`transition-all ${isActive ? 'text-white opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />}
                  </Link>
                </div>
              );
            })}
          </nav>
          
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4 relative z-10 bg-white/50 dark:bg-slate-900/50">
            {isAdmin && (
              <button onClick={() => setShowBackupModal(true)} className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl transition-all font-black text-[9px] uppercase tracking-widest border shadow-sm group bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-600 hover:text-white">
                 <Database size={16} /> System Recovery
              </button>
            )}
            <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-center gap-3 py-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-lg border border-rose-100 dark:border-rose-900/50"><OutIcon size={18} /> Exit Console</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 no-print glass-card">
          <button className="lg:hidden p-2 text-slate-600 dark:text-slate-400" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
          {!cloudHealthy && <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-full animate-pulse"><WifiOff size={14}/><span className="text-[8px] font-black uppercase tracking-widest">Offline Mode</span></div>}
          <div className="flex items-center gap-6 ml-auto">
             <div className="flex items-center gap-3 pl-2 cursor-pointer group">
                <div className="text-right hidden sm:block"><p className="text-sm font-black text-slate-800 dark:text-white leading-none uppercase">{user.name}</p><p className="text-[8px] text-slate-400 font-black mt-1 uppercase tracking-[0.2em] flex items-center justify-end gap-1.5"><Fingerprint size={10}/> {user.role} TERMINAL</p></div>
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-bold overflow-hidden shadow-xl border border-indigo-100 group-hover:scale-110 transition-all">{user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" alt="Profile" /> : <UserCircle size={24} />}</div>
             </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto relative">
          <Routes>
            <Route path="/" element={<Navigate to={user?.role ? `/${user.role.toLowerCase()}/dashboard` : '/login'} />} replace />
            <Route path="/admin/dashboard" element={<Dashboard user={user} branding={branding} onUpdateLogo={() => navigate('/admin/branding')} />} />
            <Route path="/admin/slideshow-manager" element={<SlideshowManager user={user} />} />
            <Route path="/admin/branding" element={<SchoolSettings user={user} />} />
            <Route path="/admin/display-config" element={<DisplayConfigure user={user} settings={displaySettings} onUpdateSettings={onUpdateDisplay} />} />
            <Route path="/admin/students" element={<StudentsManager user={user} />} />
            <Route path="/admin/class-management" element={<ClassManagement user={user} />} />
            <Route path="/admin/reports" element={<StudentReports user={user} schoolLogo={schoolLogo} schoolName={schoolName} />} />
            <Route path="/admin/cancel-admission" element={<AdmissionCancellation user={user} />} />
            <Route path="/admin/id-designer" element={<IdCardDesigner user={user} />} />
            <Route path="/admin/id-cards" element={<IdCardGenerator user={user} schoolLogo={schoolLogo} />} />
            <Route path="/admin/teachers" element={<TeachersManager user={user} />} />
            <Route path="/admin/homework" element={<Homework user={user} />} />
            <Route path="/admin/curriculum" element={<Curriculum user={user} />} />
            <Route path="/admin/attendance" element={<Attendance user={user} />} />
            <Route path="/admin/teacher-attendance" element={<TeacherAttendance user={user} />} />
            <Route path="/admin/timetable" element={<Timetable user={user} />} />
            <Route path="/admin/food-chart" element={<FoodChart user={user} />} />
            <Route path="/admin/sms" element={<SMSPanel user={user} />} />
            <Route path="/admin/marks-setup" element={<MarksSetup user={user} />} />
            <Route path="/admin/marks-entry" element={<MarksEntry user={user} />} />
            <Route path="/admin/marksheet" element={<MarksheetGenerator user={user} schoolLogo={schoolLogo} />} />
            <Route path="/admin/grading" element={<GradingSystem user={user} />} />
            <Route path="/admin/fees/management" element={<FeesManagement user={user} />} />
            <Route path="/admin/fees/setup" element={<FeeSetup user={user} />} />
            <Route path="/admin/fees/studentwise" element={<StudentwiseFee user={user} />} />
            <Route path="/admin/fees/receipt-config" element={<ReceiptSetup user={user} />} />
            <Route path="/admin/fees/general-receipt" element={<GeneralReceipt user={user} schoolLogo={schoolLogo} />} />
            <Route path="/admin/fees/search" element={<FeeSearch user={user} schoolLogo={schoolLogo} />} />
            <Route path="/admin/fees/audit" element={<AuditLog user={user} moduleFilter="Finance" />} />
            <Route path="/admin/gallery" element={<MediaGallery user={user} />} />
            <Route path="/admin/notices" element={<NoticeBoard user={user} />} />
            <Route path="/admin/audit" element={<AuditLog user={user} />} />
            
            <Route path="/teacher/dashboard" element={<Dashboard user={user} branding={branding} onUpdateLogo={() => {}} />} />
            <Route path="/teacher/attendance" element={<Attendance user={user} />} />
            <Route path="/teacher/homework" element={<Homework user={user} />} />
            <Route path="/teacher/marks-entry" element={<MarksEntry user={user} />} />
            <Route path="/teacher/curriculum" element={<Curriculum user={user} />} />
            <Route path="/teacher/timetable" element={<Timetable user={user} />} />
            <Route path="/teacher/food-chart" element={<FoodChart user={user} />} />
            <Route path="/teacher/sms" element={<SMSPanel user={user} />} />
            <Route path="/teacher/fees" element={<FeesManagement user={user} />} />
            <Route path="/teacher/gallery" element={<MediaGallery user={user} />} />
            <Route path="/teacher/notices" element={<NoticeBoard user={user} />} />

            <Route path="/student/dashboard" element={<Dashboard user={user} branding={branding} onUpdateLogo={() => {}} />} />
            <Route path="/student/attendance" element={<Attendance user={user} />} />
            <Route path="/student/curriculum" element={<Curriculum user={user} />} />
            <Route path="/student/homework" element={<Homework user={user} />} />
            <Route path="/student/food-chart" element={<FoodChart user={user} />} />
            <Route path="/student/fees" element={<FeesManager user={user} />} />
            <Route path="/student/timetable" element={<Timetable user={user} />} />
            <Route path="/student/gallery" element={<MediaGallery user={user} />} />
            <Route path="/student/notices" element={<NoticeBoard user={user} />} />
            <Route path="/student/marksheet" element={<MarksheetGenerator user={user} schoolLogo={schoolLogo} />} />
          </Routes>
        </main>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-[320px] w-full shadow-2xl border border-slate-200 dark:border-slate-800 glass-card">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.2rem] flex items-center justify-center mb-4 mx-auto border border-rose-100 shadow-inner"><OutIcon size={24} /></div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white text-center mb-1 uppercase tracking-tighter">Sign Out?</h3>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 font-black rounded-xl uppercase text-[10px]">Stay</button>
              <button onClick={() => { onLogout(); navigate('/login'); }} className="flex-1 py-3 bg-rose-600 text-white font-black rounded-xl uppercase text-[10px] shadow-lg">Logout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
