
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
  ArrowRight,
  Loader2,
  Stamp,
  School
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db, supabase } from '../supabase';

interface DashboardProps {
  user: User;
  schoolLogo: string | null;
  onUpdateLogo: () => void;
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
    <circle cx="30" cy="30" r="2" fill="#fbbf24" />
    <circle cx="70" cy="30" r="2" fill="#fbbf24" />
    <circle cx="50" cy="80" r="3" fill="#fbbf24" />
  </svg>
);

const Dashboard: React.FC<DashboardProps> = ({ user, schoolLogo, onUpdateLogo }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [dailyFees, setDailyFees] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
  
  const isStudent = user.role === 'STUDENT';

  const fetchRealtimeStats = async () => {
    try {
      const { count: sCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
      setStudentCount(sCount || 0);

      const today = new Date().toISOString().split('T')[0];
      const { data: feeData } = await supabase.from('fee_ledger').select('amount').eq('date', today).eq('status', 'PAID');
      const total = feeData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
      setDailyFees(total);

      const { data: notices } = await supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(4);
      if (notices) setRecentNotices(notices.map((n: any) => ({
        id: n.id, title: n.title, content: n.content, category: n.category, date: n.date, postedBy: n.posted_by
      })));

    } catch (err) {
      console.error("Dashboard Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRealtimeStats();
    const studentsChannel = supabase.channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchRealtimeStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_ledger' }, () => fetchRealtimeStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => fetchRealtimeStats())
      .subscribe();
    return () => { supabase.removeChannel(studentsChannel); };
  }, []);

  const stats = [
    { label: 'Cloud Students', value: studentCount.toLocaleString(), icon: <GraduationCap />, color: 'bg-indigo-600' },
    { label: 'Active Faculty', value: '12', icon: <Users />, color: 'bg-emerald-600' },
    { label: 'Daily Revenue', value: `₹${dailyFees.toLocaleString('en-IN')}`, icon: <HandCoins />, color: 'bg-amber-500', isDaily: true },
    { label: 'Live Attendance', value: '94%', icon: <Calendar />, color: 'bg-rose-600' },
  ];

  const chartData = [
    { name: 'Mon', attendance: 85, performance: 70 },
    { name: 'Tue', attendance: 92, performance: 75 },
    { name: 'Wed', attendance: 88, performance: 82 },
    { name: 'Thu', attendance: 95, performance: 78 },
    { name: 'Fri', attendance: 90, performance: 85 },
  ];

  if (isStudent) {
    return (
      <div className="min-h-full dashboard-rainbow-bg -m-4 lg:-m-8 p-4 lg:p-8 animate-in fade-in duration-700 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="text-center relative z-10 space-y-4">
           <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="text-amber-500 animate-bounce" size={40} />
          </div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-tight rainbow-text drop-shadow-sm uppercase">
            EDUCATION CLOUD ACTIVE.
          </h1>
          <div className="w-32 h-1.5 bg-indigo-600 mx-auto rounded-full opacity-30 mt-6"></div>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xl mt-4">Welcome, {user.name}. Your real-time dashboard is ready.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full dashboard-rainbow-bg -m-4 lg:-m-8 p-4 lg:p-8 animate-in fade-in duration-700 pb-20 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-amber-500 animate-bounce" size={24} />
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">Institutional Cloud Center</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter leading-tight rainbow-text drop-shadow-sm uppercase">
            MANAGEMENT HUB.
          </h1>
        </div>
        
        {user.role === 'ADMIN' && (
          <div className="rainbow-border rounded-[2.5rem] p-0.5 shadow-2xl">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-5 rounded-[2.4rem] flex items-center gap-5 group border border-white/20 dark:border-slate-800">
              <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[1.8rem] border border-slate-100 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-xl">
                {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <SchoolEmblem />}
              </div>
              <div className="pr-4">
                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none flex items-center gap-1.5 mb-2">
                  <Shield size={10} strokeWidth={3} /> Brand Identity
                </p>
                <button onClick={onUpdateLogo} className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-6 py-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">Update Identity</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
        {stats.map((stat) => (
          <div key={stat.label} className="rainbow-border rounded-[2.5rem] p-0.5 group shadow-lg">
            <div className={`bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl p-8 rounded-[2.4rem] flex items-center gap-5 transition-all group-hover:-translate-y-2 h-full border border-white/40 dark:border-slate-800 overflow-hidden relative`}>
              <div className={`${stat.color} p-4 rounded-2xl text-white shadow-lg group-hover:rotate-12 transition-all`}>
                {stat.icon}
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-1">
                  {stat.label}
                  {stat.isDaily && <span className="ml-2 inline-block w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>}
                </p>
                <h3 className={`text-3xl font-black tracking-tighter ${stat.isDaily ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                  {isLoading ? '...' : stat.value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-xl border border-white/50 dark:border-slate-800">
          <h3 className="font-black text-slate-900 dark:text-white text-2xl tracking-tight flex items-center gap-3 mb-10">
            <Star className="text-amber-500 fill-amber-500" size={24} /> Learning Progress
          </h3>
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

        <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group">
          <h3 className="font-black text-white text-2xl tracking-tight mb-8 flex items-center gap-3">
             <Clock size={24} className="text-indigo-400" /> Real-time Broadcasts
          </h3>
          <div className="space-y-8 relative">
            {recentNotices.length > 0 ? recentNotices.map((notice) => (
              <div key={notice.id} className="flex gap-6 relative z-10 group/item">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Megaphone size={16} strokeWidth={3} />
                </div>
                <div>
                  <p className="text-sm font-black text-white/90 leading-tight truncate max-w-[180px] uppercase">{notice.title}</p>
                  <p className="text-[10px] text-white/40 font-black mt-1 uppercase tracking-widest">{notice.date}</p>
                </div>
              </div>
            )) : <p className="text-slate-500 font-bold text-xs uppercase text-center py-20">No active broadcasts</p>}
          </div>
          <button onClick={() => window.location.hash = '/admin/notices'} className="w-full mt-10 py-5 bg-white/5 backdrop-blur text-white/60 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-white/5 flex items-center justify-center gap-2">
            Explore All <ChevronRight size={16} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
