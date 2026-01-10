
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { User, FeeRecord, Notice } from '../types';
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  Check,
  Shield,
  Lock,
  Sparkles,
  HandCoins,
  Star,
  Pencil,
  Book,
  Rocket,
  Megaphone,
  X,
  ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  user: User;
  schoolLogo: string | null;
  onUpdateLogo: (logo: string | null) => void;
}

const SchoolEmblem = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full p-1">
    <defs>
      <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
        <stop offset="50%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#d97706', stopOpacity: 1 }} />
      </linearGradient>
      <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#4f46e5', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#312e81', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <path d="M50 5 L15 20 V50 C15 70 30 85 50 95 C70 85 85 70 85 50 V20 L50 5 Z" fill="url(#blueGradient)" stroke="#fff" strokeWidth="2" />
    <path d="M35 45 Q50 40 65 45 V65 Q50 60 35 65 Z" fill="url(#goldGradient)" />
    <path d="M50 42 V62" stroke="#312e81" strokeWidth="1" />
    <path d="M50 20 Q55 30 50 40 Q45 30 50 20" fill="#ef4444">
      <animate attributeName="opacity" values="0.8;1;0.8" dur="1s" repeatCount="indefinite" />
    </path>
    <path d="M48 38 H52 L50 45 Z" fill="#92400e" />
    <circle cx="30" cy="30" r="2" fill="#fbbf24" />
    <circle cx="70" cy="30" r="2" fill="#fbbf24" />
    <circle cx="50" cy="80" r="3" fill="#fbbf24" />
  </svg>
);

