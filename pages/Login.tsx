
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { 
  ShieldCheck, Lock, Eye, EyeOff, School, Loader2, Smartphone,
  Key, ChevronRight, Hash, ShieldAlert,
  SendHorizontal, SmartphoneNfc, Timer, Cloud, CheckCircle2, UserCircle
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
    
    // Per Request: Admin uses Password, Others use OTP as default
    if (newRole === 'ADMIN') {
      setAuthMode('PASSWORD');
    } else {
      setAuthMode('OTP');
    }
  };

  const executeLogin = async (userObj: User) => {
    setIsAuthenticating(true);
    // Enforce 3-second premium loading delay for all roles
    await new Promise(resolve => setTimeout(resolve, 3000));
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
      setOtpTimer(60); // 1 Minute Countdown
    } catch (err: any) { 
      setError(getErrorMessage(err)); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue !== generatedOtp) { setError("Invalid security code."); return; }
    setLoading(true);
    setError(null);
    try {
      const profile = await db.auth.loginWithMobile(mobileNumber, role as 'TEACHER' | 'STUDENT');
      const userObj: User = {
        id: profile.id,
        /* Fix: Changed profile.full_name to profile.name */
        name: profile.name,
        email: `${mobileNumber}@edu.node`,
        role: profile.role as UserRole,
        class: (profile as any).class,
        section: (profile as any).section,
        profileImage: profile.profile_image
      };
      await createAuditLog(userObj, 'LOGIN', 'Auth', `Mobile OTP Login: ${mobileNumber}`);
      await executeLogin(userObj);
    } catch (err: any) { 
      setError(getErrorMessage(err)); 
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); 
    setError(null);
    try {
      const profile = await db.auth.login(username, password);
      const userObj: User = {
        id: profile.id,
        /* Fix: Changed profile.full_name to profile.name */
        name: profile.name,
        email: `${username}@edu.node`,
        role: profile.role as UserRole,
        class: profile.class,
        section: profile.section,
        profileImage: profile.profile_image
      };
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
    <div className="min-h-screen flex items-center justify-center bg-white p-6 relative overflow-hidden font-['Inter']">
      {/* 3-Second Loading Animation Overlay */}
      {isAuthenticating && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/90 backdrop-blur-2xl animate-in fade-in duration-500">
          <div className="w-full max-w-sm px-10 text-center space-y-8">
            <div className="relative">
              <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] mx-auto flex items-center justify-center text-white shadow-2xl animate-bounce">
                <Cloud size={40} />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-[2.5rem] animate-spin"></div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Establishing Session</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Synchronizing Identity with Cloud Node</p>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-indigo-600 rounded-full animate-[progress-grow_3s_linear]"></div>
            </div>
            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest animate-pulse italic">Connecting to Gateway...</p>
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
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3">Institutional Access Gateway</p>
        </div>

        <div className="frosted-neural-glass p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl">
          <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-8">
            {(['ADMIN', 'TEACHER', 'STUDENT'] as UserRole[]).map((r) => (
              <button 
                key={r} 
                disabled={loading || isAuthenticating}
                onClick={() => handleRoleChange(r)} 
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 disabled:opacity-50'}`}
              >
                {r}
              </button>
            ))}
          </div>

          {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-700 text-[10px] font-bold uppercase items-start leading-relaxed animate-shake"><ShieldAlert size={18} className="shrink-0"/>{error}</div>}

          {authMode === 'PASSWORD' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {role === 'ADMIN' ? 'admin username' : role === 'TEACHER' ? 'staff id code' : 'student gr number'}
                </label>
                <div className="relative">
                  <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    required 
                    disabled={loading || isAuthenticating} 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl font-black uppercase outline-none border-2 border-transparent focus:border-indigo-100 disabled:opacity-50" 
                    placeholder=""
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {role === 'ADMIN' ? 'admin password' : 'passphrase'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    disabled={loading || isAuthenticating} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full pl-14 pr-14 py-4 bg-slate-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-100 disabled:opacity-50" 
                    placeholder=""
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading || isAuthenticating} 
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20}/> : 'Authorize Login'}
              </button>
              
              {role !== 'ADMIN' && (
                <button 
                  type="button" 
                  onClick={() => setAuthMode('OTP')}
                  className="w-full text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Smartphone size={14}/> Switch to Mobile OTP
                </button>
              )}
            </form>
          ) : (
            <div className="space-y-6">
              {!isOtpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">registered mobile number</label>
                    <div className="relative">
                      <SmartphoneNfc className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
                      <input 
                        type="tel" 
                        required 
                        maxLength={10} 
                        disabled={loading || isAuthenticating} 
                        value={mobileNumber} 
                        onChange={e => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))} 
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl font-black outline-none border-2 border-transparent focus:border-indigo-100 tracking-[0.2em] disabled:opacity-50" 
                        placeholder="10-digit mobile" 
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading || isAuthenticating || otpTimer > 0} 
                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20}/> : <><SendHorizontal size={18}/> Request Code</>}
                  </button>
                  <button type="button" onClick={() => setAuthMode('PASSWORD')} className="w-full text-[9px] font-black text-slate-400 uppercase tracking-widest">Back to Password Login</button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">verification code</label>
                      {otpTimer > 0 && (
                        <span className="text-[9px] font-black text-indigo-500 flex items-center gap-1">
                          <Timer size={10} /> {formatTime(otpTimer)}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input 
                        type="text" 
                        required 
                        maxLength={6} 
                        disabled={loading || isAuthenticating} 
                        value={otpValue} 
                        onChange={e => setOtpValue(e.target.value.replace(/[^0-9]/g, ''))} 
                        className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl font-black text-2xl text-center tracking-[0.5em] outline-none border-2 border-transparent focus:border-indigo-100 shadow-inner disabled:opacity-50" 
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading || isAuthenticating} 
                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl uppercase text-xs shadow-xl flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20}/> : 'Authenticate Access'}
                  </button>
                  
                  <div className="flex flex-col items-center gap-4">
                    <button 
                      type="button" 
                      disabled={loading || isAuthenticating || otpTimer > 0} 
                      onClick={handleRequestOtp}
                      className={`text-[9px] font-black uppercase tracking-widest ${otpTimer > 0 ? 'text-slate-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-700'}`}
                    >
                      {otpTimer > 0 ? `Wait ${otpTimer}s to Resend` : 'Request New Code'}
                    </button>
                    <button 
                      type="button" 
                      disabled={loading || isAuthenticating} 
                      onClick={() => { setIsOtpSent(false); setOtpTimer(0); setAuthMode('PASSWORD'); }} 
                      className="text-[9px] font-black text-slate-400 uppercase tracking-widest disabled:opacity-50"
                    >
                      Cancel & Reset Role
                    </button>
                  </div>
                </form>
              )}
              <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                <ShieldCheck size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-indigo-700 leading-relaxed uppercase tracking-wider">
                  {role === 'STUDENT' ? 'Parents must enter the registered number. An OTP will be dispatched for multi-factor authentication.' : 'Authorized faculty members only. Access attempts are recorded in the institutional audit trail.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes progress-grow {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

// Additional Icon
const SmartphoneNfc = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/><path d="M17 8.5a5 5 0 0 1 0 7"/><path d="M14.3 10.1a2 2 0 0 1 0 3.8"/>
  </svg>
);

export default Login;
