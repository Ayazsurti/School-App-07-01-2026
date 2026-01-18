
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
  GraduationCap,
  Smartphone,
  MapPin,
  Fingerprint,
  Info,
  Phone,
  UserCircle,
  Heart
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
  const [schoolAddress, setSchoolAddress] = useState<string>('');
  const [schoolEmail, setSchoolEmail] = useState<string>('');
  const [schoolContact, setSchoolContact] = useState<string>('');

  const fetchBranding = async () => {
    try {
      const settings = await db.settings.getAll();
      if (settings.school_logo) setSchoolLogo(settings.school_logo);
      if (settings.school_name) setSchoolName(settings.school_name);
      if (settings.school_address) setSchoolAddress(settings.school_address);
      if (settings.school_email) setSchoolEmail(settings.school_email);
      if (settings.school_contact) setSchoolContact(settings.school_contact);
    } catch (err: any) { 
      console.warn("Branding sync skipped or table missing:", err.message || err); 
    }
  };

  useEffect(() => {
    fetchBranding();
    const channel = supabase.channel('settings-global-sync-v3')
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
          <Route path="/*" element={user ? <Layout user={user} branding={brandingData} displaySettings={displaySettings} onUpdateDisplay={handleUpdateDisplay} onLogout={handleLogout} schoolLogo={schoolLogo} schoolName={schoolName} darkMode={darkMode} setDarkMode={setDarkMode} /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

interface LayoutProps {
  user: User;
  branding: { name: string; logo: string | null; address: string; email: string; contact: string; };
  onUpdateDisplay: (settings: DisplaySettings) => void;
  displaySettings: DisplaySettings;
  onLogout: () => void;
  schoolLogo: string | null;
  schoolName: string;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, branding, onUpdateDisplay, displaySettings, onLogout, schoolLogo, schoolName, darkMode, setDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isCloudActive, setIsCloudActive] = useState(true);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isSavingNav, setIsSavingNav] = useState(false);
  const [fullStudentData, setFullStudentData] = useState<any>(null);
  
  const isStudent = user.role === 'STUDENT';

  // Persistent Navigation State Initialization
  const [orderedNav, setOrderedNav] = useState<any[]>(() => {
    const defaultNav = (NAVIGATION as any)[user.role] || [];
    const cloudOrderKey = `nav_order_${user.role}`;
    const savedOrder = localStorage.getItem(cloudOrderKey);
    
    if (savedOrder) {
      try {
        const savedNames = JSON.parse(savedOrder) as string[];
        const ordered = savedNames
          .map(name => defaultNav.find((item: any) => item.name === name))
          .filter(Boolean);
        const remaining = defaultNav.filter((item: any) => !savedNames.includes(item.name));
        return [...ordered, ...remaining];
      } catch (e) { return defaultNav; }
    }
    return defaultNav;
  });

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  // Fetch full student data if isStudent
  useEffect(() => {
    if (isStudent) {
      const fetchStudentDetails = async () => {
        try {
          const { data, error } = await supabase.from('students').select('*').eq('id', user.id).single();
          if (data) setFullStudentData(data);
        } catch (e) {
          console.warn("Could not fetch full student details from cloud.");
        }
      };
      fetchStudentDetails();
    }
  }, [isStudent, user.id]);

  // Real-time Notification Logic
  useEffect(() => {
    const addNotif = (title: string, msg: string, type: AppNotification['type']) => {
      setNotifications(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        title, message: msg, type, timestamp: new Date(), isRead: false
      }, ...prev].slice(0, 10));
    };

    const channels = [
      supabase.channel('notif-notices').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notices' }, (payload) => {
        addNotif('New Notice Published', payload.new.title, 'NOTICE');
      }).subscribe(),
      supabase.channel('notif-homework').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'homework' }, (payload) => {
        if (payload.new.class_name === user.class) {
          addNotif('New Homework Task', payload.new.title, 'HOMEWORK');
        }
      }).subscribe(),
      supabase.channel('notif-gallery').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gallery' }, (payload) => {
        addNotif('New Gallery Entry', payload.new.name, 'GALLERY');
      }).subscribe(),
      supabase.channel('notif-curriculum').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'curriculum_files' }, (payload) => {
        addNotif('New Study Material', payload.new.title, 'CURRICULUM');
      }).subscribe()
    ];

    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [user]);

  const handleDragStart = (index: number) => { if (!isStudent) dragItem.current = index; };
  const handleDragEnter = (index: number) => { if (!isStudent) dragOverItem.current = index; };
  
  const handleDragEnd = async () => {
    if (isStudent) return;
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const copyListItems = [...orderedNav];
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      dragItem.current = null; dragOverItem.current = null;
      setOrderedNav(copyListItems);
      setIsSavingNav(true);
      const orderNames = copyListItems.map(i => i.name);
      const jsonOrder = JSON.stringify(orderNames);
      const cloudKey = `nav_order_${user.role}`;
      localStorage.setItem(cloudKey, jsonOrder);
      try { await db.settings.update(cloudKey, jsonOrder); } catch (err) {} 
      finally { setTimeout(() => setIsSavingNav(false), 500); }
    } else { dragItem.current = null; dragOverItem.current = null; }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen flex transition-colors duration-300 relative bg-slate-50 dark:bg-slate-950 app-container">
      <div className="fixed inset-0 z-0 bg-custom-overlay no-print"></div>
      <div className="fixed inset-0 z-0 bg-dim-layer no-print"></div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
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

      {/* STUDENT PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-1 shadow-2xl max-w-2xl w-full border border-slate-100 dark:border-slate-800 overflow-hidden relative group">
              <button onClick={() => setShowProfileModal(false)} className="absolute top-8 right-8 p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:bg-rose-500 hover:text-white transition-all z-50"><X size={24}/></button>
              
              <div className="h-32 bg-indigo-600 relative overflow-hidden">
                 <div className="absolute inset-0 neural-grid-white opacity-20"></div>
                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
              </div>

              <div className="p-8 lg:p-12 -mt-20 relative z-10 flex flex-col items-center">
                 <div className="w-44 h-44 bg-white dark:bg-slate-800 rounded-[3rem] border-8 border-white dark:border-slate-900 shadow-2xl overflow-hidden relative group/img">
                    {user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" /> : <UserCircle size={80} className="text-slate-200 m-auto mt-8" />}
                 </div>

                 <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-6 uppercase tracking-tight text-center">{fullStudentData?.full_name || user.name}</h2>
                 <div className="flex gap-2 mt-2">
                    <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">Std {fullStudentData?.class || user.class}-{fullStudentData?.section || user.section}</span>
                    <span className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">Verified identity</span>
                 </div>

                 {isStudent && (
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
                       <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-500 shadow-sm shrink-0"><Fingerprint size={20}/></div>
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">General Register (GR)</p>
                             <p className="text-sm font-black text-slate-800 dark:text-white">{fullStudentData?.gr_number || 'SYNCING...'}</p>
                          </div>
                       </div>
                       <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-500 shadow-sm shrink-0"><Hash size={20}/></div>
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Roll Number</p>
                             <p className="text-sm font-black text-slate-800 dark:text-white">#{fullStudentData?.roll_no || user.rollNo || 'N/A'}</p>
                          </div>
                       </div>
                       <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4 md:col-span-2">
                          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-500 shadow-sm shrink-0"><MapPin size={20}/></div>
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Residence Address</p>
                             <p className="text-xs font-bold text-slate-800 dark:text-white leading-relaxed uppercase">{fullStudentData?.residence_address || 'NOT REGISTERED'}</p>
                          </div>
                       </div>
                       <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-rose-500 shadow-sm shrink-0"><Phone size={20}/></div>
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Father's Number</p>
                             <p className="text-sm font-black text-slate-800 dark:text-white">{fullStudentData?.father_mobile || 'N/A'}</p>
                          </div>
                       </div>
                       <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center text-pink-500 shadow-sm shrink-0"><Heart size={20}/></div>
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Mother's Number</p>
                             <p className="text-sm font-black text-slate-800 dark:text-white">{fullStudentData?.mother_mobile || 'N/A'}</p>
                          </div>
                       </div>
                    </div>
                 )}

                 <button onClick={() => setShowLogoutConfirm(true)} className="mt-10 w-full py-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest shadow-sm border border-rose-100 dark:border-rose-900/50">Logout Account</button>
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

            {!isStudent && (
              <button onClick={() => setIsCustomizing(!isCustomizing)} className={`w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${isCustomizing ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:text-indigo-600'}`}>
                {isSavingNav ? <Loader2 size={12} className="animate-spin" /> : <LayoutTemplate size={12} />} 
                {isCustomizing ? 'Stop Customizing' : 'Customize Menu'}
              </button>
            )}
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar relative z-10">
            {orderedNav.map((item: any, index: number) => {
              const isActive = location.pathname === item.path;
              return (
                <div 
                  key={item.name} 
                  draggable={isCustomizing && !isStudent} 
                  onDragStart={() => handleDragStart(index)} 
                  onDragEnter={() => handleDragEnter(index)} 
                  onDragEnd={handleDragEnd} 
                  onDragOver={(e) => e.preventDefault()} 
                  className={`relative flex items-center group transition-all ${isCustomizing && !isStudent ? 'cursor-grab active:cursor-grabbing hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg border border-transparent hover:border-indigo-100' : ''}`}
                >
                  {isCustomizing && !isStudent && (
                    <div className="absolute left-1 text-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity">
                      <GripVertical size={14} />
                    </div>
                  )}
                  <Link 
                    to={isCustomizing && !isStudent ? '#' : item.path} 
                    onClick={(e) => { if (isCustomizing && !isStudent) e.preventDefault(); else setSidebarOpen(false); }} 
                    className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-indigo-600'} ${isCustomizing && !isStudent ? 'pointer-events-none ml-4' : ''}`}
                  >
                    <span className={`${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>{item.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{item.name}</span>
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 relative z-10">
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
          
          <div className="flex items-center gap-6">
             <div className="relative">
                <button 
                  onClick={() => { setShowNotifications(!showNotifications); setNotifications(prev => prev.map(n => ({...n, isRead: true}))); }}
                  className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:text-indigo-600 transition-all relative"
                >
                   <Bell size={20} className={unreadCount > 0 ? 'animate-[bell-pulse_1s_infinite]' : ''} />
                   {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">{unreadCount}</span>}
                </button>

                {showNotifications && (
                   <div className="absolute top-full right-0 mt-4 w-80 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-top-2">
                      <div className="p-5 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                         <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest">Global Notifications</h4>
                         <button onClick={() => setNotifications([])} className="text-[8px] font-bold text-slate-400 uppercase hover:text-rose-500 transition-colors">Clear All</button>
                      </div>
                      <div className="max-h-80 overflow-y-auto custom-scrollbar">
                         {notifications.length > 0 ? notifications.map(n => (
                           <div key={n.id} className="p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">{n.title}</p>
                              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{n.message}</p>
                              <p className="text-[8px] text-slate-400 mt-1 uppercase">{n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                           </div>
                         )) : (
                           <div className="py-12 text-center">
                              <Activity size={24} className="mx-auto text-slate-200 dark:text-slate-700 mb-2" />
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No active logs</p>
                           </div>
                         )}
                      </div>
                   </div>
                )}
             </div>

             <div className="flex items-center gap-3 pl-2 cursor-pointer group" onClick={() => setShowProfileModal(true)}>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-black text-slate-800 dark:text-white leading-none group-hover:text-indigo-600 transition-colors">{fullStudentData?.full_name || user.name}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black mt-1 uppercase tracking-widest">{user.role}</p>
                </div>
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-bold overflow-hidden shadow-sm border-2 border-transparent group-hover:border-indigo-600 transition-all">
                  {user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" alt="Profile" /> : <UserCircle size={24} />}
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

const Hash = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
);

export default App;
