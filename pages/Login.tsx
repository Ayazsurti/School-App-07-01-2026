
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
  Zap, 
  Globe,
  Database,
  Scan,
  Smartphone,
  Key,
  RefreshCw,
  Clock,
  User as UserIcon,
  ChevronRight,
  ArrowLeft,
  Info
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
    "NEURAL UPLINK INITIATED",
    "SCANNING BIOMETRIC DATA",
    "DECRYPTING SECURITY VAULT",
    "IDENTITY AUTHENTICATED"
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
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Verify if mobile exists for the chosen role
      await db.auth.verifyMobile(mobileNumber, role as 'TEACHER' | 'STUDENT');
      
      // 2. Generate a random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);

      // 3. Dispatch via SMS Gateway (Simulated/Real depending on supabase.ts config)
      await db.sms.sendOTP(mobileNumber, otp);

      setIsOtpSent(true);
      setOtpTimer(60);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to dispatch security token.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue !== generatedOtp) {
      setError("Invalid security token. Please try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await db.auth.loginWithMobile(mobileNumber, role as 'TEACHER' | 'STUDENT');
      
      // Fix: class and section are now part of the profile object returned by loginWithMobile
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
        await createAuditLog(authenticatedUser, 'LOGIN', 'Auth', `${role} node authorized via Mobile OTP`);
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
      
      if (profile.role !== 'ADMIN') {
        throw new Error(`ACCESS DENIED: Credentials do not match the ADMIN directory.`);
      }

      const authenticatedUser: User = {
        id: profile.id,
        name: profile.full_name,
        email: profile.email || `${username}@edu.node`,
        role: profile.role as UserRole,
        profileImage: profile.profile_image
      };

      setTimeout(async () => {
        await createAuditLog(authenticatedUser, 'LOGIN', 'Auth', `Admin node authorized via master passkey`);
        onLogin(authenticatedUser);
      }, 2000);
    } catch (err: any) {
      setError(err.message || "UPLINK FAILURE: Access credentials rejected.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6 relative overflow-hidden font-['Inter']">
      <div className="absolute inset-0 neural-grid-white"></div>
      
      {loading && !error && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/98 backdrop-blur-2xl animate-in fade-in duration-500">
           <div className="relative mb-16">
              <div className="absolute -inset-20 border-[2px] border-indigo-100 rounded-full animate-core-rotate-slow"></div>
              <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-2xl border border-indigo-50 relative overflow-hidden z-10">
                {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={60} className="text-indigo-400" />}
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 shadow-[0_0_15px_rgba(99,102,241,1)] animate-scan-line-fast opacity-60"></div>
              </div>
           </div>
           <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-3">
                 <Scan className="text-indigo-500 animate-pulse" size={28} />
                 <h2 className="text-3xl font-black text-slate-800 uppercase tracking-[0.3em]">Authenticating</h2>
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
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-8 flex items-center justify-center">
            <div className="absolute inset-0 border border-indigo-50 rounded-[2.5rem] animate-core-rotate-slow opacity-40"></div>
            <div className="relative w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-indigo-600 border-2 border-indigo-50 shadow-xl overflow-hidden">
              {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={40} />}
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{schoolName} <span className="text-indigo-600">Portal</span></h1>
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
                {role === r && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-8 p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} className="text-rose-500 shrink-0" />
              <p className="text-[11px] font-bold text-rose-700 leading-relaxed uppercase">{error}</p>
            </div>
          )}

          {/* ADMIN LOGIN FORM */}
          {role === 'ADMIN' && (
            <form onSubmit={handleAdminLogin} className="space-y-8 animate-in fade-in duration-500">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registry ID / Username</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                    <UserIcon size={20} />
                  </div>
                  <input 
                    type="text" 
                    required 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    placeholder="Enter Admin ID"
                    className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none font-bold text-slate-800 transition-all shadow-inner" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Key</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                    <Lock size={20} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    className="w-full pl-14 pr-14 py-5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none font-bold text-slate-800 transition-all shadow-inner" 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-300 hover:text-indigo-500">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 text-xs tracking-[0.4em] uppercase"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <span>AUTHENTICATE</span>}
              </button>
            </form>
          )}

          {/* TEACHER / STUDENT OTP LOGIN FORM */}
          {role !== 'ADMIN' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {!isOtpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-8 animate-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registered Mobile Number</label>
                    <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                        <Smartphone size={20} />
                      </div>
                      <input 
                        type="tel" 
                        required 
                        maxLength={10}
                        value={mobileNumber} 
                        onChange={e => setMobileNumber(e.target.value.replace(/[^0-9]/g, ''))} 
                        placeholder="10-digit number"
                        className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none font-black text-slate-800 transition-all shadow-inner tracking-widest" 
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading || mobileNumber.length !== 10} 
                    className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 text-xs tracking-[0.4em] uppercase disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <div className="flex items-center gap-3">GENERATE OTP <ChevronRight size={18}/></div>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-8 animate-in slide-in-from-right-4">
                  <div className="flex items-center justify-between mb-2">
                    <button type="button" onClick={() => { setIsOtpSent(false); setOtpValue(''); }} className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1 hover:underline"><ArrowLeft size={12}/> Change Number</button>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">To: +91 {mobileNumber.slice(0,2)}******{mobileNumber.slice(8)}</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enter 6-Digit OTP</label>
                    <div className="relative">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">
                        <Key size={20} />
                      </div>
                      <input 
                        type="text" 
                        required 
                        maxLength={6}
                        value={otpValue} 
                        onChange={e => setOtpValue(e.target.value.replace(/[^0-9]/g, ''))} 
                        placeholder="••••••"
                        className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none font-black text-indigo-600 text-2xl transition-all shadow-inner tracking-[0.8em]" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    {otpTimer > 0 ? (
                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase"><Clock size={12} className="text-indigo-400" /> Resend in {otpTimer}s</p>
                    ) : (
                      <button type="button" onClick={handleRequestOtp} className="text-[10px] font-black text-indigo-500 uppercase hover:underline flex items-center gap-1"><RefreshCw size={12}/> Resend Token</button>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || otpValue.length !== 6} 
                    className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 text-xs tracking-[0.4em] uppercase disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <span>VERIFY & SIGN IN</span>}
                  </button>
                </form>
              )}
              
              <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                {/* Fix: Added missing Info icon import */}
                <Info size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-indigo-700 leading-relaxed uppercase">The OTP is sent to the mobile number registered in the school directory. Contact Admin if you haven't updated your profile.</p>
              </div>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center gap-4 text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">
             <div className="flex gap-8">
                <div className="flex flex-col items-center gap-1"><Database size={14}/><span>VAULT</span></div>
                <div className="flex flex-col items-center gap-1"><ShieldCheck size={14}/><span>SECURE</span></div>
             </div>
             <p>SYSTEM.UPLINK.PRO</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
