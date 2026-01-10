
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
  BookOpen
} from 'lucide-react';
import { User, UserRole } from './types';
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
import ExamSetup from './pages/ExamSetup';
import FeeSetup from './pages/FeeSetup';
import StudentwiseFee from './pages/StudentwiseFee';
import ReceiptSetup from './pages/ReceiptSetup';
import GeneralReceipt from './pages/GeneralReceipt';
import FeeSearch from './pages/FeeSearch';
import IdCardGenerator from './pages/IdCardGenerator';
import AuditLog from './pages/AuditLog';
import Curriculum from './pages/Curriculum';
import SchoolSettings from './pages/SchoolSettings';
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('school_app_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
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
    const channel = supabase.channel('settings-global-sync')
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

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('school_app_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('school_app_user');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('school_app_user', JSON.stringify(updatedUser));
  };

  return (
    <HashRouter>
      <div className={darkMode ? 'dark' : ''}>
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login onLogin={handleLogin} schoolLogo={schoolLogo} schoolName={schoolName} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/*" 
            element={
              user ? (
                <Layout 
                  user={user} 
                  onLogout={handleLogout} 
                  onUpdateUser={handleUpdateUser} 
                  schoolLogo={schoolLogo} 
                  schoolName={schoolName}
                  darkMode={darkMode}
                  setDarkMode={setDarkMode}
                />
              ) : <Navigate to="/login" />
            } 
          />
        </Routes>
      </div>
    </HashRouter>
  );
};

interface LayoutProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  schoolLogo: string | null;
  schoolName: string;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, onUpdateUser, schoolLogo, schoolName, darkMode, setDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  const [hiddenNavItems, setHiddenNavItems] = useState<string[]>(() => {
    const saved = localStorage.getItem(`nav_visibility_${user.role}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [navOrder, setNavOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`nav_order_${user.role}`);
    if (saved) return JSON.parse(saved);
    const defaultNav = (NAVIGATION as any)[user.role] || [];
    return defaultNav.map((n: any) => n.name);
  });

  const location = useLocation();
  const navigate = useNavigate();

  // GLOBAL REALTIME NOTIFICATION LISTENER
  useEffect(() => {
    const notificationChannel = supabase.channel('global-app-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notices' }, (payload) => {
        triggerNotification('NOTICE', 'New Official Broadcast', payload.new.title);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gallery' }, (payload) => {
        triggerNotification('GALLERY', 'New Photo Added', payload.new.name);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'videos' }, (payload) => {
        triggerNotification('VIDEO', 'New Educational Video', payload.new.name);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'curriculum_files' }, (payload) => {
        triggerNotification('CURRICULUM', 'New Curriculum Asset', payload.new.title);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'homework' }, (payload) => {
        triggerNotification('HOMEWORK', 'New Homework Assigned', payload.new.title);
      })
      .subscribe();

    return () => { supabase.removeChannel(notificationChannel); };
  }, []);

  const triggerNotification = (type: AppNotification['type'], title: string, message: string) => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      type, title, message,
      timestamp: new Date(),
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 15));
    setActiveToast(newNotif);
    setTimeout(() => setActiveToast(null), 5000);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setShowNotifications(false);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const allNavItems = useMemo(() => {
    const baseNav = (NAVIGATION as any)[user.role] || [];
    const ordered = [...navOrder]
      .map(name => baseNav.find((n: any) => n.name === name))
      .filter(Boolean);
    
    baseNav.forEach((item: any) => {
      if (!ordered.find(o => o.name === item.name)) {
        ordered.push(item);
      }
    });
    return ordered;
  }, [user.role, navOrder]);
  
  const visibleNavItems = useMemo(() => {
    return allNavItems.filter((item: any) => !hiddenNavItems.includes(item.name));
  }, [allNavItems, hiddenNavItems]);

  const toggleNavVisibility = (name: string) => {
    setHiddenNavItems(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name];
      localStorage.setItem(`nav_visibility_${user.role}`, JSON.stringify(next));
      return next;
    });
  };

  const handleMoveNavItem = (fromIndex: number, toIndex: number) => {
    const newOrder = [...allNavItems.map(n => n.name)];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    
    setNavOrder(newOrder);
    localStorage.setItem(`nav_order_${user.role}`, JSON.stringify(newOrder));
  };

  const triggerLogout = () => {
    setShowLogoutConfirm(true);
    setShowProfileModal(false);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Real-time Push Notification Toast */}
      {activeToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] animate-in slide-in-from-top-4 fade-in duration-500 w-full max-w-sm px-4">
           <div className="bg-indigo-600 text-white p-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-indigo-400 backdrop-blur-xl">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                 {activeToast.type === 'VIDEO' ? <Video size={24}/> : 
                  activeToast.type === 'GALLERY' ? <ImageIcon size={24}/> : 
                  activeToast.type === 'CURRICULUM' ? <BookOpen size={24}/> :
                  activeToast.type === 'HOMEWORK' ? <PencilRuler size={24}/> :
                  <Megaphone size={24}/>}
              </div>
              <div className="min-w-0 flex-1">
                 <p className="font-black text-[10px] uppercase tracking-widest text-indigo-100">{activeToast.title}</p>
                 <p className="text-sm font-bold truncate">{activeToast.message}</p>
              </div>
              <button onClick={() => setActiveToast(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={18}/></button>
           </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <LogOut size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-2">Sign Out?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-center mb-8 font-medium">Are you sure you want to log out of your account?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl">Stay</button>
              <button onClick={confirmLogout} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl">Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <ProfileModal 
          user={user} 
          onClose={() => setShowProfileModal(false)} 
          onSave={(photo) => onUpdateUser({ ...user, profileImage: photo || undefined })}
          onLogout={triggerLogout}
        />
      )}

      {showCustomizeModal && user.role === 'ADMIN' && (
        <CustomizeSidebarModal 
          items={allNavItems}
          hiddenItems={hiddenNavItems}
          onToggleVisibility={toggleNavVisibility}
          onMove={handleMoveNavItem}
          onClose={() => setShowCustomizeModal(false)}
        />
      )}

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-all duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-sm shadow-indigo-100">
                    {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={20} />}
                  </div>
                  <span className="text-[10px] font-black text-slate-800 dark:text-white tracking-tight leading-tight uppercase truncate max-w-[120px]">{schoolName}</span>
               </div>
               <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                 {darkMode ? <Sun size={18} /> : <Moon size={18} />}
               </button>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
            {visibleNavItems.map((item: any) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.name} to={item.path} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-100' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-indigo-600'}`}>
                  <span className={`${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>{item.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <div className="px-4 py-2 flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-50 dark:border-slate-800 rounded-lg mb-4">
              <Cloud size={10} className="text-indigo-500" /> Cloud Sync Active
            </div>
            {user.role === 'ADMIN' && (
              <button onClick={() => setShowCustomizeModal(true)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 rounded-lg transition-colors font-bold text-[10px] uppercase tracking-widest text-left">
                <Settings2 size={18} /> Customize Menu
              </button>
            )}
            <button onClick={triggerLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 rounded-lg transition-colors font-bold text-[10px] uppercase tracking-widest text-left">
              <Power size={18} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 no-print">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-600 dark:text-slate-400" onClick={() => setSidebarOpen(true)}><Menu size={24} /></button>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Alert Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all ${unreadCount > 0 ? 'animate-pulse text-indigo-600 dark:text-indigo-400' : ''}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Center Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-80 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-[1000] animate-in fade-in slide-in-from-top-2">
                   <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                      <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest">Real-time Updates</h3>
                      <button onClick={markAllAsRead} className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 hover:underline">Clear All</button>
                   </div>
                   <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map(n => (
                          <div key={n.id} className={`p-5 border-b border-slate-50 dark:border-slate-800 transition-colors ${n.isRead ? 'opacity-50' : 'bg-indigo-50/20'}`}>
                             <div className="flex gap-4">
                                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-700 shrink-0">
                                   {n.type === 'VIDEO' ? <Video size={18}/> : 
                                    n.type === 'GALLERY' ? <ImageIcon size={18}/> : 
                                    n.type === 'CURRICULUM' ? <BookOpen size={18}/> :
                                    n.type === 'HOMEWORK' ? <PencilRuler size={18}/> :
                                    <Megaphone size={18}/>}
                                </div>
                                <div className="min-w-0">
                                   <p className="font-black text-[10px] text-slate-900 dark:text-white uppercase leading-none mb-1">{n.title}</p>
                                   <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mb-2">{n.message}</p>
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-20 text-center">
                           <Bell size={32} className="text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                           <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">No Recent Alerts</p>
                        </div>
                      )}
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-slate-800/30 text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Cloud Center Active</p>
                   </div>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />
            <div className="flex items-center gap-3 pl-2 group cursor-pointer" onClick={() => setShowProfileModal(true)}>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 dark:text-white leading-none group-hover:text-indigo-600 transition-colors">{user.name}</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black mt-1 uppercase tracking-widest">{user.role}</p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center font-bold overflow-hidden shadow-sm">
                {user.profileImage ? <img src={user.profileImage} className="w-full h-full object-cover" alt="Profile" /> : user.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to={`/${user.role.toLowerCase()}/dashboard`} />} />
            <Route path="/admin/dashboard" element={<Dashboard user={user} schoolLogo={schoolLogo} onUpdateLogo={() => navigate('/admin/branding')} />} />
            <Route path="/admin/branding" element={<SchoolSettings user={user} />} />
            <Route path="/admin/students" element={<StudentsManager user={user} />} />
            <Route path="/admin/id-cards" element={<IdCardGenerator user={user} schoolLogo={schoolLogo} />} />
            <Route path="/admin/teachers" element={<RecordsManager type="TEACHER" user={user} />} />
            <Route path="/admin/homework" element={<Homework user={user} />} />
            <Route path="/admin/curriculum" element={<Curriculum user={user} />} />
            <Route path="/admin/attendance" element={<Attendance user={user} />} />
            <Route path="/admin/timetable" element={<Timetable user={user} />} />
            <Route path="/admin/marks-setup" element={<MarksSetup user={user} />} />
            <Route path="/admin/marks-entry" element={<MarksEntry user={user} />} />
            <Route path="/admin/food-chart" element={<FoodChart user={user} />} />
            <Route path="/admin/sms" element={<SMSPanel user={user} />} />
            <Route path="/admin/marksheet" element={<MarksheetGenerator user={user} schoolLogo={schoolLogo} />} />
            <Route path="/admin/exams" element={<ExamSetup user={user} />} />
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
            <Route path="/teacher/curriculum" element={<Curriculum user={user} />} />
            <Route path="/teacher/homework" element={<Homework user={user} />} />
            <Route path="/teacher/timetable" element={<Timetable user={user} />} />
            <Route path="/teacher/food-chart" element={<FoodChart user={user} />} />
            <Route path="/teacher/sms" element={<SMSPanel user={user} />} />
            <Route path="/teacher/fees" element={<FeesManagement user={user} />} />
            <Route path="/teacher/marks" element={<MarksEntry user={user} />} />
            <Route path="/teacher/marksheet" element={<MarksheetGenerator user={user} schoolLogo={schoolLogo} />} />
            <Route path="/teacher/notices" element={<NoticeBoard user={user} />} />
            
            <Route path="/student/dashboard" element={<Dashboard user={user} schoolLogo={schoolLogo} onUpdateLogo={() => {}} />} />
            <Route path="/student/attendance" element={<Attendance user={user} />} />
            <Route path="/student/curriculum" element={<Curriculum user={user} />} />
            <Route path="/student/homework" element={<Homework user={user} />} />
            <Route path="/student/food-chart" element={<FoodChart user={user} />} />
            <Route path="/student/timetable" element={<Timetable user={user} />} />
            <Route path="/student/marksheet" element={<MarksheetGenerator user={user} schoolLogo={schoolLogo} />} />
            <Route path="/student/fees" element={<FeesManager user={user} />} />
            <Route path="/student/notices" element={<NoticeBoard user={user} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (photo: string | null) => void;
  onLogout: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onSave, onLogout }) => {
  const [photo, setPhoto] = useState<string | null>(user.profileImage || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target?.result as string;
        setPhoto(data);
        onSave(data);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-1 shadow-2xl max-md w-full animate-in zoom-in-95 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">User Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={20} /></button>
        </div>
        <div className="p-10 flex flex-col items-center">
          <div className="relative group mb-6">
            <div className="w-32 h-32 bg-indigo-100 dark:bg-indigo-900/30 rounded-[2rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-4xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl">
              {photo ? <img src={photo} className="w-full h-full object-cover" alt="Profile" /> : user.name.charAt(0)}
            </div>
            <button onClick={() => inputRef.current?.click()} className="absolute bottom-0 right-0 p-3 bg-indigo-600 text-white rounded-2xl shadow-lg hover:scale-110 transition-transform"><Camera size={18} /></button>
            <input type="file" ref={inputRef} onChange={handleUpload} className="hidden" accept="image/*" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{user.name}</h2>
          <p className="text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-widest text-xs mt-1">{user.role}</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-4">{user.email}</p>
          <div className="w-full h-px bg-slate-100 dark:bg-slate-800 my-8" />
          <button onClick={onLogout} className="w-full py-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-rose-600 hover:text-white transition-all uppercase text-xs tracking-widest">
            <Power size={18} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

interface CustomizeSidebarModalProps {
  items: any[];
  hiddenItems: string[];
  onToggleVisibility: (name: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onClose: () => void;
}

const CustomizeSidebarModal: React.FC<CustomizeSidebarModalProps> = ({ items, hiddenItems, onToggleVisibility, onMove, onClose }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
  };

  const handleDrop = (toIndex: number) => {
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      onMove(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-1 shadow-2xl max-lg w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Customize Menu</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hold and drag the handles to reorder sidebar entries.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {items.map((item, idx) => (
            <div 
              key={item.name} 
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              className={`flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all ${draggedIndex === idx ? 'opacity-40 border-indigo-500 scale-95' : 'hover:border-indigo-200 dark:hover:border-indigo-800'}`}
            >
              <div className="cursor-grab active:cursor-grabbing p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-500 transition-colors">
                <GripVertical size={20} />
              </div>
              <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-100 dark:border-slate-700">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest truncate">{item.name}</p>
              </div>
              <button 
                onClick={() => onToggleVisibility(item.name)} 
                className={`p-2.5 rounded-xl transition-all ${hiddenItems.includes(item.name) ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}
              >
                {hiddenItems.includes(item.name) ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
          <button onClick={onClose} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg uppercase text-xs tracking-widest">Done</button>
        </div>
      </div>
    </div>
  );
};

const RecordsManager: React.FC<{ type: 'TEACHER', user: User }> = ({ type, user }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', staffId: '', subject: '', mobile: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchCloudData = async () => {
    try {
      const data = await db.teachers.getAll();
      setRecords(data);
    } catch (err) { console.error("Faculty Sync Error"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('realtime-teachers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await db.teachers.upsert({ ...formData, id: editingId || '' });
      createAuditLog(user, editingId ? 'UPDATE' : 'CREATE', 'Faculty', `Cloud Sync Faculty: ${formData.name}`);
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', staffId: '', subject: '', mobile: '' });
    } catch (err) { alert("Failed to save faculty record to cloud."); }
    finally { setIsLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently remove this faculty record from the cloud?')) {
      try {
        await db.teachers.delete(id);
        createAuditLog(user, 'DELETE', 'Faculty', `Purged faculty ID: ${id}`);
      } catch (err) { alert("Delete failed."); }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Refreshing Faculty Registry...</span>
           </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Faculty Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage institutional staff assignments on the cloud.</p>
        </div>
        <button onClick={() => { setEditingId(null); setFormData({name:'', staffId:'', subject:'', mobile:''}); setShowModal(true); }} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"><Plus size={18} /> New Faculty</button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center animate-pulse">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Cloud Directory...</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-8 py-5">Staff Identity</th>
                <th className="px-8 py-5">ID Reference</th>
                <th className="px-8 py-5">Specialization</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-8 py-6 font-black text-slate-800 dark:text-white uppercase text-sm">{r.name}</td>
                  <td className="px-8 py-6 text-slate-500 dark:text-slate-400 text-xs font-bold">{r.staff_id || r.staffId}</td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase">{r.subject}</span>
                  </td>
                  <td className="px-8 py-6 text-right space-x-2">
                    <button onClick={() => { setEditingId(r.id); setFormData({name: r.name, staffId: r.staff_id || r.staffId, subject: r.subject, mobile: r.mobile}); setShowModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-slate-300 font-bold uppercase text-xs tracking-widest">No faculty registered in the cloud.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-md w-full shadow-2xl space-y-6 border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingId ? 'Modify Faculty Record' : 'Enroll New Faculty'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Legal Name</label>
                <input type="text" placeholder="Full Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Staff ID</label>
                  <input type="text" placeholder="Staff ID" required value={formData.staffId} onChange={e => setFormData({...formData, staffId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Contact Number</label>
                  <input type="text" placeholder="Mobile No" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Academic Specialization</label>
                <input type="text" placeholder="Subject Specialization" required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 uppercase text-[10px] tracking-widest">Discard</button>
              <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest">Commit to Cloud</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const Megaphone = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
);

export default App;
