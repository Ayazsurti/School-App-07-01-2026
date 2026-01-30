
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { 
  ShieldCheck, Lock, Eye, EyeOff, School, Loader2, Smartphone,
  Key, ChevronRight, Hash, ShieldAlert,
  SendHorizontal, SmartphoneNfc, Timer, Cloud, CheckCircle2, UserCircle,
  Fingerprint, Cpu, Globe, Activity
} from 'lucide-react';
import { db, getErrorMessage } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';

interface LoginProps { onLogin: (user: User) => void; schoolLogo: string | null; schoolName: string; }

const Login: React.FC<LoginProps> = ({ onLogin, schoolLogo, schoolName }) => {
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Initializing Neural Uplink...");
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setError(null);
    setUsername('');
    setPassword('');
  };

  const executeLogin = async (userObj: User) => {
    setIsAuthenticating(true);
    const statuses = ["Initializing Neural Uplink...", "Synchronizing Identity Node...", "Securing Institutional Session..."];
    let currentStep = 0;
    const statusInterval = setInterval(() => {
      currentStep++;
      if (currentStep < statuses.length) setSyncStatus(statuses[currentStep]);
    }, 1000);

    await new Promise(resolve => setTimeout(resolve, 3000));
    clearInterval(statusInterval);
    setIsAuthenticating(false);
    onLogin(userObj);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); 
    setError(null);
    try {
      const profile = await db.auth.login(username, password);
      const userObj: User = {
        id: profile.id,
        name: profile.name,
        email: `${username}@edu.node`,
        role: profile.role as UserRole,
        class: profile.class,
        section: profile.section,
        profileImage: profile.profile_image,
        staffId: (profile as any).staffId,
        mobile: (profile as any).mobile,
        assignedRole: (profile as any).assignedRole,
        subjects: (profile as any).subjects || [],
        permissions: (profile as any).permissions || []
      } as any;
      await createAuditLog(userObj, 'LOGIN', 'Auth', `${role} Identity Verified: ${username}`);
      await executeLogin(userObj);
    } catch (err: any) { 
      setError(getErrorMessage(err)); 
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6 relative overflow-hidden font-['Inter']">
      
      {/* 3-SECOND SYNC OVERLAY */}
      {isAuthenticating && (
        <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-slate-950 animate-in fade-in duration-500">
          <div className="absolute inset-0 neural-grid-white opacity-10"></div>
          <div className="w-full max-sm px-10 text-center space-y-12 relative">
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl animate-neural-pulse"></div>
              <div className="absolute inset-0 border-4 border-dashed border-indigo-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
              <div className="absolute inset-8 bg-indigo-600 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.5)] flex items-center justify-center text-white border border-white/20">
                <Fingerprint size={40} className="animate-pulse" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white uppercase tracking-[0.3em]">{syncStatus}</h2>
              <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full animate-[progress-grow_3s_linear] w-full origin-left relative"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 neural-grid-white opacity-20"></div>
      
      <div className="max-w-md w-full relative z-10 space-y-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] mx-auto flex items-center justify-center text-white shadow-2xl mb-6 overflow-hidden border-4 border-white transition-transform hover:scale-105">
            {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={40} />}
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{schoolName}</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3">Identity Authorization Portal</p>
        </div>

        <div className="frosted-neural-glass p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl">
          <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8">
            {(['ADMIN', 'TEACHER', 'STUDENT'] as UserRole[]).map((r) => (
              <button 
                key={r} 
                onClick={() => handleRoleChange(r)} 
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {r}
              </button>
            ))}
          </div>

          {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-700 text-[10px] font-bold uppercase items-start leading-relaxed animate-shake"><ShieldAlert size={18} className="shrink-0"/>{error}</div>}

          <form onSubmit={handlePasswordLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                {role === 'STUDENT' ? 'Student GR Number' : role === 'TEACHER' ? 'Teacher Username' : 'Admin Username'}
              </label>
              <div className="relative">
                <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="text" 
                  required 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl font-black uppercase outline-none border-2 border-transparent focus:border-indigo-100 shadow-inner" 
                  placeholder={role === 'STUDENT' ? "ENTER GR NUMBER" : "ENTER USERNAME"}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Password / Master Key</label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full pl-14 pr-14 py-4 bg-slate-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-100 shadow-inner tracking-widest" 
                  placeholder="ENTER ACCESS KEY"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : 'Authenticate Identity'}
            </button>
          </form>

          <div className="mt-8 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-4">
            <ShieldCheck size={18} className="text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[9px] font-bold text-indigo-700 leading-relaxed uppercase tracking-wider">
              {role === 'STUDENT' ? 'Student identities require a unique GR number and password issued by the administrative node.' : 'Authorized faculty terminal access. Use credentials synchronized via the master registry.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
