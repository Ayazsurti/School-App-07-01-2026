
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
  School,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  BookOpen,
  Layers,
  Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db, supabase } from '../supabase';

interface DashboardProps {
  user: User;
  branding: {
    name: string;
    logo: string | null;
    address: string;
    email: string;
    contact: string;
  };
  onUpdateLogo: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, branding, onUpdateLogo }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [dailyFees, setDailyFees] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const isTeacher = user.role === 'TEACHER';
  const isStudent = user.role === 'STUDENT';
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 500);
    fetchRealtimeStats();
    
    const channel = supabase.channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchRealtimeStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_ledger' }, () => fetchRealtimeStats())
      .subscribe();

    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, []);

  const fetchRealtimeStats = async () => {
    try {
      let query = supabase.from('students').select('*', { count: 'exact', head: true });
      
      // If teacher, show count for assigned class
      if (isTeacher && user.class) {
        query = query.eq('class', user.class);
        if (user.section) query = query.eq('section', user.section);
      }
      
      const { count } = await query;
      setStudentCount(count || 0);

      const today = new Date().toISOString().split('T')[0];
      const { data: feeData } = await supabase.from('fee_ledger').select('amount').eq('date', today).eq('status', 'PAID');
      setDailyFees(feeData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0);

      const { data: notices } = await supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(4);
      if (notices) setRecentNotices(notices as any);

    } catch (err) { console.error("Dashboard Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  const stats = useMemo(() => {
    if (isTeacher) {
      return [
        { label: 'Class Strength', value: studentCount.toLocaleString(), icon: <Users />, color: 'bg-indigo-600' },
        { label: 'Assigned Standard', value: `Std ${user.class || 'N/A'}-${user.section || ''}`, icon: <Layers />, color: 'bg-emerald-600' },
        { label: 'Subjects', value: (user as any).subjects?.length || 0, icon: <BookOpen />, color: 'bg-amber-500' },
        { label: 'Daily Presence', value: '94%', icon: <Calendar />, color: 'bg-rose-600' },
      ];
    }
    return [
      { label: 'Cloud Students', value: studentCount.toLocaleString(), icon: <GraduationCap />, color: 'bg-indigo-600' },
      { label: 'Active Faculty', value: '12', icon: <Users />, color: 'bg-emerald-600' },
      { label: 'Daily Revenue', value: `₹${dailyFees.toLocaleString('en-IN')}`, icon: <HandCoins />, color: 'bg-amber-50', isDaily: true },
      { label: 'Live Attendance', value: '94%', icon: <Calendar />, color: 'bg-rose-600' },
    ];
  }, [isTeacher, studentCount, dailyFees, user]);

  const chartData = [
    { name: 'Mon', attendance: 85 }, { name: 'Tue', attendance: 92 }, { name: 'Wed', attendance: 88 }, { name: 'Thu', attendance: 95 }, { name: 'Fri', attendance: 90 }
  ];

  return (
    <div className="min-h-full dashboard-rainbow-bg -m-4 lg:-m-8 p-4 lg:p-8 animate-in fade-in duration-700 relative overflow-hidden">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12 relative z-10">
        <div className="flex items-center gap-6">
           <div>
             <div className="flex items-center gap-2 mb-1">
               <Sparkles className="text-amber-500 animate-pulse" size={18} />
               <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">Institutional Node Terminal</span>
             </div>
             <h1 className="text-3xl lg:text-5xl font-black tracking-tighter leading-tight rainbow-text uppercase">
               {isTeacher ? 'Faculty Portal.' : 'Management Hub.'}
             </h1>
             <p className="text-slate-500 dark:text-slate-400 font-bold text-sm lg:text-lg mt-1">Hello, {user.name}. Centralized records are active.</p>
           </div>
        </div>
        
        {isAdmin && (
          <button onClick={onUpdateLogo} className="px-8 py-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-[2rem] flex items-center gap-4 group border border-white/20 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden group-hover:scale-110 transition-transform">
                {branding.logo ? <img src={branding.logo} className="w-full h-full object-cover" alt="Logo" /> : <School size={20}/>}
             </div>
             <div className="text-left pr-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Identity Control</p>
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Edit Branding</p>
             </div>
          </button>
        )}

        {isTeacher && (
          <div className="flex items-center gap-4 bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-[2rem] border border-indigo-100 dark:border-indigo-800 shadow-xl">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                <ShieldCheck size={24}/>
             </div>
             <div className="text-left pr-4">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Teacher Identity</p>
                <p className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-tight">Verified Faculty Node</p>
             </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl p-8 rounded-[2.5rem] flex items-center gap-5 border border-white/40 dark:border-slate-800 shadow-lg group hover:-translate-y-2 transition-all">
            <div className={`${stat.color} p-4 rounded-2xl text-white shadow-lg group-hover:rotate-12 transition-all`}>{stat.icon}</div>
            <div>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className={`text-3xl font-black tracking-tighter ${(stat as any).isDaily ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{isLoading ? '...' : stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {isTeacher && (
        <div className="mb-10 relative z-10 animate-in slide-in-from-bottom-4">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-10 rounded-[3.5rem] border border-white/40 dark:border-slate-800 shadow-2xl overflow-hidden">
             <div className="flex items-center gap-4 mb-8">
                <BookOpen className="text-indigo-600" size={32} />
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Teaching Portfolio / शिक्षण पोर्टफोलियो</h3>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(user as any).subjects?.length > 0 ? (user as any).subjects.map((sub: string) => (
                  <div key={sub} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center gap-3 group hover:border-indigo-300 transition-all">
                     <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-xl flex items-center justify-center font-black group-hover:rotate-12 transition-transform">{sub.charAt(0)}</div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">{sub}</span>
                  </div>
                )) : (
                  <p className="col-span-full text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-xs italic">No subjects assigned in cloud directory.</p>
                )}
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 mb-12">
        <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-xl border border-white/50 dark:border-slate-800 min-h-[450px] flex flex-col">
          <h3 className="font-black text-slate-900 dark:text-white text-2xl tracking-tight flex items-center gap-3 mb-10 uppercase"><Star className="text-amber-500 fill-amber-500" /> Live Engagement</h3>
          <div className="w-full flex-1 min-h-[300px] relative overflow-hidden px-2">
            {isMounted && (
              <ResponsiveContainer width="99%" height={300}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} />
                  <Tooltip cursor={{fill: 'rgba(99, 102, 241, 0.05)'}} contentStyle={{borderRadius: '24px', border: 'none', shadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}} />
                  <Bar dataKey="attendance" fill="#6366f1" radius={[12, 12, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
            {!isMounted && <div className="h-[300px] w-full flex items-center justify-center text-slate-300 font-black uppercase text-[10px] tracking-widest animate-pulse">Initializing Data Stream...</div>}
          </div>
        </div>

        <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden group flex flex-col">
          <h3 className="font-black text-white text-2xl tracking-tight mb-8 flex items-center gap-3 uppercase"><Clock size={24} className="text-indigo-400" /> Real-time Broadcasts</h3>
          <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {recentNotices.length > 0 ? recentNotices.map((notice) => (
              <div key={notice.id} className="flex gap-6 items-start hover:translate-x-2 transition-transform cursor-pointer">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0"><Megaphone size={16} /></div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-white/90 uppercase truncate">{notice.title}</p>
                  <p className="text-[9px] text-white/40 font-black mt-1 uppercase tracking-widest">{notice.date}</p>
                </div>
              </div>
            )) : <p className="text-slate-500 font-bold text-xs uppercase text-center py-20 italic">No cloud broadcasts...</p>}
          </div>
          <button onClick={() => window.location.hash = isTeacher ? '/teacher/notices' : '/admin/notices'} className="w-full mt-10 py-5 bg-white/5 backdrop-blur text-white/60 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-white/5 flex items-center justify-center gap-2">Archives <ChevronRight size={16}/></button>
        </div>
      </div>

      {/* INSTITUTIONAL BRANDING FOOTER */}
      <div className="relative z-10 mt-12 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[3.5rem] border border-white/40 dark:border-slate-800 shadow-2xl overflow-hidden p-10 lg:p-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl border-4 border-white/20 overflow-hidden">
               {branding.logo ? <img src={branding.logo} className="w-full h-full object-cover" alt="School Logo" /> : <School size={40} />}
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">{branding.name}</h2>
            <div className="mt-4 flex items-center gap-2">
               <ShieldCheck size={16} className="text-emerald-500" />
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Official Node Identity</p>
            </div>
          </div>
          
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="space-y-6">
                <div className="flex items-start gap-5">
                   <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-inner">
                      <MapPin size={24} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Campus Geography</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed uppercase">{branding.address || 'Location registry pending sync...'}</p>
                   </div>
                </div>
                <div className="flex items-start gap-5">
                   <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-inner">
                      <Phone size={24} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Neural Hotline</p>
                      <p className="text-sm font-black text-slate-800 dark:text-white tracking-widest uppercase">{branding.contact || '+00-Registry-Sync'}</p>
                   </div>
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-start gap-5">
                   <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 shadow-inner">
                      <Mail size={24} />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Channel</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300 lowercase">{branding.email || 'cloud@school.edu'}</p>
                   </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                   <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Institutional Cycle</p>
                      <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">2026-2027 SES</p>
                   </div>
                   <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center animate-pulse">
                      <Rocket size={18} />
                   </div>
                </div>
             </div>
          </div>
        </div>
        
        <div className="mt-14 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
           <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em]">Neural Grid Sync Level 4 Established</p>
           <div className="flex items-center gap-6">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Master Key: DIS-26-SYS</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">© 2026 EduManage Pro</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
