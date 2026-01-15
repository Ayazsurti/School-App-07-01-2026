
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
  LogOut as LogOutIcon,
  GripHorizontal,
  LayoutTemplate,
  RotateCcw,
  ClipboardList,
  GraduationCap
} from 'lucide-react';
import { User, UserRole, DisplaySettings } from './types';
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
import StudentReports from './pages/StudentReports';
import TeachersManager from './pages/TeachersManager';
import ExamSetup from './pages/ExamSetup';
import GradingSystem from './pages/GradingSystem';
import FeeSetup from './pages/FeeSetup';
import StudentwiseFee from './pages/StudentwiseFee';
import ReceiptSetup from './pages/ReceiptSetup';
import GeneralReceipt from './pages/GeneralReceipt';
import FeeSearch from './pages/FeeSearch';
import IdCardGenerator from './pages/IdCardGenerator';
import AuditLog from './pages/AuditLog';
import Curriculum from './pages/Curriculum';
import SchoolSettings from './pages/SchoolSettings';
import DisplayConfigure from './pages/DisplayConfigure';
import { APP_NAME as DEFAULT_APP_NAME, NAVIGATION, MOCK_TEACHERS } from './constants';
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

  const fetchBranding = async () => {
    try {
      const settings = await db.settings.getAll();
      if (settings.school_logo) setSchoolLogo(settings.school_logo);
      if (settings.school_name) setSchoolName(settings.school_name);
    } catch (err) { console.error("Identity Sync Error"); }
  };

  useEffect(() => {
    fetchBranding();
    const channel = supabase.channel('settings-global-sync-v2')
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
          <Route path="/*" element={user ? <Layout user={user} displaySettings={displaySettings} onUpdateDisplay={handleUpdateDisplay} onLogout={handleLogout} schoolLogo={schoolLogo} schoolName={schoolName} darkMode={darkMode} setDarkMode={setDarkMode} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

interface LayoutProps {
  user: User;
  displaySettings: DisplaySettings;
  onUpdateDisplay: (settings: DisplaySettings) => void;
  onLogout: () => void;
  schoolLogo: string | null;
  schoolName: string;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, displaySettings, onUpdateDisplay, onLogout, schoolLogo, schoolName, darkMode, setDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isCloudActive, setIsCloudActive] = useState(true);
  const [isCustomizing, setIsCustomizing] = useState(false);
  
  const [orderedNav, setOrderedNav] = useState<any[]>([]);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const defaultNav = (NAVIGATION as any)[user.role] || [];
    const savedOrder = localStorage.getItem(`nav_order_${user.role}`);
    
    if (savedOrder) {
      try {
        const savedNames = JSON.parse(savedOrder) as string[];
        const ordered = savedNames
          .map(name => defaultNav.find((item: any) => item.name === name))
          .filter(Boolean);
        const remaining = defaultNav.filter((item: any) => !savedNames.includes(item.name));
        setOrderedNav([...ordered, ...remaining]);
      } catch (e) { setOrderedNav(defaultNav); }
    } else { setOrderedNav(defaultNav); }
  }, [user.role]);

  useEffect(() => {
    const interval = setInterval(async () => {
       const { error } = await supabase.from('settings').select('key', { count: 'exact', head: true }).limit(1);
       setIsCloudActive(!error);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const copyListItems = [...orderedNav];
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setOrderedNav(copyListItems);
      localStorage.setItem(`nav_order_${user.role}`, JSON.stringify(copyListItems.map(i => i.name)));
    }
  };

  const resetOrder = () => {
    const defaultNav = (NAVIGATION as any)[user.role] || [];
    setOrderedNav(defaultNav);
    localStorage.removeItem(`nav_order_${user.role}`);
    setIsCustomizing(false);
  };

  return (
    <div className="min-h-screen flex transition-colors duration-300 relative bg-slate-50 dark:bg-slate-950 app-container">
      
      <div className="fixed inset-0 z-0 bg-custom-overlay no-print"></div>
      <div className="fixed inset-0 z-0 bg-dim-layer no-print"></div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 glass-card">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><LogOutIcon size={32} /></div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2 uppercase tracking-tighter">Sign Out?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">Log out of your institutional account?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold rounded-xl uppercase text-[10px]">Stay</button>
              <button onClick={() => { onLogout(); navigate('/login'); }} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl uppercase text-[10px]">Logout</button>
            </div>
          </div>
        </div>
      )}

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-all duration-300 ease-in-out glass-card ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
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

            <button onClick={() => setIsCustomizing(!isCustomizing)} className={`w-full flex items-center justify-center gap-2 py-2 mt-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${isCustomizing ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:text-indigo-600'}`}>
              <LayoutTemplate size={12} /> {isCustomizing ? 'Stop Customizing' : 'Customize Menu'}
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar relative z-10">
            {orderedNav.map((item: any, index: number) => {
              const isActive = location.pathname === item.path;
              return (
                <div key={item.name} draggable={isCustomizing} onDragStart={() => handleDragStart(index)} onDragEnter={() => handleDragEnter(index)} onDragEnd={handleDragEnd} onDragOver={(e) => e.preventDefault()} className={`relative flex items-center group ${isCustomizing ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                  {isCustomizing && <div className="absolute -left-2 text-indigo-400 opacity-50 group-hover:opacity-100"><GripVertical size={14} /></div>}
                  <Link to={isCustomizing ? '#' : item.path} onClick={(e) => { if (isCustomizing) e.preventDefault(); else setSidebarOpen(false); }} className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-indigo-600'} ${isCustomizing ? 'pointer-events-none' : ''}`}>
                    <span className={`${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>{item.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{item.name}</span>
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 relative z-10">
            {isCustomizing && <button onClick={resetOrder} className="w-full flex items-center justify-center gap-2 py-3 mb-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-rose-500 transition-all"><RotateCcw size={14} /> Reset Order</button>}
            <div className={`px-4 py-2 flex items-center justify-between text-[8px] font-black uppercase tracking-widest rounded-lg border ${isCloudActive ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-900' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-100 dark:border-rose-900'}`}>
              <div className="flex items-center gap-2"><Activity size={10} className={isCloudActive ? 'animate-pulse' : ''} /><span>Cloud {isCloudActive ? 'Active' : 'Offline'}</span></div>
              {isCloudActive && <Check size={10} />}
            </div>
            <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center gap-3 px-4 py-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-sm border border-rose-100 dark:border-rose-900/50"><LogOutIcon size={18} /> Sign Out Terminal</button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 no-print glass-card">
          <button className="lg:hidden p-2 text-slate-600 dark:text-slate-400" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
          <div className="flex items-center gap-3 pl-2 cursor-pointer" onClick={() => navigate('/admin/branding')}>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 dark:text-white leading-none">{user.name}</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black mt-1 uppercase tracking-widest">{user.role}</p>
            </div>
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-bold overflow-hidden shadow-sm">
              {user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" alt="Profile" /> : user.name.charAt(0)}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto relative">
          <Routes>
            <Route path="/" element={<Navigate to={`/${user.role.toLowerCase()}/dashboard`} />} />
            <Route path="/admin/dashboard" element={<Dashboard user={user} schoolLogo={schoolLogo} onUpdateLogo={() => navigate('/admin/branding')} />} />
            <Route path="/admin/branding" element={<SchoolSettings user={user} />} />
            <Route path="/admin/display-config" element={<DisplayConfigure user={user} settings={displaySettings} onUpdateSettings={onUpdateDisplay} />} />
            <Route path="/admin/students" element={<StudentsManager user={user} />} />
            <Route path="/admin/reports" element={<StudentReports user={user} schoolLogo={schoolLogo} schoolName={schoolName} />} />
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
            
            <Route path="/teacher/dashboard" element={<Dashboard user={user} schoolLogo={schoolLogo} onUpdateLogo={() => {}} />} />
            <Route path="/teacher/attendance" element={<Attendance user={user} />} />
            <Route path="/teacher/homework" element={<Homework user={user} />} />
            <Route path="/teacher/marks-entry" element={<MarksEntry user={user} />} />
            <Route path="/student/dashboard" element={<Dashboard user={user} schoolLogo={schoolLogo} onUpdateLogo={() => {}} />} />
            <Route path="/student/attendance" element={<Attendance user={user} />} />
            <Route path="/student/marksheet" element={<MarksheetGenerator user={user} schoolLogo={schoolLogo} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
