
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { ShieldCheck, User as UserIcon, GraduationCap, Lock, UserCircle, Eye, EyeOff, School, AlertCircle, ArrowRight, Loader2, CloudLightning, Sparkles } from 'lucide-react';
import { db } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';

interface LoginProps {
  onLogin: (user: User) => void;
  schoolLogo: string | null;
  schoolName: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, schoolLogo, schoolName }) => {
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    "Establishing Secure Link...",
    "Connecting to Cloud Node...",
    "Verifying Encrypted Identity...",
    "Authorizing User Session..."
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
      }, 800);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulate a slight delay for the premium animation feel
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const profile = await db.auth.login(username, password);
      
      if (profile.role !== role) {
        throw new Error(`Unauthorized: This user is assigned the role of ${profile.role}, not ${role}.`);
      }

      const authenticatedUser: User = {
        id: profile.id,
        name: profile.full_name,
        email: profile.email || `${username}@school.com`,
        role: profile.role as UserRole,
        rollNo: profile.role === 'STUDENT' ? '101' : undefined,
        class: profile.role === 'STUDENT' ? '10th' : undefined,
        section: profile.role === 'STUDENT' ? 'A' : undefined
      };

      createAuditLog(authenticatedUser, 'LOGIN', 'Auth', `${role} Session Initialized`);
      onLogin(authenticatedUser);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid Credentials: Password or Username mismatch.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden transition-colors">
      {/* Background Decorations */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Full Screen Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/60 dark:bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="relative mb-8">
              <div className="w-32 h-32 bg-indigo-600 rounded-[3rem] flex items-center justify-center text-white shadow-2xl animate-bounce">
                {schoolLogo ? (
                  <img src={schoolLogo} className="w-full h-full object-cover rounded-[3rem]" alt="School Logo" />
                ) : (
                  <School size={50} strokeWidth={2.5} />
                )}
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg animate-spin duration-[3s]">
                 <CloudLightning className="text-indigo-600" size={20} />
              </div>
           </div>
           
           <div className="text-center space-y-3">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Authenticating...</h2>
              <div className="flex flex-col items-center">
                 <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] h-4 animate-pulse">
                    {loadingMessages[loadingStep]}
                 </p>
                 <div className="w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-6 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}></div>
                 </div>
              </div>
           </div>
        </div>
      )}
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10 group">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white font-bold text-4xl mx-auto shadow-2xl mb-6 border-4 border-white dark:border-slate-800 transition-transform group-hover:scale-105 duration-500">
            {schoolLogo ? (
              <img src={schoolLogo} className="w-full h-full object-cover" alt="School Logo" />
            ) : (
              <School size={40} strokeWidth={2.5} />
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase px-4">{schoolName}</h1>
          <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mt-2">Cloud Protected Portal</p>
        </div>

        <div className={`bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 transition-all ${error ? 'animate-shake' : ''}`}>
          <div className="grid grid-cols-3 gap-2 mb-8 p-1.5 bg-slate-100/80 dark:bg-slate-800 rounded-2xl">
            {(['ADMIN', 'TEACHER', 'STUDENT'] as UserRole[]).map((r) => (
              <button 
                key={r}
                type="button"
                onClick={() => { setRole(r); setUsername(''); setPassword(''); setError(null); }}
                className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${role === r ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {r}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Username / ID</label>
              <div className="relative group">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={`${role.toLowerCase()} username`}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 dark:text-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-14 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 dark:text-white transition-all shadow-inner"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="group w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 text-xs tracking-widest uppercase disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                   <Loader2 className="animate-spin" size={20} />
                   <span>Authorizing...</span>
                </div>
              ) : (
                <>
                  <span>Secure Sign In</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="flex flex-col items-center gap-4 mt-8">
           <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-900/50 rounded-full border border-slate-200 dark:border-slate-800">
              <ShieldCheck className="text-emerald-500" size={14} />
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">End-to-End Encrypted Access</p>
           </div>
           <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em]">
             Powered by SUPABASE CLOUD AUTH
           </p>
        </div>
      </div>
    </div>
  );
};

const UserCircle = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default Login;
