
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { 
  ShieldCheck, Lock, Eye, EyeOff, School, Loader2, Smartphone,
  Key, ChevronRight, Hash, ShieldAlert,
  SendHorizontal, SmartphoneNfc, Timer, Cloud, CheckCircle2, UserCircle,
  Fingerprint, Cpu, Globe, Activity, Shield
} from 'lucide-react';
import { db, getErrorMessage } from '../supabase';
import { createAuditLog } from '../utils/auditLogger';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import firebaseApp from '../firebase';

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
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Initializing Neural Uplink...");
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth(firebaseApp);

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
    setAuthMode('PASSWORD'); 
  };

  const executeLogin = async (userObj: User) => {
    setIsAuthenticating(true);
    const statuses = ["Authenticating Protocol...", "Synchronizing Cloud Node...", "Securing Session Link..."];
    let currentStep = 0;
    const statusInterval = setInterval(() => {
      currentStep++;
      if (currentStep < statuses.length) setSyncStatus(statuses[currentStep]);
    }, 600);

    await new Promise(resolve => setTimeout(resolve, 1800));
    clearInterval(statusInterval);
    setIsAuthenticating(false);
    onLogin(userObj);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = mobileNumber.trim();
    if (cleanMobile.length !== 10) { 
      setError("Please enter a valid 10-digit registered number."); 
      return; 
    }
    
    setLoading(true); 
    setError(null);
    
    try {
      // 1. Verify existence in Supabase registry first
      await db.auth.verifyMobile(cleanMobile, role as 'TEACHER' | 'STUDENT');
      
      // 2. Trigger Firebase Phone Auth
      const fullNumber = `+91${cleanMobile}`;
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
      
      const result = await signInWithPhoneNumber(auth, fullNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setIsOtpSent(true); 
      setOtpTimer(60);
      await createAuditLog({ name: 'System', role: 'ADMIN' } as any, 'LOGIN', 'Auth', `OTP Requested for: ${cleanMobile}`);
    } catch (err: any) { 
      setError(getErrorMessage(err)); 
      // Reset reCAPTCHA on error if needed
      const container = document.getElementById('recaptcha-container');
      if (container) container.innerHTML = '';
    } finally { 
      setLoading(false); 
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) { setError("Session expired. Please re-request code."); return; }
    if (otpValue.length !== 6) { setError("Please enter the 6-digit code."); return; }
    
    setLoading(true); 
    setError(null);
    
    try {
      // 1. Confirm code with Firebase
      await confirmationResult.confirm(otpValue);
      
      // 2. Fetch full profile from Supabase
      const profile = await db.auth.loginWithMobile(mobileNumber, role as 'TEACHER' | 'STUDENT');
      const userObj: User = {
        id: profile.id,
        name: profile.full_name || profile.name,
        email: profile.email || `${mobileNumber}@edu.node`,
        role: (profile as any).role || role,
        class: String((profile as any).class || '').trim(),
        section: String((profile as any).section || 'A').trim(),
        profileImage: profile.profile_image,
        mobile: (profile as any).mobile || (profile as any).father_mobile,
        accessRights: profile.access_rights || []
      } as any;
      
      await createAuditLog(userObj, 'LOGIN', 'Auth', `Mobile Identity Verified: ${mobileNumber}`);
      await executeLogin(userObj);
    } catch (err: any) { 
      setError("Security Code Verification Failed. Identity Rejected."); 
      setLoading(false); 
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError("Institutional ID and Access Key are mandatory."); return; }
    
    setLoading(true); 
    setError(null);
    
    try {
      const profile = await db.auth.login(username, password);
      
      // Validate that the role matches the selected tab (unless Admin using master key)
      if (profile.role !== 'ADMIN' && profile.role !== role) {
        throw new Error("ROLE_MISMATCH: The provided credentials belong to a different identity type.");
      }

      const userObj: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email || `${username}@edu.node`,
        role: profile.role,
        class: String(profile.class || '').trim(),
        section: String(profile.section || 'A').trim(),
        profileImage: profile.profile_image,
        accessRights: (profile as any).accessRights || [],
        permissions: (profile as any).permissions || []
      } as any;
      
      await createAuditLog(userObj, 'LOGIN', 'Auth', `${role} Secure Credentials Session`);
      await executeLogin(userObj);
    } catch (err: any) { 
      setError(getErrorMessage(err)); 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6 relative overflow-hidden font-['Inter'] selection:bg-indigo-100 selection:text-indigo-900">
      {isAuthenticating && (
        <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-slate-950 animate-in fade-in duration-500">
          <div className="absolute inset-0 neural-grid-white opacity-10"></div>
          <div className="w-full max-sm px-10 text-center space-y-12 relative">
            <div className="relative mx-auto w-32 h-32">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl animate-neural-pulse"></div>
              <div className="absolute inset-8 bg-indigo-600 rounded-3xl shadow-[0_0_40px_rgba(79,70,229,0.5)] flex items-center justify-center text-white border border-white/20">
                <Shield size={40} className="animate-pulse" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white uppercase tracking-[0.3em] animate-pulse">{syncStatus}</h2>
              <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500 rounded-full animate-[progress-grow_2s_linear] w-full origin-left"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0 neural-grid-white opacity-30"></div>
      
      <div className="max-w-md w-full relative z-10 space-y-10">
        <div className="text-center">
          <div className="w-28 h-28 bg-indigo-600 rounded-[2.8rem] mx-auto flex items-center justify-center text-white shadow-2xl mb-8 overflow-hidden border-4 border-white transition-all hover:scale-105 active:scale-95 group">
            {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Logo" /> : <School size={48} />}
          </div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">{schoolName}</h1>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-4 flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-indigo-500"/> Institutional Terminal
          </p>
        </div>

        <div className="frosted-neural-glass p-10 rounded-[4rem] border border-slate-100 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.12)]">
          <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-10 border border-slate-100/50">
            {(['ADMIN', 'TEACHER', 'STUDENT'] as UserRole[]).map((r) => (
              <button 
                key={r} 
                disabled={loading || isAuthenticating}
                onClick={() => handleRoleChange(r)} 
                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === r ? 'bg-white text-indigo-600 shadow-md scale-[1.02]' : 'text-slate-400 hover:text-slate-600 disabled:opacity-50'}`}
              >
                {r}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-8 p-5 bg-rose-50 border-2 border-rose-100 rounded-3xl flex gap-4 text-rose-700 text-[10px] font-black uppercase items-start leading-relaxed animate-shake">
              <ShieldAlert size={20} className="shrink-0 text-rose-500 mt-0.5"/>
              <div>
                <p className="font-black">Identity Validation Error</p>
                <p className="opacity-70 mt-1 font-bold">{error}</p>
              </div>
            </div>
          )}

          {authMode === 'PASSWORD' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                  {role === 'ADMIN' ? 'Administrator Login' : role === 'TEACHER' ? 'Faculty Identity' : 'Student Identity (GR No)'}
                </label>
                <div className="relative group">
                  <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    required 
                    disabled={loading || isAuthenticating} 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-[1.8rem] font-black uppercase outline-none disabled:opacity-50 transition-all shadow-inner text-sm placeholder:text-slate-300" 
                    placeholder={role === 'ADMIN' ? "Enter Admin Code" : role === 'TEACHER' ? "Enter Username" : "Enter GR Number"} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Master Access Key</label>
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    disabled={loading || isAuthenticating} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full pl-16 pr-16 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-[1.8rem] font-black outline-none disabled:opacity-50 tracking-[0.4em] transition-all shadow-inner text-sm placeholder:text-slate-300" 
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors">
                    {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                  </button>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={loading || isAuthenticating} 
                className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2.2rem] shadow-2xl hover:bg-indigo-700 hover:shadow-indigo-200 transition-all flex items-center justify-center gap-4 disabled:opacity-50 active:scale-95 border-b-4 border-indigo-800"
              >
                {loading ? <Loader2 className="animate-spin" size={24}/> : (
                  <>
                    <ShieldCheck size={24} />
                    <span className="tracking-[0.2em] text-xs uppercase">Authorize Identity</span>
                  </>
                )}
              </button>
              {role !== 'ADMIN' && (
                <button type="button" onClick={() => setAuthMode('OTP')} className="w-full text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-all flex items-center justify-center gap-2 py-3 rounded-2xl hover:bg-indigo-50/50">
                  <SmartphoneNfc size={18}/> 
                  <span>Switch to Phone OTP</span>
                </button>
              )}
            </form>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              {!isOtpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Registered Mobile Number</label>
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                         <Smartphone className="text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                         <span className="text-xs font-black text-slate-400">+91</span>
                      </div>
                      <input type="tel" required maxLength={10} disabled={loading || isAuthenticating} value={mobileNumber} onChange={e => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))} className="w-full pl-20 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-[1.8rem] font-black outline-none tracking-[0.4em] disabled:opacity-50 shadow-inner text-sm placeholder:text-slate-200" placeholder="0000000000" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading || isAuthenticating || otpTimer > 0} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2.2rem] shadow-2xl flex items-center justify-center gap-4 hover:bg-indigo-700 transition-all disabled:opacity-50 border-b-4 border-indigo-800">
                    {loading ? <Loader2 className="animate-spin" size={24}/> : <><SendHorizontal size={22}/> Request Security Code</>}
                  </button>
                  <button type="button" onClick={() => setAuthMode('PASSWORD')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 hover:text-indigo-600 transition-all text-center">Back to Credentials</button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Code</label>
                      {otpTimer > 0 ? (
                        <span className="text-[10px] font-black text-indigo-500 flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full"><Timer size={14} className="animate-pulse" /> {Math.floor(otpTimer/60)}:{(otpTimer%60).toString().padStart(2,'0')}</span>
                      ) : (
                        <button type="button" onClick={handleRequestOtp} className="text-[10px] font-black text-indigo-600 underline">Resend Code</button>
                      )}
                    </div>
                    <div className="relative group">
                      <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500" size={24} />
                      <input type="text" required maxLength={6} disabled={loading || isAuthenticating} value={otpValue} onChange={e => setOtpValue(e.target.value.replace(/[^0-9]/g, ''))} className="w-full pl-16 pr-6 py-6 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-[2rem] font-black text-3xl text-center tracking-[0.8em] outline-none shadow-inner disabled:opacity-50" placeholder="000000" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading || isAuthenticating} className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2.2rem] shadow-2xl flex items-center justify-center gap-4 hover:bg-indigo-700 transition-all border-b-4 border-indigo-800 active:scale-95">
                    {loading ? <Loader2 className="animate-spin" size={24}/> : 'Finalize Identity Verification'}
                  </button>
                  <button type="button" onClick={() => setIsOtpSent(false)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 text-center">Change Phone Number</button>
                </form>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center gap-10 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
           <div className="flex flex-col items-center gap-2 group cursor-help">
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-50 transition-colors"><Cpu size={20} className="text-slate-400 group-hover:text-indigo-600"/></div>
              <span className="text-[9px] font-black uppercase tracking-widest">v7.0 Core</span>
           </div>
           <div className="flex flex-col items-center gap-2 group cursor-help">
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-50 transition-colors"><Globe size={20} className="text-slate-400 group-hover:text-indigo-600"/></div>
              <span className="text-[9px] font-black uppercase tracking-widest">Neural Link</span>
           </div>
           <div className="flex flex-col items-center gap-2 group cursor-help">
              <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-indigo-50 transition-colors"><Activity size={20} className="text-slate-400 group-hover:text-indigo-600"/></div>
              <span className="text-[9px] font-black uppercase tracking-widest">Uplink: OK</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
