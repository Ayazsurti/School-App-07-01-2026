
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
  Clock
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
  const [otp, setOtp] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

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
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const profile = await db.auth.login(username, password);
      
      if (profile.role !== 'ADMIN') {
        throw new Error(`ACCESS DENIED: Role mismatch.`);
      }

      const authenticatedUser: User = {
        id: profile.id,
        name: profile.full_name,
        email: profile.email || `${username}@edu.node`,
        role: 'ADMIN',
        profileImage: profile.profile_image
      };

      setTimeout(async () => {
        await createAuditLog(authenticatedUser, 'LOGIN', 'Auth', `Admin terminal authorized`);
        onLogin(authenticatedUser);
      }, 2000);

    } catch (err: any) {
      setTimeout(() => {
        setError(err.message || "UPLINK FAILURE: Access credentials rejected.");
        setLoading(false);
      }, 800);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.length < 10) {
      setError("VALIDATION ERROR: Provide a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Step 1: Verify mobile exists in DB for this role
      await db.auth.verifyMobile(mobileNumber, role as 'TEACHER' | 'STUDENT');
      
      // Step 2: Real-world OTP generation (6 digit)
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Step 3: CALL THE SMS GATEWAY
      await db.sms.sendOTP(mobileNumber, mockOtp);
      
      setGeneratedOtp(mockOtp);
      setIsOtpSent(true);
      setLoading(false);
      setCountdown(60); // 60s cooldown for resend

      // NOTE: In production, the alert below should be removed and the user gets real SMS.
      alert(`Cloud Access Protocol: Your One-Time Key is ${mockOtp} (Simulated for Demo)`);

    } catch (err: any) {
      setTimeout(() => {
        setError(err.message || "NODE NOT FOUND: Mobile number not registered.");
        setLoading(false);
      }, 800);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== generatedOtp) {
      setError("SECURITY BREACH: Invalid Access Token (OTP).");
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
        profileImage: profile.profile_image
      };

      setTimeout(async () => {
        await createAuditLog(authenticatedUser, 'LOGIN', 'Auth', `${role} node authorized via OTP`);
        onLogin(authenticatedUser);
      }, 2000);

    } catch (err: any) {
      setTimeout(() => {
        setError("UPLINK FAILURE: Identity verification failed.");
        setLoading(false);
      }, 800);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6 relative overflow-hidden font-['Inter']">
      <div className="absolute inset-0 neural-grid-white"></div>
      
      <div className="absolute top-[10%] left-[20%] w-64 h-64 bg-indigo-50/50 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[10%] right-[20%] w-80 h-80 bg-cyan-50/50 rounded-full blur-[120px]"></div>

      {loading && !error && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-white/98 backdrop-blur-2xl animate-in fade-in duration-500">
           <div className="relative mb-16">
              <div className="absolute -inset-20 border-[2px] border-indigo-100 rounded-full animate-core-rotate-slow"></div>
              <div className="absolute -inset-12 border-[2px] border-cyan-100 rounded-full animate-core-rotate-slow" style={{ animationDirection: 'reverse' }}></div>
              <div className="absolute -inset-6 border-[3px] border-indigo-500/20 rounded-full animate-biometric-pulse"></div>
              
              <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-2xl border border-indigo-50 relative overflow-hidden z-10">
                {schoolLogo ? <img src={schoolLogo} className="w-full h-full object-cover" alt="Logo" /> : <School size={60} className="text-indigo-400" />}
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
            <div className="absolute inset-0 border border-indigo-50 rounded-[2.5rem] animate-core-rotate-slow opacity-40"></div>
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
          <div className="flex bg-slate-50/80 p-1.5 rounded-2xl mb-10 border border-slate-100">
            {(['ADMIN', 'TEACHER', 'STUDENT'] as UserRole[]).map((r) => (
              <button 
                key={r}
                type="button"
                onClick={() => { setRole(r); setUsername(''); setPassword(''); setMobileNumber(''); setOtp(''); setIsOtpSent(false); setError(null); }}
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

          {role === 'ADMIN' ? (
            /* Admin Password Login */
            <form onSubmit={handleAdminLogin} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-['Space_Mono'] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Registry ID</label>
                <div className="relative group/input">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors">
                     <Fingerprint size={20} />
                  </div>
                  <input 
                    type="text" 
                    required 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    placeholder="ID-PROTOCOL-ADMIN" 
                    className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none font-['Space_Mono'] font-bold text-slate-800 transition-all shadow-inner placeholder:text-slate-300" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-['Space_Mono'] font-black text-slate-400 uppercase tracking-widest ml-1">Encryption Key</label>
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
                className="group w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 text-xs tracking-[0.4em] uppercase disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    <span>UPLINK ACCESS</span>
                    <Zap size={18} className="text-white" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Teacher/Student OTP Login */
            <div className="space-y-8 animate-in slide-in-from-right-4">
               {!isOtpSent ? (
                 <form onSubmit={handleRequestOtp} className="space-y-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-['Space_Mono'] font-black text-slate-400 uppercase tracking-widest ml-1">Registered Mobile Number</label>
                      <div className="relative group/input">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors">
                           <Smartphone size={20} />
                        </div>
                        <input 
                          type="tel" 
                          required 
                          maxLength={10}
                          value={mobileNumber} 
                          onChange={e => setMobileNumber(e.target.value.replace(/\D/g, ''))} 
                          placeholder="8128547144" 
                          className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none font-['Space_Mono'] font-bold text-slate-800 transition-all shadow-inner" 
                        />
                      </div>
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={loading || mobileNumber.length < 10} 
                      className="group w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 text-xs tracking-[0.4em] uppercase disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>
                          <span>SEND SECURE TOKEN</span>
                          <Key size={18} className="text-white" />
                        </>
                      )}
                    </button>
                 </form>
               ) : (
                 <form onSubmit={handleVerifyOtp} className="space-y-8">
                    <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-3xl text-center">
                       <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Code sent via Cloud Gateway</p>
                       <p className="text-sm font-black text-slate-700 tracking-[0.2em]">+91 {mobileNumber.replace(/.(?=.{4})/g, '•')}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-['Space_Mono'] font-black text-slate-400 uppercase tracking-widest ml-1">Authentication Token (6-Digits)</label>
                      <div className="relative group/input">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors">
                           <ShieldCheck size={20} />
                        </div>
                        <input 
                          type="text" 
                          required 
                          maxLength={6}
                          value={otp} 
                          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} 
                          placeholder="000000" 
                          className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-2xl outline-none font-['Space_Mono'] font-bold text-slate-800 transition-all shadow-inner text-center text-2xl tracking-[0.5em]" 
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                       <button 
                        type="submit" 
                        disabled={loading || otp.length < 6} 
                        className="group w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 text-xs tracking-[0.4em] uppercase disabled:opacity-50"
                       >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                          <>
                            <span>AUTHENTICATE NODE</span>
                            <Zap size={18} className="text-white" />
                          </>
                        )}
                       </button>

                       <div className="flex justify-between items-center px-1">
                          <button type="button" onClick={() => { setIsOtpSent(false); setOtp(''); }} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center gap-2">
                             <RefreshCw size={12}/> Switch Node
                          </button>
                          {countdown > 0 ? (
                            <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1"><Clock size={10}/> Retry in {countdown}s</span>
                          ) : (
                            <button type="button" onClick={handleRequestOtp} className="text-[9px] font-black text-indigo-600 uppercase hover:underline">Resend OTP</button>
                          )}
                       </div>
                    </div>
                 </form>
               )}
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center gap-8">
             <div className="flex gap-12">
                <div className="flex flex-col items-center gap-2">
                   <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-300">
                      <Globe size={18} />
                   </div>
                   <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Global Grid</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-300">
                      <Database size={18} />
                   </div>
                   <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Vault Secure</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-300">
                      <ShieldCheck size={18} />
                   </div>
                   <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">Compliance</span>
                </div>
             </div>
             <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">NODE REQ: MASTER.2026.UPLINK</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