const Dashboard: React.FC<DashboardProps> = ({ user, schoolLogo, onUpdateLogo }) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [dailyFees, setDailyFees] = useState(0);
  const [importantNotice, setImportantNotice] = useState<Notice | null>(null);
  const [showNoticePopup, setShowNoticePopup] = useState(false);

  const isStudent = user.role === 'STUDENT';

  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${10 + Math.random() * 10}s`,
      icon: [Star, Pencil, Book, Rocket][i % 4]
    }));
  }, []);

  useEffect(() => {
    const calculateDailyFees = () => {
      const today = new Date().toISOString().split('T')[0];
      const savedFees = localStorage.getItem('school_fees_ledger_v2');
      if (savedFees) {
        const ledger: FeeRecord[] = JSON.parse(savedFees);
        const totalToday = ledger
          .filter(record => record.date === today && record.status === 'PAID')
          .reduce((sum, record) => sum + record.amount, 0);
        setDailyFees(totalToday);
      }
    };
    
    if (user.role === 'STUDENT') {
        const savedNotices = localStorage.getItem('school_notices_db');
        if (savedNotices) {
            const notices: Notice[] = JSON.parse(savedNotices);
            const urgent = notices.find(n => n.category === 'URGENT');
            if (urgent) {
                const seen = sessionStorage.getItem(`seen_notice_${urgent.id}`);
                if (!seen) {
                    setImportantNotice(urgent);
                    setShowNoticePopup(true);
                }
            }
        }
    }

    calculateDailyFees();
  }, [user.role]);

  const stats = [
    { label: 'Total Students', value: '1,248', icon: <GraduationCap />, color: 'bg-indigo-600' },
    { label: 'Total Teachers', value: '84', icon: <Users />, color: 'bg-emerald-600' },
    { label: 'Daily Collection', value: `₹${dailyFees.toLocaleString('en-IN')}`, icon: <HandCoins />, color: 'bg-amber-500', isDaily: true },
    { label: 'Attendance Rate', value: '92%', icon: <Calendar />, color: 'bg-rose-600' },
  ];

  const chartData = [
    { name: 'Mon', attendance: 85, performance: 70 },
    { name: 'Tue', attendance: 92, performance: 75 },
    { name: 'Wed', attendance: 88, performance: 82 },
    { name: 'Thu', attendance: 95, performance: 78 },
    { name: 'Fri', attendance: 90, performance: 85 },
  ];

  const recentActivities = [
    { id: 1, type: 'attendance', message: 'Primary-A attendance logged', time: '10 mins ago', status: 'success' },
    { id: 2, type: 'marks', message: 'Chemistry Mid-terms uploaded', time: '2 hours ago', status: 'info' },
    { id: 3, type: 'notice', message: 'Library hours extended for finals', time: '5 hours ago', status: 'warning' },
    { id: 4, type: 'fee', message: 'Daily reconciliation complete', time: '1 day ago', status: 'success' },
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdateLogo(event.target?.result as string);
        setLogoUploading(false);
        setShowSavedFeedback(true);
        setTimeout(() => setShowSavedFeedback(false), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const closeNoticePopup = () => {
    if (importantNotice) {
      sessionStorage.setItem(`seen_notice_${importantNotice.id}`, 'true');
    }
    setShowNoticePopup(false);
  };

  const canManageLogo = user.role === 'ADMIN';

  // Student Dashboard: ONLY WELCOME MESSAGE
  if (isStudent) {
    return (
      <div className="min-h-full dashboard-rainbow-bg -m-4 lg:-m-8 p-4 lg:p-8 animate-in fade-in duration-700 flex flex-col items-center justify-center relative overflow-hidden">
        {particles.map((p) => (
          <div 
            key={p.id} 
            className="floating-icon" 
            style={{ left: p.left, top: '110%', animationDelay: p.delay, animationDuration: p.duration }}
          >
            <p.icon size={24 + (p.id % 20)} />
          </div>
        ))}
        
        <div className="text-center relative z-10 space-y-4">
           <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="text-amber-500 animate-bounce" size={40} />
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-tight rainbow-text drop-shadow-sm uppercase">
            WELCOME TO EDUCATION WORLD.
          </h1>
          <div className="w-32 h-1.5 bg-indigo-600 mx-auto rounded-full opacity-30 mt-6"></div>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xl mt-4">Your personalized learning dashboard is ready.</p>
        </div>

        {showNoticePopup && importantNotice && (
          <div className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-500">
             <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl border border-white/10 relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-rose-100 dark:border-rose-900/50">
                   <Megaphone size={40} className="animate-bounce" />
                </div>
                <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] mb-2">High Priority Announcement</h3>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight mb-4">{importantNotice.title}</h4>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed mb-8 line-clamp-3 italic">
                  "{importantNotice.content}"
                </p>
                <div className="flex gap-3">
                   <button onClick={closeNoticePopup} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-colors">Dismiss</button>
                   <button onClick={() => { closeNoticePopup(); window.location.hash = '/student/notices'; }} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest">
                      Read Full News <ArrowRight size={14} />
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full dashboard-rainbow-bg -m-4 lg:-m-8 p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 relative">
      {particles.map((p) => (
        <div 
          key={p.id} 
          className="floating-icon" 
          style={{ left: p.left, top: '110%', animationDelay: p.delay, animationDuration: p.duration }}
        >
          <p.icon size={24 + (p.id % 20)} />
        </div>
      ))}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 relative z-10">
        <div className="group">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-amber-500 animate-bounce" size={24} />
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">Institutional Console</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter leading-tight rainbow-text drop-shadow-sm uppercase">
            WELCOME TO EDUCATION WORLD.
          </h1>
          <p className="text-slate-700 dark:text-slate-300 font-bold text-lg mt-1 flex items-center gap-2">
            Ready for a day of wonder and discovery? <Rocket className="text-indigo-600 animate-pulse" size={20} />
          </p>
        </div>
        
        {canManageLogo && (
          <div className="rainbow-border rounded-[2.5rem] p-0.5 shadow-2xl bouncy-hover">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-5 rounded-[2.4rem] flex items-center gap-5 group relative overflow-hidden border border-white/20 dark:border-slate-800">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[1.8rem] border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-400 shadow-xl flex-shrink-0 relative">
                {schoolLogo ? (
                  <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" />
                ) : (
                  <SchoolEmblem />
                )}
                <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Lock size={16} className="text-indigo-600" />
                </div>
              </div>
              <div className="relative pr-2">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none flex items-center gap-1.5">
                    <Shield size={10} strokeWidth={3} /> {schoolLogo ? 'Official Brand Verified' : 'Standard Emblem Active'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => logoInputRef.current?.click()}
                    className="text-[10px] font-black text-slate-900 dark:text-white hover:text-white flex items-center gap-2 transition-all uppercase tracking-widest bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 px-6 py-2.5 rounded-xl shadow-sm"
                  >
                    <Upload size={14} /> Update Logo
                  </button>
                  {showSavedFeedback && (
                    <div className="absolute -top-12 left-0 flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg animate-bounce">
                      <Check size={12} strokeWidth={3} /> SYNCED
                    </div>
                  )}
                </div>
                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
        {stats.map((stat) => (<StatCard key={stat.label} stat={stat} />))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-xl border border-white/50 dark:border-slate-800 group">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <h3 className="font-black text-slate-900 dark:text-white text-2xl tracking-tight flex items-center gap-3">
              <Star className="text-amber-500 fill-amber-500" size={24} /> Learning Momentum
            </h3>
            <div className="flex gap-2">
              <button className="px-5 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg">Weekly Log</button>
              <button className="px-5 py-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-all border border-white/20 dark:border-slate-700">Monthly</button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} />
                <Tooltip 
                  cursor={{fill: 'rgba(99, 102, 241, 0.05)'}}
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '20px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)'}}
                />
                <Bar dataKey="attendance" fill="#6366f1" radius={[12, 12, 0, 0]} barSize={40} />
                <Bar dataKey="performance" fill="rgba(16, 185, 129, 0.2)" radius={[12, 12, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl shadow-indigo-100/20 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000"></div>
          <h3 className="font-black text-white text-2xl tracking-tight mb-8 flex items-center gap-3">
             <Clock size={24} className="text-indigo-400" /> Live Feed
          </h3>
          <div className="space-y-8 relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-white/10"></div>
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex gap-6 relative z-10 group/item">
                <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm border transition-transform group/item:scale-125 ${
                  activity.status === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                  activity.status === 'warning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                }`}>
                  {activity.status === 'success' ? <CheckCircle2 size={16} strokeWidth={3} /> : 
                   activity.status === 'warning' ? <AlertCircle size={16} strokeWidth={3} /> : <Clock size={16} strokeWidth={3} />}
                </div>
                <div>
                  <p className="text-sm font-black text-white/90 leading-tight tracking-tight">{activity.message}</p>
                  <p className="text-[10px] text-white/40 font-black mt-1 uppercase tracking-widest">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => window.location.hash = '/admin/notices'} className="w-full mt-10 py-5 bg-white/5 backdrop-blur text-white/60 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-white/5 flex items-center justify-center gap-2">
            Explore All Notices <ChevronRight size={16} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ stat }: any) => (
  <div className="rainbow-border rounded-[2.5rem] p-0.5 group shadow-lg rainbow-glow">
    <div className={`bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl p-8 rounded-[2.4rem] flex items-center gap-5 transition-all group-hover:-translate-y-2 h-full border border-white/40 dark:border-slate-800 overflow-hidden relative`}>
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
        {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 64 })}
      </div>
      <div className={`${stat.color} p-4 rounded-2xl text-white shadow-lg group-hover:rotate-12 transition-all`}>
        {React.cloneElement(stat.icon as React.ReactElement<any>, { size: 28, strokeWidth: 2.5 })}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-1">
          {stat.label}
          {stat.isDaily && <span className="ml-2 inline-block w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>}
        </p>
        <h3 className={`text-3xl font-black tracking-tighter ${stat.isDaily ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
          {stat.value}
        </h3>
      </div>
    </div>
  </div>
);

export default Dashboard;
