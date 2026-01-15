
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  School, 
  AlertCircle, 
  Loader2, 
  Fingerprint, 
  Cpu, 
  Zap, 
  Globe,
  Database,
  Scan,
  Activity
} from 'lucide-react';
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
    "NEURAL UPLINK INITIATED",
    "SCANNING BIOMETRIC DATA",
    "DECRYPTING SECURITY VAULT",
    "IDENTITY AUTHENTICATED"
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
      }, 500); // Cycles through messages over 2 seconds
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Initial Login Logic to verify before starting animation
    try {
      const profile = await db.auth.login(username, password);
      
      if (profile.role !== role) {
        throw new Error(`ACCESS DENIED: Role mismatch for ${profile.role}.`);
      }

      const authenticatedUser: User = {
        id: profile.id,
        name: profile.full_name,
        email: profile.email || `${username}@edu.node`,
        role: profile.role as UserRole,
        profileImage: profile.profile_image
      };

      // Forced 2-second "Neural Access" delay as requested
      setTimeout(async () => {
        await createAuditLog(authenticatedUser, 'LOGIN', 'Auth', `Terminal authorized for role: ${role}`);
        onLogin(authenticatedUser);
      }, 2000);

    } catch (err: any) {
      // If error occurs immediately, stop loading after 800ms to show error
      setTimeout(() => {
        setError(err.message || "UPLINK FAILURE: Access credentials rejected.");
        setLoading(false);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6 relative overflow-hidden font-['Inter']">
      {/* Background Neural Grid */}
      <div className="absolute inset-0 neural-grid-white"></div>
      
      {/* Soft Glow Synapses */}
      <div className="absolute top-[10%] left-[20%] w-64 h-64 bg-indigo-50/50 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[10%] right-[20%] w-80 h-80 bg-cyan-50/50 rounded-full blur-[120px]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-indigo-50/20 rounded-full opacity-10"></div>

      {/* Loading Overlay with 2-Second Biometric Scan */}
      {loading && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/98 backdrop-blur-2xl animate-in fade-in duration-500">
           <div className="relative mb-16">
              {/* Rotating Scanning Rings */}
              <div className="absolute -inset-20 border-[2px] border-indigo-100 rounded-full animate-core-rotate-slow"></div>
              <div className="absolute -inset-12 border-[2px] border-cyan-100 rounded-full animate-core-rotate-slow" style={{ animationDirection: 'reverse' }}></div>
              <div className="absolute -inset-6 border-[3px] border-indigo-500/20 rounded-full animate-biometric-pulse"></div>
              
              <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-2xl border border-indigo-50 relative overflow-hidden z-10">
                {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={60} className="text-indigo-400" />}
                {/* Visual Scan Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,1)] animate-scan-line-fast opacity-60"></div>
              </div>
           </div>
           <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-3">
                 <Scan className="text-indigo-500 animate-pulse" size={28} />
                 <h2 className="text-3xl font-black text-slate-800 uppercase tracking-[0.3em]">
                   Verifying Node
                 </h2>
              </div>
              <div className="bg-slate-50 px-8 py-3 rounded-2xl border border-slate-100 shadow-inner">
                <p className="text-[11px] font-['Space_Mono'] font-bold text-indigo-500 uppercase tracking-[0.5em]">
                  {loadingMessages[loadingStep]}
                </p>
              </div>
           </div>
        </div>
      )}
      
      <div className="max-w-md w-full relative z-10 space-y-10">
        <div className="text-center group">
          <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
            {/* Ambient Rings in Default State */}
            <div className="absolute inset-0 border border-indigo-50 rounded-[2.5rem] animate-core-rotate-slow opacity-40"></div>
            <div className="absolute inset-2 border border-cyan-50 rounded-[2rem] animate-core-rotate-slow opacity-40" style={{ animationDirection: 'reverse' }}></div>
            
            <div className="relative w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-indigo-600 border-2 border-indigo-50 shadow-xl overflow-hidden group-hover:scale-110 transition-transform duration-700">
              {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={40} />}
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none px-4">
            {schoolName} <span className="text-indigo-600">Portal</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mt-4">
             <div className="h-px w-6 bg-indigo-100"></div>
             <p className="text-[10px] font-['Space_Mono'] font-bold text-slate-400 uppercase tracking-[0.6em]">Secure Neural Node</p>
             <div className="h-px w-6 bg-indigo-100"></div>
          </div>
        </div>

        <div className={`frosted-neural-glass p-10 rounded-[3.5rem] relative group/card transition-all duration-500 ${error ? 'animate-shake' : ''}`}>
          {/* Subtle Dynamic Scan Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[3.5rem]">
             <div className="w-full h-32 bg-gradient-to-b from-indigo-50/0 via-indigo-50/10 to-indigo-50/0 animate-scan-line-fast opacity-40" style={{ animationDuration: '3s' }}></div>
          </div>

          <div className="flex bg-slate-50/80 p-1.5 rounded-2xl mb-10 border border-slate-100">
            {(['ADMIN', 'TEACHER', 'STUDENT'] as UserRole[]).map((r) => (
              <button 
                key={r}
                type="button"
                onClick={() => { setRole(r); setUsername(''); setPassword(''); setError(null); }}
                className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative ${role === r ? 'text-indigo-600 bg-white shadow-sm ring-1 ring-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {r}
                {role === r && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-biometric-pulse"></div>}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-8 p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4 animate-in fade-in zoom-in-95">
              <AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-rose-700 leading-relaxed uppercase">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-['Space_Mono'] font-black text-slate-400 uppercase tracking-widest ml-1">Terminal Registry ID</label>
              <div className="relative group/input">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors">
                   <Fingerprint size={20} />
                </div>
                <input 
                  type="text" 
                  required 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  placeholder={`ID-PROTOCOL-${role}`} 
                  className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none font-['Space_Mono'] font-bold text-slate-800 transition-all shadow-inner placeholder:text-slate-300" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-['Space_Mono'] font-black text-slate-400 uppercase tracking-widest ml-1">Access Credentials</label>
              <div className="relative group/input">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors">
                   <Lock size={20} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full pl-14 pr-14 py-5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none font-['Space_Mono'] font-bold text-slate-800 transition-all shadow-inner" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-300 hover:text-indigo-500 transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="group w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-[0_15px_30px_-5px_rgba(99,102,241,0.3)] hover:shadow-[0_20px_40px_-10px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 text-xs tracking-[0.4em] uppercase disabled:opacity-50 relative overflow-hidden active:scale-[0.98]"
            >
              {/* Button Glimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  <span>UPLINK ACCESS</span>
                  <Zap size={18} className="text-white group-hover:animate-pulse" />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center gap-8">
             <div className="flex gap-12">
                <div className="flex flex-col items-center gap-2 group/icon">
                   <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-300 group-hover/icon:text-indigo-400 group-hover/icon:bg-indigo-50 transition-all">
                      <Globe size={18} />
                   </div>
                   <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Global Grid</span>
                </div>
                <div className="flex flex-col items-center gap-2 group/icon">
                   <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-300 group-hover/icon:text-indigo-400 group-hover/icon:bg-indigo-50 transition-all">
                      <Database size={18} />
                   </div>
                   <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Vault Secure</span>
                </div>
                <div className="flex flex-col items-center gap-2 group/icon">
                   <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-300 group-hover/icon:text-indigo-400 group-hover/icon:bg-indigo-50 transition-all">
                      <ShieldCheck size={18} />
                   </div>
                   <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Compliance</span>
                </div>
             </div>
             <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">NODE REQ: MASTER.2026.UPLINK</p>
          </div>
        </div>

        {/* Dynamic Status Tag */}
        <div className="flex justify-center animate-bounce mt-4">
           <div className="px-6 py-2.5 bg-indigo-50 rounded-full border border-indigo-100 shadow-sm flex items-center gap-3">
              <Activity size={14} className="text-indigo-500 animate-pulse" />
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Neural Link Synchronized</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
