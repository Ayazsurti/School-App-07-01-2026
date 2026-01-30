import React, { useRef, useState, useEffect, useMemo } from 'react';
import { User, FeeRecord, Notice, MediaAsset } from '../types';
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
  Activity,
  ChevronLeft,
  Camera,
  Plus,
  MonitorPlay,
  ArrowUpRight,
  ClipboardList,
  CreditCard,
  Target
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
  const [slides, setSlides] = useState<MediaAsset[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  
  // Student specific data
  const [studentStats, setStudentStats] = useState({
    attendance: '0%',
    homeworkCount: 0,
    feeStatus: 'Checking...',
    standard: 'N/A'
  });
  
  const isTeacher = user.role === 'TEACHER';
  const isStudent = user.role === 'STUDENT';
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 500);
    fetchRealtimeStats();
    
    if (isStudent) {
      fetchStudentDashboardData();
    }
    
    const channel = supabase.channel('dashboard-sync-v10')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchRealtimeStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_ledger' }, () => {
        fetchRealtimeStats();
        if (isStudent) fetchStudentDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        if (isStudent) fetchStudentDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => fetchRealtimeStats())
      .subscribe();

    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, []);

  // Slideshow Auto-play Logic - Slow Motion Intervals
  useEffect(() => {
    if (filteredSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % filteredSlides.length);
    }, 12000); 
    return () => clearInterval(interval);
  }, [slides, user.role]);

  const fetchStudentDashboardData = async () => {
    try {
      // 1. Get Attendance
      const { data: attData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', user.id);
      
      const totalDays = attData?.length || 0;
      const presentDays = attData?.filter(a => a.status === 'PRESENT').length || 0;
      const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

      // 2. Get Homework Count
      const { data: hwData } = await supabase
        .from('homework')
        .select('id')
        .ilike('class_name', `%${user.class}%`)
        .ilike('section', `%${user.section}%`);

      // 3. Get Fee Status
      const { data: feeData } = await supabase
        .from('fee_ledger')
        .select('status')
        .eq('student_id', user.id);
      
      const hasPending = feeData?.some(f => f.status !== 'PAID') || false;

      setStudentStats({
        attendance: `${attendancePercent}%`,
        homeworkCount: hwData?.length || 0,
        feeStatus: hasPending ? 'PENDING' : 'SETTLED',
        standard: `Std ${user.class || 'N/A'}-${user.section || ''}`
      });
    } catch (e) {
      console.error("Student dashboard fetch failed:", e);
    }
  };

  const fetchRealtimeStats = async () => {
    try {
      let query = supabase.from('students').select('*', { count: 'exact', head: true });
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

      const { data: slideshowData } = await supabase
        .from('gallery')
        .select('*')
        .eq('type', 'slideshow')
        .order('created_at', { ascending: false });
      
      if (slideshowData) {
        setSlides(slideshowData.map(a => ({
          id: a.id, url: a.url, type: 'image', name: a.name, date: a.date, 
          uploadedBy: a.uploaded_by, description: a.description
        })));
      }
    } catch (err) { console.error("Dashboard Sync Error:", err); }
    finally { setIsLoading(false); }
  };

  const getSlideConfig = (desc: string) => {
    if (desc?.startsWith('CONFIG:')) {
      try {
        return JSON.parse(desc.replace('CONFIG:', ''));
      } catch (e) {
        return { fit: 'cover', animation: 'zoom-in', title: '', subtitle: '', buttonText: '', buttonLink: '', audience: 'ALL' };
      }
    }
    return { fit: 'cover', animation: 'zoom-in', title: '', subtitle: '', buttonText: '', buttonLink: '', audience: 'ALL' };
  };

  // Filter slides based on current user role
  const filteredSlides = useMemo(() => {
    return slides.filter(slide => {
      const config = getSlideConfig(slide.description || '');
      if (config.audience === 'ALL') return true;
      if (isAdmin) return true; 
      return config.audience === user.role;
    });
  }, [slides, user.role]);

  const stats = useMemo(() => {
    if (isStudent) {
      return [
        { label: 'My Attendance', value: studentStats.attendance, icon: <CheckCircle2 />, color: 'bg-emerald-600' },
        { label: 'Standard Node', value: studentStats.standard, icon: <Layers />, color: 'bg-indigo-600' },
        { label: 'Dues Status', value: studentStats.feeStatus, icon: <CreditCard />, color: studentStats.feeStatus === 'SETTLED' ? 'bg-indigo-500' : 'bg-rose-500' },
        { label: 'Task Load', value: studentStats.homeworkCount, icon: <Pencil />, color: 'bg-amber-500' },
      ];
    }
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
      { label: 'Daily Revenue', value: `₹${dailyFees.toLocaleString('en-IN')}`, icon: <HandCoins />, color: 'bg-amber-500', isDaily: true },
      { label: 'Live Attendance', value: '94%', icon: <Calendar />, color: 'bg-rose-600' },
    ];
  }, [isTeacher, isStudent, studentCount, dailyFees, user, studentStats]);

  const chartData = [
    { name: 'Mon', attendance: 85 }, { name: 'Tue', attendance: 92 }, { name: 'Wed', attendance: 88 }, { name: 'Thu', attendance: 95 }, { name: 'Fri', attendance: 90 }
  ];

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % filteredSlides.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + filteredSlides.length) % filteredSlides.length);

  return (
    <div className="min-h-full dashboard-rainbow-bg -m-4 lg:-m-8 p-4 lg:p-8 animate-in fade-in duration-700 relative overflow-hidden">
      
      {/* Pro Cinematic Motion Engine Styles */}
      <style>{`
        .slide-container { opacity: 0; transition: opacity 2s ease-in-out; position: absolute; inset: 0; z-index: 0; }
        .slide-container.active { opacity: 1; z-index: 10; }

        .motion-zoom-in img { transform: scale(1); transition: transform 12s linear; }
        .active.motion-zoom-in img { transform: scale(1.15); }

        .motion-zoom-out img { transform: scale(1.2); transition: transform 12s linear; }
        .active.motion-zoom-out img { transform: scale(1); }

        .motion-pan-left img { transform: translateX(2%) scale(1.1); transition: transform 12s linear; }
        .active.motion-pan-left img { transform: translateX(-5%) scale(1.1); }

        .motion-pan-right img { transform: translateX(-5%) scale(1.1); transition: transform 12s linear; }
        .active.motion-pan-right img { transform: translateX(2%) scale(1.1); }

        .motion-pan-up img { transform: translateY(2%) scale(1.1); transition: transform 12s linear; }
        .active.motion-pan-up img { transform: translateY(-5%) scale(1.1); }
      `}</style>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12 relative z-10 px-4 sm:px-0">
        <div className="flex items-center gap-6">
           <div>
             <div className="flex items-center gap-2 mb-1">
               <Sparkles className="text-amber-500 animate-pulse" size={18} />
               <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">
                 {isStudent ? 'Scholar Portal Active' : 'Neural Uplink V6.2 Established'}
               </span>
             </div>
             <h1 className="text-3xl lg:text-5xl font-black tracking-tighter leading-tight rainbow-text uppercase">
               {isTeacher ? 'Faculty Terminal.' : isStudent ? 'Your Dashboard.' : 'Management Hub.'}
             </h1>
             <p className="text-slate-500 dark:text-slate-400 font-bold text-sm lg:text-lg mt-1 truncate">
               {isStudent ? `Academic Session 2026-27 • ${user.name}` : `Authorized Access: ${user.name}`}
             </p>
           </div>
        </div>
        
        {isAdmin && (
          <button onClick={() => window.location.hash = '/admin/slideshow-manager'} className="px-8 py-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 rounded-[2.5rem] flex items-center gap-4 group border border-white/20 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden group-hover:scale-110 transition-transform">
                <MonitorPlay size={20}/>
             </div>
             <div className="text-left pr-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Production</p>
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Director Console</p>
             </div>
          </button>
        )}
      </div>

      {/* STYLIZED SLOW-MOTION PRO SLIDESHOW */}
      <div className="mb-10 relative z-10 animate-in slide-in-from-top-4 duration-1000 px-4 sm:px-0">
        <div className="bg-slate-950 rounded-[3.5rem] border border-white/10 dark:border-slate-800 shadow-2xl overflow-hidden aspect-[21/9] md:aspect-[25/8] relative group">
           {filteredSlides.length > 0 ? (
             <>
               {filteredSlides.map((slide, index) => {
                 const config = getSlideConfig(slide.description || '');
                 const isActive = index === currentSlide;
                 const motionClass = `motion-${config.animation || 'zoom-in'}`;

                 return (
                   <div key={slide.id} className={`slide-container ${isActive ? 'active' : ''} ${motionClass}`}>
                      <img 
                        src={slide.url} 
                        style={{ objectFit: config.fit as any }} 
                        className="w-full h-full opacity-100" 
                        alt={slide.name} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent"></div>
                      
                      {isActive && (
                        <div className="absolute bottom-10 left-10 right-10 flex items-end justify-between animate-in slide-in-from-bottom-6 duration-1000">
                           <div className="max-w-2xl space-y-4">
                              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-2">Campus Bulletin • Node 2026</p>
                              <h2 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter truncate leading-tight drop-shadow-2xl">{config.title || slide.name}</h2>
                              <p className="text-white/60 text-sm md:text-lg font-medium uppercase tracking-wide drop-shadow-lg">{config.subtitle || 'Official institutional update.'}</p>
                              
                              <div className="flex flex-wrap items-center gap-6 mt-8">
                                 {config.buttonText && (
                                   <button 
                                    onClick={() => config.buttonLink && (window.location.hash = config.buttonLink)}
                                    className="px-8 py-3.5 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-600/40 hover:bg-indigo-700 transition-all flex items-center gap-3 border border-indigo-400/20 active:scale-95"
                                   >
                                      {config.buttonText} <ArrowUpRight size={16}/>
                                   </button>
                                 )}
                                 <div className="flex items-center gap-3 opacity-40">
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12}/> {slide.date.split(',')[0]}</span>
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5"><Activity size={10}/> drifting {config.animation}</span>
                                 </div>
                              </div>
                           </div>
                           
                           <div className="hidden lg:flex gap-3 no-print">
                              <button onClick={prevSlide} className="p-5 bg-white/5 backdrop-blur hover:bg-white/10 text-white rounded-3xl transition-all border border-white/5 shadow-2xl"><ChevronLeft size={28} /></button>
                              <button onClick={nextSlide} className="p-5 bg-indigo-600 text-white rounded-3xl transition-all shadow-2xl hover:bg-indigo-700 border border-indigo-400/20"><ChevronRight size={28} /></button>
                           </div>
                        </div>
                      )}
                   </div>
                 );
               })}
               
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20 no-print">
                  {filteredSlides.map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setCurrentSlide(i)}
                      className={`h-1.5 transition-all rounded-full ${i === currentSlide ? 'w-12 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,1)]' : 'w-3 bg-white/20 hover:bg-white/40'}`}
                    />
                  ))}
               </div>
             </>
           ) : (
             <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/50">
                <MonitorPlay size={64} className="text-slate-200 dark:text-slate-800 mb-6 animate-pulse" />
                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Director's Stream Inactive</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">No slides found for your role: {user.role}</p>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10 px-4 sm:px-0">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl p-8 rounded-[2.5rem] flex items-center gap-5 border border-white/40 dark:border-slate-800 shadow-lg group hover:-translate-y-2 transition-all">
            <div className={`${stat.color} p-4 rounded-2xl text-white shadow-lg group-hover:rotate-12 transition-all`}>{stat.icon}</div>
            <div>
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className={`text-3xl font-black tracking-tighter ${stat.color.includes('emerald') ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>{isLoading ? '...' : stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 mb-12 px-4 sm:px-0">
        <div className="lg:col-span-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[3rem] shadow-xl border border-white/50 dark:border-slate-800 min-h-[450px] flex flex-col">
          <h3 className="font-black text-slate-900 dark:text-white text-2xl tracking-tight flex items-center gap-3 mb-10 uppercase"><Star className="text-amber-500 fill-amber-500" /> 
            {isStudent ? 'Recent Progress' : 'Live Engagement'}
          </h3>
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
          <button onClick={() => window.location.hash = isTeacher ? '/teacher/notices' : isStudent ? '/student/notices' : '/admin/notices'} className="w-full mt-10 py-5 bg-white/5 backdrop-blur text-white/60 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-white/5 flex items-center justify-center gap-2">Archives <ChevronRight size={16}/></button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;