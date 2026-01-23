
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
  const [authMode, setAuthMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Initializing Neural Uplink...");
  const [error, setError] = useState<string | null>(null);

  // 1 Minute OTP Timer Logic
  useEffect(() => {
    let timer: any;
    if (otpTimer > 0) {
      timer = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpTimer]);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setIsOtpSent(false);
    setError(null);
    setOtpTimer(0);
    setUsername('');
    setPassword('');
    setMobileNumber('');
    if (newRole === 'ADMIN' || newRole === 'TEACHER') {
      setAuthMode('PASSWORD');
    } else {
      setAuthMode('OTP');
    }
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

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.length !== 10) { setError("Enter valid 10-digit registered number."); return; }
    setLoading(true); setError(null);
    try {
      await db.auth.verifyMobile(mobileNumber, role as 'TEACHER' | 'STUDENT');
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      await db.sms.sendOTP(mobileNumber, otp);
      setIsOtpSent(true); 
      setOtpTimer(60);
    } catch (err: any) { 
      setError(getErrorMessage(err)); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue !== generatedOtp) { setError("Invalid security code."); return; }
    setLoading(true); setError(null);
    try {
      const profile = await db.auth.loginWithMobile(mobileNumber, role as 'TEACHER' | 'STUDENT');
      const userObj: User = {
        id: profile.id,
        name: profile.name,
        email: `${mobileNumber}@edu.node`,
        role: profile.role as UserRole,
        class: (profile as any).class,
        section: (profile as any).section,
        profileImage: profile.profile_image,
        staffId: (profile as any).staffId,
        mobile: (profile as any).mobile,
        assignedRole: (profile as any).assignedRole,
        subjects: (profile as any).subjects || [],
        permissions: (profile as any).permissions || []
      } as any;
      await createAuditLog(userObj, 'LOGIN', 'Auth', `Mobile OTP Login: ${mobileNumber}`);
      await executeLogin(userObj);
    } catch (err: any) { 
      setError(getErrorMessage(err)); 
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
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
      await createAuditLog(userObj, 'LOGIN', 'Auth', `${role} Credential Login: ${username}`);
      await executeLogin(userObj);
    } catch (err: any) { 
      setError(getErrorMessage(err)); 
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 md:p-6 relative overflow-hidden font-['Inter']">
      
      {isAuthenticating && (
        <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-slate-950 animate-in fade-in duration-500">
          <div className="absolute inset-0 neural-grid-white opacity-10"></div>
          <div className="w-full max-sm px-6 text-center space-y-12 relative">
            <div className="relative mx-auto w-24 h-24 md:w-32 md:h-32">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-3xl animate-neural-pulse"></div>
              <div className="absolute inset-0 border-4 border-dashed border-indigo-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
              <div className="absolute inset-8 bg-indigo-600 rounded-2xl md:rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.5)] flex items-center justify-center text-white">
                <Fingerprint size={32} className="animate-pulse" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-sm md:text-xl font-black text-white uppercase tracking-[0.2em]">{syncStatus}</h2>
              <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500 rounded-full animate-[progress-grow_3s_linear] w-full origin-left"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 neural-grid-white opacity-20"></div>
      
      <div className="max-w-md w-full relative z-10 space-y-6 md:space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-indigo-600 rounded-2xl md:rounded-[2.5rem] mx-auto flex items-center justify-center text-white shadow-2xl mb-4 md:mb-6 overflow-hidden border-4 border-white">
            {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={30} />}
          </div>
          <h1 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none px-4">{schoolName}</h1>
          <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2 md:mt-3">Identity Access Gateway</p>
        </div>

        <div className="frosted-neural-glass p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border border-slate-100 shadow-2xl">
          <div className="flex bg-slate-50 p-1 rounded-xl md:rounded-2xl mb-6 md:mb-8">
            {(['ADMIN', 'TEACHER', 'STUDENT'] as UserRole[]).map((r) => (
              <button key={r} disabled={loading || isAuthenticating} onClick={() => handleRoleChange(r)} className={`flex-1 py-2 md:py-3 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${role === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {r}
              </button>
            ))}
          </div>

          {error && <div className="mb-4 md:mb-6 p-3 md:p-4 bg-rose-50 border border-rose-100 rounded-xl md:rounded-2xl flex gap-3 text-rose-700 text-[9px] md:text-[10px] font-bold uppercase items-start leading-relaxed animate-shake"><ShieldAlert size={16} className="shrink-0"/>{error}</div>}

          {authMode === 'PASSWORD' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4 md:space-y-6">
              <div className="space-y-1">
                <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {role === 'ADMIN' ? 'admin username' : role === 'TEACHER' ? 'Teacher Username' : 'student gr number'}
                </label>
                <div className="relative">
                  <Key className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="text" required disabled={loading || isAuthenticating} value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-11 md:pl-14 pr-4 md:pr-6 py-3 md:py-4 bg-slate-50 rounded-xl md:rounded-2xl font-black uppercase outline-none text-xs md:text-sm" placeholder={role === 'TEACHER' ? "T.ID" : ""} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {role === 'ADMIN' ? 'admin password' : role === 'TEACHER' ? 'Master Key' : 'Passphrase'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type={showPassword ? "text" : "password"} required disabled={loading || isAuthenticating} value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-11 md:pl-14 pr-11 md:pr-14 py-3 md:py-4 bg-slate-50 rounded-xl md:rounded-2xl font-black outline-none tracking-widest text-xs md:text-sm" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-slate-300">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading || isAuthenticating} className="w-full py-4 md:py-5 bg-indigo-600 text-white font-black rounded-2xl md:rounded-3xl uppercase text-[10px] md:text-xs shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3">
                {loading ? <Loader2 className="animate-spin" size={18}/> : 'Authorize Login'}
              </button>
              {role !== 'ADMIN' && (
                <button type="button" onClick={() => setAuthMode('OTP')} className="w-full text-[8px] md:text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center justify-center gap-2">
                  <Smartphone size={12}/> Switch to Mobile OTP
                </button>
              )}
            </form>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {!isOtpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4 md:space-y-6">
                  <div className="space-y-1">
                    <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">registered mobile number</label>
                    <div className="relative">
                      <SmartphoneNfc className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
                      <input type="tel" required maxLength={10} disabled={loading || isAuthenticating} value={mobileNumber} onChange={e => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))} className="w-full pl-11 md:pl-14 pr-4 md:pr-6 py-3 md:py-4 bg-slate-50 rounded-xl md:rounded-2xl font-black outline-none tracking-[0.2em] text-xs md:text-sm" placeholder="10-digit mobile" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading || isAuthenticating || otpTimer > 0} className="w-full py-4 md:py-5 bg-indigo-600 text-white font-black rounded-2xl md:rounded-3xl uppercase text-[10px] md:text-xs shadow-xl flex items-center justify-center gap-3">
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <><SendHorizontal size={16}/> Request Code</>}
                  </button>
                  <button type="button" onClick={() => setAuthMode('PASSWORD')} className="w-full text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Back to Password</button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4 md:space-y-6">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">verification code</label>
                      {otpTimer > 0 && <span className="text-[8px] md:text-[9px] font-black text-indigo-500 flex items-center gap-1"><Timer size={10} /> {formatTime(otpTimer)}</span>}
                    </div>
                    <div className="relative">
                      <Hash className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="text" required maxLength={6} disabled={loading || isAuthenticating} value={otpValue} onChange={e => setOtpValue(e.target.value.replace(/[^0-9]/g, ''))} className="w-full pl-11 md:pl-14 pr-4 md:pr-6 py-3 md:py-4 bg-slate-50 rounded-xl md:rounded-2xl font-black text-lg md:text-2xl text-center tracking-[0.5em] outline-none" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading || isAuthenticating} className="w-full py-4 md:py-5 bg-indigo-600 text-white font-black rounded-2xl md:rounded-3xl uppercase text-[10px] md:text-xs shadow-xl flex items-center justify-center gap-3">
                    {loading ? <Loader2 className="animate-spin" size={18}/> : 'Verify Access'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
