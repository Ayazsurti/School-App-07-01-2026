
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  LogOut, 
  Bell, 
  Search, 
  ChevronRight,
  User as UserIcon,
  Users,
  AlertTriangle,
  Camera,
  Upload,
  Trash2,
  Settings,
  Power,
  Image as ImageIcon,
  ShieldCheck,
  History,
  PencilRuler,
  UtensilsCrossed,
  MessageSquareQuote,
  Gem,
  Sparkles,
  Trophy,
  Gift,
  Star,
  Sun,
  Moon,
  Settings2,
  Eye,
  EyeOff,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Plus,
  Edit2,
  Cloud,
  School,
  Loader2,
  RefreshCw,
  Video,
  FileText,
  BookOpen,
  SwitchCamera,
  StopCircle,
  Activity,
  Check,
  LogOut as OutIcon,
  GripHorizontal,
  LayoutTemplate,
  RotateCcw,
  ClipboardList,
  GraduationCap,
  Smartphone,
  MapPin,
  Fingerprint,
  Info,
  Phone,
  UserCircle,
  Heart,
  Shield,
  Hash,
  UserMinus,
  Palette,
  Terminal,
  Cpu
} from 'lucide-react';
import { User, UserRole, DisplaySettings, Student } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
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
import ExamSetup from './pages/ExamSetup';
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
import { APP_NAME as DEFAULT_APP_NAME, NAVIGATION } from './constants';
import { db, supabase } from './supabase';
import { createAuditLog } from './utils/auditLogger';

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  fontFamily: "'Inter', sans-serif",
  fontColor: '#0f172a',
  accentColor: '#4f46e5',
  backgroundImage: null,
  bgOpacity: 10,
  cardOpacity: 90,
  glassBlur: 12
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('school_app_user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return JSON.parse(saved);
    } catch (e) {
      console.error("Auth state recovery failed:", e);
      return null;
    }
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => {
    try {
      const saved = localStorage.getItem('display_settings');
      return saved ? JSON.parse(saved) : DEFAULT_DISPLAY_SETTINGS;
    } catch {
      return DEFAULT_DISPLAY_SETTINGS;
    }
  });

  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>(DEFAULT_APP_NAME);
  const [schoolAddress, setSchoolAddress] = useState<string>('');
  const [schoolEmail, setSchoolEmail] = useState<string>('');
  const [schoolContact, setSchoolContact] = useState<string>('');
  const [cloudSettings, setCloudSettings] = useState<any>({});

  const fetchBranding = async () => {
    try {
      const settings = await db.settings.getAll();
      setCloudSettings(settings);
      if (settings.school_logo) setSchoolLogo(settings.school_logo);
      if (settings.school_name) setSchoolName(settings.school_name);
      if (settings.school_address) setSchoolAddress(settings.school_address);
      if (settings.school_email) setSchoolEmail(settings.school_email);
      if (settings.school_contact) setSchoolContact(settings.school_contact);
    } catch (err: any) { 
      console.warn("Branding sync skipped:", err.message); 
    }
  };

  useEffect(() => {
    fetchBranding();
    const channel = supabase.channel('settings-global-sync-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchBranding();
      })
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

  const handleUpdateDisplay = (newSettings: DisplaySettings) => {
    setDisplaySettings(newSettings);
    localStorage.setItem('display_settings', JSON.stringify(newSettings));
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('school_app_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('school_app_user');
  };

  const brandingData = {
    name: schoolName,
    logo: schoolLogo,
    address: schoolAddress,
    email: schoolEmail,
    contact: schoolContact
  };

  return (
    <HashRouter>
      <div className={darkMode ? 'dark' : ''}>
        <style>
          {`
            :root {
              --custom-font: ${displaySettings.fontFamily};
              --custom-text: ${displaySettings.fontColor};
              --accent-color: ${displaySettings.accentColor};
            }
            body {
              font-family: var(--custom-font) !important;
            }
            .app-container {
              color: var(--custom-text);
            }
            .bg-custom-overlay {
              background-image: ${displaySettings.backgroundImage ? `url(${displaySettings.backgroundImage})` : 'none'};
              background-size: cover;
              background-position: center;
              background-attachment: fixed;
            }
            .bg-dim-layer {
              background-color: ${darkMode ? '#020617' : '#f8fafc'};
              opacity: ${displaySettings.bgOpacity / 100};
            }
            .glass-card {
              background-color: ${darkMode ? `rgba(15, 23, 42, ${displaySettings.cardOpacity / 100})` : `rgba(255, 255, 255, ${displaySettings.cardOpacity / 100})`} !important;
              backdrop-filter: blur(${displaySettings.glassBlur}px) !important;
              -webkit-backdrop-filter: blur(${displaySettings.glassBlur}px) !important;
            }
            .nav-node-row {
              position: relative;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              border: 1px solid transparent;
            }
            .nav-node-row:hover {
              transform: translateX(8px);
              border-color: var(--hover-color);
              box-shadow: -4px 0 0 0 var(--hover-color), 0 10px 20px -5px rgba(0,0,0,0.1);
            }
            .nav-node-row::before, .nav-node-row::after {
              content: '';
              position: absolute;
              width: 4px;
              height: 4px;
              border: 1px solid var(--hover-color);
              opacity: 0;
              transition: opacity 0.3s ease;
            }
            .nav-node-row:hover::before { opacity: 1; top: 0; left: 0; border-right: 0; border-bottom: 0; }
            .nav-node-row:hover::after { opacity: 1; bottom: 0; right: 0; border-left: 0; border-top: 0; }
          `}
        </style>
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} schoolLogo={schoolLogo} schoolName={schoolName} /> : <Navigate to="/" />} />
          <Route path="/*" element={user ? <Layout user={user} cloudSettings={cloudSettings} branding={brandingData} displaySettings={displaySettings} onUpdateDisplay={handleUpdateDisplay} onLogout={handleLogout} schoolLogo={schoolLogo} schoolName={schoolName} darkMode={darkMode} setDarkMode={setDarkMode} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

interface LayoutProps {
  user: User;
  cloudSettings: any;
  branding: { name: string; logo: string | null; address: string; email: string; contact: string; };
  onUpdateDisplay: (settings: DisplaySettings) => void;
  displaySettings: DisplaySettings;
  onLogout: () => void;
  schoolLogo: string | null;
  schoolName: string;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, cloudSettings, branding, onUpdateDisplay, displaySettings, onLogout, schoolLogo, schoolName, darkMode, setDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isSavingNav, setIsSavingNav] = useState(false);
  const [fullStudentData, setFullStudentData] = useState<any>(null);

  const isStudent = user?.role === 'STUDENT';
  const isAdmin = user?.role === 'ADMIN';

  const [orderedNav, setOrderedNav] = useState<any[]>([]);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    if (!user?.role) return;
    const defaultNav = (NAVIGATION as any)[user.role] || [];
    let permittedNav = defaultNav;

    if (user.role === 'TEACHER') {
      const perms = ((user as any).permissions || []) as string[];
      const nameKeyMap: Record<string, string> = {
        'Attendance': 'attendance', 'Curriculum': 'curriculum', 'Homework': 'homework',
        'Timetable': 'timetable', 'Food Chart': 'food_chart', 'SMS Panel': 'sms',
        'Gallery': 'gallery', 'Notices': 'notices', 'Marks Entry': 'marks'
      };
      permittedNav = defaultNav.filter((item: any) => {
        if (item.name === 'Dashboard') return true;
        const requiredKey = nameKeyMap[item.name];
        return requiredKey && perms.includes(requiredKey);
      });
    }

    const cloudKey = `nav_order_${user.role}`;
    const savedOrder = cloudSettings[cloudKey] || localStorage.getItem(cloudKey);
    
    if (savedOrder) {
      try {
        const savedNames = typeof savedOrder === 'string' ? JSON.parse(savedOrder) : savedOrder;
        const ordered = savedNames.map((name: string) => permittedNav.find((item: any) => item.name === name)).filter(Boolean);
        const remaining = permittedNav.filter((item: any) => !savedNames.includes(item.name));
        setOrderedNav([...ordered, ...remaining]);
      } catch (e) { setOrderedNav(permittedNav); }
    } else { setOrderedNav(permittedNav); }
  }, [user?.role, cloudSettings, (user as any)?.permissions]);

  const handleDragEnd = async () => {
    if (isStudent || dragItem.current === null || dragOverItem.current === null || !user?.role) return;
    if (dragItem.current !== dragOverItem.current) {
      const copyListItems = [...orderedNav];
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      setOrderedNav(copyListItems);
      const cloudKey = `nav_order_${user.role}`;
      localStorage.setItem(cloudKey, JSON.stringify(copyListItems.map(i => i.name)));
      setIsSavingNav(true);
      try { await db.settings.update(cloudKey, JSON.stringify(copyListItems.map(i => i.name))); } catch (err) {}
      finally { setTimeout(() => setIsSavingNav(false), 800); }
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isStudent && user?.id) {
      const fetchStudentDetails = async () => {
        try {
          const { data } = await supabase.from('students').select('*').eq('id', user.id).single();
          if (data) setFullStudentData(data);
        } catch (e) {}
      };
      fetchStudentDetails();
    }
  }, [isStudent, user?.id]);

  const getNavColor = (name: string) => {
    const n = name.toUpperCase();
    if (n.includes('DASHBOARD')) return '#6366f1'; // Indigo
    if (n.includes('STUDENT') || n.includes('TEACHER')) return '#10b981'; // Emerald
    if (n.includes('FEE') || n.includes('RECEIPT') || n.includes('LEDGER')) return '#f59e0b'; // Amber
    if (n.includes('HOMEWORK') || n.includes('CURRICULUM') || n.includes('TIMETABLE')) return '#06b6d4'; // Cyan
    if (n.includes('NOTICE') || n.includes('GALLERY') || n.includes('SMS')) return '#a855f7'; // Purple
    if (n.includes('AUDIT') || n.includes('LOGS') || n.includes('CANCEL')) return '#f43f5e'; // Rose
    return '#6366f1';
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex transition-colors duration-300 relative bg-slate-50 dark:bg-slate-950 app-container">
      <div className="fixed inset-0 z-0 bg-custom-overlay no-print"></div>
      <div className="fixed inset-0 z-0 bg-dim-layer no-print"></div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 glass-card">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><OutIcon size={32} /></div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2 uppercase tracking-tighter">Sign Out?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">Log out of your institutional account?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold rounded-xl uppercase text-[10px]">Stay</button>
              <button onClick={() => { onLogout(); navigate('/login'); }} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl uppercase text-[10px]">Logout</button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && isAdmin && (
        <div className="fixed inset-0 z-[2000] pointer-events-auto" onClick={() => setShowProfileModal(false)}>
           <div className="absolute top-20 right-8 w-64 bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300 glass-card" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg">{user.name.charAt(0)}</div>
                 <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-0.5">Admin Identity</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{user.name}</p>
                 </div>
              </div>
              <button onClick={() => { setShowProfileModal(false); setShowLogoutConfirm(true); }} className="w-full py-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border border-rose-100 dark:border-rose-900/50 flex items-center justify-center gap-2"><LogOut size={14} /> Log Out</button>
           </div>
        </div>
      )}

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white/90 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 transform transition-all duration-300 ease-in-out glass-card ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 neural-grid-white opacity-[0.05] pointer-events-none"></div>
          
          <div className="p-8 relative z-10">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold overflow-hidden shadow-2xl border-2 border-white/20">
                    {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={28} />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-900 dark:text-white tracking-tighter uppercase truncate block">{schoolName}</span>
                    <span className="text-[7px] font-black text-indigo-500 uppercase tracking-[0.4em]">Control Node</span>
                  </div>
               </div>
               <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:text-indigo-600 transition-all shadow-sm">
                 {darkMode ? <Sun size={18} /> : <Moon size={18} />}
               </button>
            </div>
            {!isStudent && (
              <button onClick={() => setIsCustomizing(!isCustomizing)} className={`w-full flex items-center justify-center gap-3 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border-2 transition-all ${isCustomizing ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-indigo-100 hover:text-indigo-600 shadow-sm'}`}>
                {isSavingNav ? <Loader2 size={12} className="animate-spin" /> : <LayoutTemplate size={12} />} 
                {isCustomizing ? 'Lock Configuration' : 'Customize Console'}
              </button>
            )}
          </div>

          <nav className="flex-1 px-6 space-y-3 overflow-y-auto custom-scrollbar relative z-10">
            {orderedNav.map((item: any, index: number) => {
              const isActive = location.pathname === item.path;
              const hoverColor = getNavColor(item.name);
              return (
                <div 
                  key={item.name} 
                  draggable={isCustomizing && !isStudent} 
                  onDragStart={() => { dragItem.current = index; }} 
                  onDragEnter={() => { dragOverItem.current = index; }} 
                  onDragEnd={handleDragEnd} 
                  onDragOver={(e) => e.preventDefault()} 
                  style={{ '--hover-color': hoverColor } as React.CSSProperties}
                  className={`nav-node-row group ${isCustomizing && !isStudent ? 'cursor-grab active:cursor-grabbing bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl' : ''}`}
                >
                  <Link 
                    to={isCustomizing && !isStudent ? '#' : item.path} 
                    onClick={(e) => { if (isCustomizing && !isStudent) e.preventDefault(); else setSidebarOpen(false); }} 
                    className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all relative overflow-hidden ${isActive ? 'bg-indigo-600 text-white shadow-xl translate-x-2' : 'bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 shadow-sm'}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                       <span className={`shrink-0 transition-transform duration-500 group-hover:rotate-12 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`}>{item.icon}</span>
                       <span className="text-[10px] font-black uppercase tracking-widest truncate">{item.name}</span>
                    </div>
                    {isCustomizing && !isStudent ? (
                      <GripVertical size={14} className="text-slate-300" />
                    ) : (
                      <ChevronRight size={12} className={`transition-all ${isActive ? 'text-white opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="p-6 border-t border-slate-100 dark:border-slate-800 space-y-4 relative z-10 bg-white/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900 shadow-inner">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm"><Activity size={14} className="animate-pulse" /></div>
                  <div>
                    <p className="text-[8px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest leading-none mb-1">Status</p>
                    <p className="text-[9px] font-black text-emerald-600 uppercase">Cloud Uplink Active</p>
                  </div>
               </div>
               <ShieldCheck size={14} className="text-emerald-500" />
            </div>
            <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-center gap-3 py-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-lg border border-rose-100 dark:border-rose-900/50"><OutIcon size={18} /> Exit Console</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 no-print glass-card">
          <button className="lg:hidden p-2 text-slate-600 dark:text-slate-400" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
          <div className="flex items-center gap-6 ml-auto">
             <div className="flex items-center gap-3 pl-2 cursor-pointer group" onClick={() => setShowProfileModal(true)}>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-black text-slate-800 dark:text-white leading-none group-hover:text-indigo-600 transition-colors uppercase">{fullStudentData?.full_name || user.name}</p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black mt-1 uppercase tracking-[0.2em] flex items-center justify-end gap-1.5"><Fingerprint size={10}/> {user.role} TERMINAL</p>
                </div>
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-bold overflow-hidden shadow-xl border border-indigo-100 dark:border-indigo-800 group-hover:scale-110 transition-all">
                  {user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" alt="Profile" /> : isAdmin ? <Shield size={20} /> : <UserCircle size={24} />}
                </div>
             </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto relative">
          <Routes>
            <Route path="/" element={<Navigate to={`/${user.role.toLowerCase()}/dashboard`} />} />
            <Route path="/admin/dashboard" element={<Dashboard user={user} branding={branding} onUpdateLogo={() => navigate('/admin/branding')} />} />
            <Route path="/admin/branding" element={<SchoolSettings user={user} />} />
            <Route path="/admin/display-config" element={<DisplayConfigure user={user} settings={displaySettings} onUpdateSettings={onUpdateDisplay} />} />
            <Route path="/admin/students" element={<StudentsManager user={user} />} />
            <Route path="/admin/reports" element={<StudentReports user={user} schoolLogo={schoolLogo} schoolName={schoolName} />} />
            <Route path="/admin/cancel-admission" element={<AdmissionCancellation user={user} />} />
            <Route path="/admin/id-designer" element={<IdCardDesigner user={user} />} />
            <Route path="/admin/id-cards" element={<IdCardGenerator user={user} schoolLogo={schoolLogo} />} />
            <Route path="/admin/teachers" element={<TeachersManager user={user} />} />
            <Route path="/admin/homework" element={<Homework user={user} />} />
            <Route path="/admin/curriculum" element={<Curriculum user={user} />} />
            <Route path="/admin/attendance" element={<Attendance user={user} />} />
            <Route path="/admin/timetable" element={<Timetable user={user} />} />
            <Route path="/admin/food-chart" element={<FoodChart user={user} />} />
            <Route path="/admin/sms" element={<SMSPanel user={user} />} />
            <Route path="/admin/marks-setup" element={<MarksSetup user={user} />} />
            <Route path="/admin/marks-entry" element={<MarksEntry user={user} />} />
            <Route path="/admin/marksheet" element={<MarksheetGenerator user={user} schoolLogo={schoolLogo} />} />
            <Route path="/admin/exams" element={<ExamSetup user={user} />} />
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
    </div>
  );
};

export default App;
