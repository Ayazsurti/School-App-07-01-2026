
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
  Scan, 
  Smartphone,
  Key,
  RefreshCw,
  Clock,
  User as UserIcon,
  ChevronRight,
  ArrowLeft,
  Info,
  MessageCircle
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
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [generatedOtp, setGeneratedOtp] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    "CONNECTING TO GATEWAY",
    "GENERATING WHATSAPP TOKEN",
    "ENCRYPTING SECURITY CHANNEL",
    "UPLINK SUCCESSFUL"
  ];

  useEffect(() => {
    let interval: any;
    if (loading && !error) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [loading, error]);

  useEffect(() => {
    let timer: any;
    if (otpTimer > 0) {
      timer = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpTimer]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.length !== 10) {
      setError("Please enter a valid 10-digit registered number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Verify if mobile exists
      await db.auth.verifyMobile(mobileNumber, role as 'TEACHER' | 'STUDENT');
      
      // 2. Generate random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);

      // 3. Dispatch via WhatsApp Priority
      await db.sms.sendOTP(mobileNumber, otp);

      setIsOtpSent(true);
      setOtpTimer(60);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to dispatch WhatsApp token.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue !== generatedOtp) {
      setError("Invalid security token. Check your WhatsApp again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await db.auth.loginWithMobile(mobileNumber, role as 'TEACHER' | 'STUDENT');
      const authenticatedUser: User = {
        id: profile.id,
        name: profile.full_name,
        email: profile.email || `${mobileNumber}@edu.node`,
        role: profile.role as UserRole,
        profileImage: profile.profile_image,
        class: (profile as any).class,
        section: (profile as any).section
      };

      setTimeout(async () => {
        await createAuditLog(authenticatedUser, 'LOGIN', 'Auth', `${role} node authorized via WhatsApp OTP`);
        onLogin(authenticatedUser);
      }, 1500);
    } catch (err: any) {
      setError("Cloud authentication failure.");
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const profile = await db.auth.login(username, password);
      if (profile.role !== 'ADMIN') throw new Error(`ACCESS DENIED: ADMIN DIRECTORY ONLY.`);
      const authenticatedUser: User = {
        id: profile.id,
        name: profile.full_name,
        email: profile.email || `${username}@edu.node`,
        role: profile.role as UserRole,
        profileImage: profile.profile_image
      };
      setTimeout(async () => {
        await createAuditLog(authenticatedUser, 'LOGIN', 'Auth', `Admin authorized via passkey`);
        onLogin(authenticatedUser);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Access credentials rejected.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6 relative overflow-hidden font-['Inter']">
      <div className="absolute inset-0 neural-grid-white"></div>
      
      {loading && !error && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/98 backdrop-blur-2xl animate-in fade-in duration-500">
           <div className="relative mb-16">
              <div className="absolute -inset-20 border-[2px] border-emerald-100 rounded-full animate-core-rotate-slow"></div>
              <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-2xl border border-emerald-50 relative overflow-hidden z-10">
                <MessageCircle size={60} className="text-emerald-500" />
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,1)] animate-scan-line-fast opacity-60"></div>
              </div>
           </div>
           <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-3">
                 <h2 className="text-3xl font-black text-slate-800 uppercase tracking-[0.3em]">WhatsApp Auth</h2>
              </div>
              <div className="bg-slate-50 px-8 py-3 rounded-2xl border border-slate-100 shadow-inner">
                <p className="text-[11px] font-['Space_Mono'] font-bold text-emerald-600 uppercase tracking-[0.5em]">
                  {loadingMessages[loadingStep]}
                </p>
              </div>
           </div>
        </div>
      )}
      
      <div className="max-w-md w-full relative z-10 space-y-10">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
            <div className="absolute inset-0 border border-indigo-50 rounded-[2.5rem] animate-core-rotate-slow opacity-40"></div>
            <div className="relative w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-indigo-600 border-2 border-indigo-50 shadow-xl overflow-hidden">
              {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={40} />}
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{schoolName}</h1>
        </div>

        <div className={`frosted-neural-glass p-10 rounded-[3.5rem] relative group/card transition-all duration-500 ${error ? 'animate-shake' : ''}`}>
          <div className="flex bg-slate-50/80 p-1.5 rounded-2xl mb-10 border border-slate-100">
            {(['ADMIN', 'TEACHER', 'STUDENT'] as UserRole[]).map((r) => (
              <button 
                key={r}
                type="button"
                onClick={() => { setRole(r); setUsername(''); setPassword(''); setMobileNumber(''); setOtpValue(''); setIsOtpSent(false); setError(null); }}
                className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative ${role === r ? 'text-indigo-600 bg-white shadow-sm ring-1 ring-indigo-50' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {r}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-8 p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4">
              <AlertCircle size={20} className="text-rose-500 shrink-0" />
              <p className="text-[11px] font-bold text-rose-700 leading-relaxed uppercase">{error}</p>
            </div>
          )}

          {role === 'ADMIN' ? (
            <form onSubmit={handleAdminLogin} className="space-y-8 animate-in fade-in">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Username</label>
                <div className="relative">
                  <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input type="text" required value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Passkey</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-14 pr-14 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none font-bold" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl uppercase text-xs">Login Admin Node</button>
            </form>
          ) : (
            <div className="space-y-8 animate-in fade-in">
              {!isOtpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registered WhatsApp Number</label>
                    <div className="relative">
                      <MessageCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                      <input type="tel" required maxLength={10} value={mobileNumber} onChange={e => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))} placeholder="10-digit WhatsApp number" className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-emerald-100 rounded-2xl font-black outline-none tracking-widest" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl shadow-xl uppercase text-xs flex items-center justify-center gap-3">
                    SEND OTP TO WHATSAPP <ChevronRight size={18}/>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-8">
                  <div className="flex justify-between items-center px-1">
                    <button type="button" onClick={() => setIsOtpSent(false)} className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1"><ArrowLeft size={12}/> Back</button>
                    <span className="text-[9px] font-black text-slate-400 uppercase">To: +91 {mobileNumber.slice(0,2)}*****{mobileNumber.slice(8)}</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enter 6-Digit Code</label>
                    <div className="relative">
                      <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                      <input type="text" required maxLength={6} value={otpValue} onChange={e => setOtpValue(e.target.value.replace(/[^0-9]/g, ''))} className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl font-black text-2xl text-center tracking-[0.8em] outline-none" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    {otpTimer > 0 ? <p className="text-[9px] font-bold text-slate-400 uppercase">Resend in {otpTimer}s</p> : <button type="button" onClick={handleRequestOtp} className="text-[9px] font-black text-emerald-600 uppercase">Resend to WhatsApp</button>}
                  </div>
                  <button type="submit" className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl uppercase text-xs">Verify WhatsApp Token</button>
                </form>
              )}
              <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-4">
                <Info size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-emerald-700 leading-relaxed uppercase">The security code is sent only via WhatsApp to your father's registered mobile number.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
