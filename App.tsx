
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
  Edit2
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
import { APP_NAME, NAVIGATION, MOCK_TEACHERS } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('school_app_user');
    if (saved) {
      const parsedUser = JSON.parse(saved) as User;
      const persistentImage = localStorage.getItem(`profile_image_v2_${parsedUser.email}`);
      if (persistentImage) {
        parsedUser.profileImage = persistentImage;
      }
      return parsedUser;
    }
    return null;
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [schoolLogo, setSchoolLogo] = useState<string | null>(() => {
    return localStorage.getItem('school_app_logo');
  });

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
    const persistentImage = localStorage.getItem(`profile_image_v2_${userData.email}`);
    if (persistentImage) {
      userData.profileImage = persistentImage;
    }
    setUser(userData);
    localStorage.setItem('school_app_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('school_app_user');
  };

  const handleUpdateUser = (updatedUser: User) => {
    if (updatedUser.profileImage) {
      localStorage.setItem(`profile_image_v2_${updatedUser.email}`, updatedUser.profileImage);
    } else {
      localStorage.removeItem(`profile_image_v2_${updatedUser.email}`);
    }
    setUser(updatedUser);
    localStorage.setItem('school_app_user', JSON.stringify(updatedUser));
  };

  const handleUpdateLogo = (logoData: string | null) => {
    if (logoData === null) {
      localStorage.removeItem('school_app_logo');
      setSchoolLogo(null);
    } else {
      localStorage.setItem('school_app_logo', logoData);
      setSchoolLogo(logoData);
    }
  };

  return (
    <HashRouter>
      <div className={darkMode ? 'dark' : ''}>
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login onLogin={handleLogin} schoolLogo={schoolLogo} /> : <Navigate to="/" />} 
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
                  onUpdateLogo={handleUpdateLogo}
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
  onUpdateLogo: (logo: string | null) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, onUpdateUser, schoolLogo, onUpdateLogo, darkMode, setDarkMode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

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
                    {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : 'E'}
                  </div>
                  <span className="text-sm font-black text-slate-800 dark:text-white tracking-tight leading-tight uppercase truncate max-w-[120px]">{APP_NAME}</span>
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
                  <span className="text-xs font-bold uppercase tracking-widest">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
            {user.role === 'ADMIN' && (
              <button onClick={() => setShowCustomizeModal(true)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 rounded-lg transition-colors font-bold text-xs uppercase tracking-widest">
                <Settings2 size={18} /> Customize Menu
              </button>
            )}
            <button onClick={triggerLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 rounded-lg transition-colors font-bold text-xs uppercase tracking-widest">
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
            <button className="relative p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} /><span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
            </button>
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
            <Route path="/admin/dashboard" element={<Dashboard user={user} schoolLogo={schoolLogo} onUpdateLogo={onUpdateLogo} />} />
            <Route path="/admin/students" element={<StudentsManager user={user} />} />
            <Route path="/admin/id-cards" element={<IdCardGenerator user={user} schoolLogo={schoolLogo} />} />
            <Route path="/admin/teachers" element={<RecordsManager type="TEACHER" />} />
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
            
            <Route path="/teacher/dashboard" element={<Dashboard user={user} schoolLogo={schoolLogo} onUpdateLogo={onUpdateLogo} />} />
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
            
            <Route path="/student/dashboard" element={<Dashboard user={user} schoolLogo={schoolLogo} onUpdateLogo={onUpdateLogo} />} />
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

const RecordsManager: React.FC<{ type: 'TEACHER' }> = ({ type }) => {
  const [records, setRecords] = useState<any[]>(() => {
    const saved = localStorage.getItem(`school_${type.toLowerCase()}s_db`);
    if (saved) return JSON.parse(saved);
    return MOCK_TEACHERS;
  });

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', staffId: '', subject: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(`school_${type.toLowerCase()}s_db`, JSON.stringify(records));
  }, [records, type]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setRecords(records.map(r => r.id === editingId ? { ...r, ...formData } : r));
    } else {
      setRecords([...records, { id: Math.random().toString(36).substr(2, 9), ...formData }]);
    }
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: '', staffId: '', subject: '' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Permanently remove this faculty record?')) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Faculty Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage institutional staff and teaching assignments.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg"><Plus size={18} /> New Faculty</button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
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
                <td className="px-8 py-6 text-slate-500 dark:text-slate-400 text-xs font-bold">{r.staffId}</td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase">{r.subject}</span>
                </td>
                <td className="px-8 py-6 text-right space-x-2">
                  <button onClick={() => { setEditingId(r.id); setFormData(r); setShowModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-all"><Edit2 size={16} /></button>
                  <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-md w-full shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">{editingId ? 'Edit Faculty' : 'New Faculty'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Full Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold dark:text-white" />
              <input type="text" placeholder="Staff ID" required value={formData.staffId} onChange={e => setFormData({...formData, staffId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold dark:text-white" />
              <input type="text" placeholder="Subject Specialization" required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold dark:text-white" />
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-bold dark:text-white">Cancel</button>
              <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default App;
