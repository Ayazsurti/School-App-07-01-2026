
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
  Palette
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
import { APP_NAME as DEFAULT_APP_NAME, NAVIGATION } from './constants';
import { db, supabase } from './supabase';
import { createAuditLog } from './utils/auditLogger';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'NOTICE' | 'GALLERY' | 'VIDEO' | 'CURRICULUM' | 'HOMEWORK';
  timestamp: Date;
  isRead: boolean;
}

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
    const saved = localStorage.getItem('school_app_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => {
    const saved = localStorage.getItem('display_settings');
    return saved ? JSON.parse(saved) : DEFAULT_DISPLAY_SETTINGS;
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
  
  const isStudent = user.role === 'STUDENT';
  const isAdmin = user.role === 'ADMIN';

  const [orderedNav, setOrderedNav] = useState<any[]>([]);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    const defaultNav = (NAVIGATION as any)[user.role] || [];
    
    let permittedNav = defaultNav;
    if (user.role === 'TEACHER' && (user as any).permissions) {
      const perms = (user as any).permissions as string[];
      permittedNav = defaultNav.filter((item: any) => {
        if (item.name === 'Dashboard') return true;
        const nameKeyMap: Record<string, string> = {
          'Attendance': 'attendance',
          'Curriculum': 'curriculum',
          'Homework': 'homework',
          'Timetable': 'curriculum',
          'Food Chart': 'curriculum',
          'SMS Panel': 'sms',
          'Fee Management': 'attendance',
          'Online Fees Payment': 'attendance',
          'Gallery': 'gallery',
          'Notices': 'notices',
          'Marks Entry': 'marks'
        };
        const permKey = nameKeyMap[item.name];
        return !permKey || perms.includes(permKey);
      });
    }

    const cloudKey = `nav_order_${user.role}`;
    const savedOrder = cloudSettings[cloudKey] || localStorage.getItem(cloudKey);
    
    if (savedOrder) {
      try {
        const savedNames = typeof savedOrder === 'string' ? JSON.parse(savedOrder) : savedOrder;
        const ordered = savedNames
          .map((name: string) => permittedNav.find((item: any) => item.name === name))
          .filter(Boolean);
        const remaining = permittedNav.filter((item: any) => !savedNames.includes(item.name));
        const finalNav = [...ordered, ...remaining];
        const currentNames = orderedNav.map(i => i.name).join(',');
        const incomingNames = finalNav.map(i => i.name).join(',');
        if (currentNames !== incomingNames) setOrderedNav(finalNav);
      } catch (e) { setOrderedNav(permittedNav); }
    } else {
      setOrderedNav(permittedNav);
    }
  }, [user.role, cloudSettings, (user as any).permissions]);

  const handleDragStart = (index: number) => { if (!isStudent) dragItem.current = index; };
  const handleDragEnter = (index: number) => { if (!isStudent) dragOverItem.current = index; };
  
  const handleDragEnd = async () => {
    if (isStudent || dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current !== dragOverItem.current) {
      const copyListItems = [...orderedNav];
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      setOrderedNav(copyListItems);
      const orderNames = copyListItems.map(i => i.name);
      const jsonOrder = JSON.stringify(orderNames);
      const cloudKey = `nav_order_${user.role}`;
      localStorage.setItem(cloudKey, jsonOrder);
      setIsSavingNav(true);
      try { await db.settings.update(cloudKey, jsonOrder); } catch (err) {} finally { setTimeout(() => setIsSavingNav(false), 800); }
    }
    dragItem.current = null; dragOverItem.current = null;
  };

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isStudent) {
      const fetchStudentDetails = async () => {
        try {
          const { data } = await supabase.from('students').select('*').eq('id', user.id).single();
          if (data) setFullStudentData(data);
        } catch (e) {}
      };
      fetchStudentDetails();
    }
  }, [isStudent, user.id]);

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

      {showProfileModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] p-1 shadow-2xl max-w-2xl w-full border border-slate-100 dark:border-slate-800 overflow-hidden relative">
              <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 md:top-8 md:right-8 p-2 md:p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:bg-rose-500 hover:text-white transition-all z-50"><X size={24}/></button>
              
              <div className="h-24 md:h-32 bg-indigo-600 relative overflow-hidden">
                 <div className="absolute inset-0 neural-grid-white opacity-20"></div>
                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
              </div>

              <div className="p-6 md:p-12 -mt-16 md:-mt-20 relative z-10 flex flex-col items-center">
                 <div className="w-32 h-32 md:w-44 md:h-44 bg-white dark:bg-slate-800 rounded-[2.5rem] md:rounded-[3rem] border-4 md:border-8 border-white dark:border-slate-900 shadow-2xl overflow-hidden relative group/img">
                    {user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" /> : <UserCircle size={80} className="text-slate-200 m-auto mt-4 md:mt-8" />}
                 </div>

                 <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mt-6 uppercase tracking-tight text-center px-4">{fullStudentData?.full_name || user.name}</h2>
                 <div className="flex gap-2 mt-2">
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">Std {fullStudentData?.class || user.class}-{fullStudentData?.section || user.section}</span>
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">Verified identity</span>
                 </div>

                 {isStudent && (
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-8 md:mt-12">
                       <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-500 shadow-sm shrink-0"><Fingerprint size={18}/></div>
                          <div>
                             <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">GR Number</p>
                             <p className="text-xs md:text-sm font-black text-slate-800 dark:text-white">{fullStudentData?.gr_number || 'SYNCING...'}</p>
                          </div>
                       </div>
                       <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl md:rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-500 shadow-sm shrink-0"><Hash size={18}/></div>
                          <div>
                             <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Roll Number</p>
                             <p className="text-xs md:text-sm font-black text-slate-800 dark:text-white">#{fullStudentData?.roll_no || user.rollNo || 'N/A'}</p>
                          </div>
                       </div>
                    </div>
                 )}

                 <button onClick={() => setShowLogoutConfirm(true)} className="mt-8 md:mt-10 w-full py-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm border border-rose-100 dark:border-rose-900/50">Logout Account</button>
              </div>
           </div>
        </div>
      )}

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-[100] lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-[110] w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-all duration-300 ease-in-out glass-card ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold overflow-hidden shadow-indigo-100 shadow-sm">
                    {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={20} />}
                  </div>
                  <span className="text-[10px] font-black text-slate-800 dark:text-white tracking-tight uppercase truncate max-w-[120px]">{schoolName}</span>
               </div>
               <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:text-indigo-600 transition-all">
                 {darkMode ? <Sun size={18} /> : <Moon size={18} />}
               </button>
            </div>

            {!isStudent && (
              <button onClick={() => setIsCustomizing(!isCustomizing)} className={`w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${isCustomizing ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:text-indigo-600'}`}>
                {isSavingNav ? <Loader2 size={12} className="animate-spin" /> : <LayoutTemplate size={12} />} 
                {isCustomizing ? 'Stop Edit' : 'Edit Menu'}
              </button>
            )}
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar relative z-10">
            {orderedNav.map((item: any, index: number) => {
              const isActive = location.pathname === item.path;
              return (
                <div key={item.name} draggable={isCustomizing && !isStudent} onDragStart={() => handleDragStart(index)} onDragEnter={() => handleDragEnter(index)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()} className={`relative flex items-center group transition-all ${isCustomizing && !isStudent ? 'cursor-grab active:cursor-grabbing hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg' : ''}`}>
                  {isCustomizing && !isStudent && <div className="absolute left-1 text-indigo-400 opacity-50 group-hover:opacity-100"><GripVertical size={14} /></div>}
                  <Link to={isCustomizing && !isStudent ? '#' : item.path} onClick={(e) => { if (isCustomizing && !isStudent) e.preventDefault(); else setSidebarOpen(false); }} className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-indigo-600'} ${isCustomizing && !isStudent ? 'pointer-events-none ml-4' : ''}`}>
                    <span className={`${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>{item.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{item.name}</span>
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-3 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all font-black text-[9px] uppercase tracking-[0.2em] border border-rose-100 dark:border-rose-900/50"><OutIcon size={16} /> Sign Out</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 no-print glass-card">
          <button className="lg:hidden p-2 text-slate-600 dark:text-slate-400 -ml-2" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
          
          <div className="flex items-center gap-2 ml-auto" onClick={() => setShowProfileModal(true)}>
             <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 dark:text-white leading-none truncate max-w-[120px]">{fullStudentData?.full_name || user.name}</p>
                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-black mt-1 uppercase">{user.role}</p>
             </div>
             <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-bold overflow-hidden shadow-sm border border-transparent hover:border-indigo-600 transition-all cursor-pointer">
                {user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" /> : isAdmin ? <Shield size={18} /> : <UserCircle size={20} />}
             </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto relative custom-scrollbar">
          <Routes>
            <Route path="/" element={<Navigate to={`/${user.role.toLowerCase()}/dashboard`} />} />
            <Route path="/admin/dashboard" element={<Dashboard user={user} branding={branding} onUpdateLogo={() => navigate('/admin/branding')} />} />
            <Route path="/admin/branding" element={<SchoolSettings user={user} />} />
            <Route path="/admin/display-config" element={<DisplayConfigure user={user} settings={displaySettings} onUpdateSettings={onUpdateDisplay} />} />
            <Route path="/admin/students" element={<StudentsManager user={user} />} />
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
