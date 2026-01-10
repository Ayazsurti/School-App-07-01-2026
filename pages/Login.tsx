
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ShieldCheck, User as UserIcon, GraduationCap, Lock, UserCircle, Eye, EyeOff, School, AlertCircle, Smartphone, KeyRound, ArrowRight, RefreshCcw } from 'lucide-react';
import { APP_NAME, MOCK_STUDENTS, MOCK_TEACHERS } from '../constants';
import { createAuditLog } from '../utils/auditLogger';

interface LoginProps {
  onLogin: (user: User) => void;
  schoolLogo: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, schoolLogo }) => {
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginStep, setLoginStep] = useState<'ID' | 'OTP'>('ID');

  const resetState = (newRole: UserRole) => {
    setRole(newRole);
    setError(null);
    setUsername('');
    setPassword('');
    setMobile('');
    setOtp('');
    setLoginStep('ID');
  };

  const handleAdminLogin = async () => {
    setLoading(true);
    setError(null);

    const ADMIN_CREDENTIALS = [
      { user: 'admin', pass: 'admin123', name: 'Ayaz Surti' },
      { user: 'ayazsurti', pass: 'Ayaz78692', name: 'Ayaz Surti' },
      { user: 'zuber', pass: 'Zuber@1993', name: 'Zuber Shaikh' }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));

    const target = ADMIN_CREDENTIALS.find(c => 
      c.user.toLowerCase() === username.toLowerCase() && 
      c.pass === password
    );

    if (target) {
      const authenticatedUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: target.name,
        email: `${target.user}@${APP_NAME.toLowerCase().replace(/\s+/g, '')}.com`,
        role: 'ADMIN',
      };
      createAuditLog(authenticatedUser, 'LOGIN', 'Auth', 'Admin verified via Identity Token');
      onLogin(authenticatedUser);
    } else {
      setError("Access Denied: Invalid Admin Credentials.");
    }
    setLoading(false);
  };

  const requestOTP = async () => {
    if (mobile.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 1000));

    let found = false;
    if (role === 'STUDENT') {
      found = MOCK_STUDENTS.some(s => s.mobile === mobile);
    } else if (role === 'TEACHER') {
      found = MOCK_TEACHERS.some(t => t.mobile === mobile);
    }

    if (found) {
      setLoginStep('OTP');
    } else {
      setError(`Registry Error: Mobile number not found for ${role.toLowerCase()} role.`);
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 800));

    // Mock OTP is 123456
    if (otp === '123456') {
      let userData: any;
      if (role === 'STUDENT') {
        userData = MOCK_STUDENTS.find(s => s.mobile === mobile);
      } else {
        userData = MOCK_TEACHERS.find(t => t.mobile === mobile);
      }

      const authenticatedUser: User = {
        ...userData,
        id: userData.id,
        name: userData.name,
        email: userData.email || `${mobile}@school.com`,
        role,
      };
      createAuditLog(authenticatedUser, 'LOGIN', 'Auth', `${role} verified via OTP Registry`);
      onLogin(authenticatedUser);
    } else {
      setError("Verification Failed: Incorrect OTP entered.");
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'ADMIN') {
      handleAdminLogin();
    } else {
      if (loginStep === 'ID') requestOTP();
      else verifyOTP();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden transition-colors">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100/50 dark:bg-indigo-900/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10 group">
          <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white font-bold text-4xl mx-auto shadow-2xl mb-6 overflow-hidden border-4 border-white dark:border-slate-800 ring-1 ring-slate-100 dark:ring-slate-700 transition-transform group-hover:scale-105 duration-500">
            {schoolLogo ? (
              <img src={schoolLogo} className="w-full h-full object-cover" alt="School Logo" />
            ) : (
              <div className="w-full h-full bg-indigo-600 flex items-center justify-center">
                <School size={40} strokeWidth={2.5} />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-1">Institutional Portal</p>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">{APP_NAME}</h1>
            <div className="w-12 h-1.5 bg-indigo-600 mx-auto mt-4 rounded-full opacity-20"></div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 transition-all">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Secure Access</h2>
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Verify your identity to proceed.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-8 p-1.5 bg-slate-100/80 dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700">
            <button 
              type="button"
              onClick={() => resetState('ADMIN')}
              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${role === 'ADMIN' ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <ShieldCheck size={14} /> Admin
            </button>
            <button 
              type="button"
              onClick={() => resetState('TEACHER')}
              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${role === 'TEACHER' ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <UserIcon size={14} /> Teacher
            </button>
            <button 
              type="button"
              onClick={() => resetState('STUDENT')}
              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${role === 'STUDENT' ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <GraduationCap size={14} /> Student
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {role === 'ADMIN' ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Identity ID</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                      <UserCircle size={18} />
                    </div>
                    <input 
                      type="text" 
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Admin Username"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 font-bold text-slate-700 dark:text-white transition-all shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-14 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 font-bold text-slate-700 dark:text-white transition-all shadow-inner"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 dark:text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {loginStep === 'ID' ? (
                  <div className="space-y-1.5 animate-in slide-in-from-right-4 duration-300">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Mobile Number</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                        <Smartphone size={18} />
                      </div>
                      <input 
                        type="tel" 
                        required
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').substring(0, 10))}
                        placeholder="Enter Registered Mobile"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 font-black text-slate-800 dark:text-white transition-all shadow-inner tracking-[0.1em]"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">OTP will be sent to this number</p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Smartphone size={16} className="text-indigo-600" />
                          <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">Sent to +91 {mobile}</span>
                       </div>
                       <button type="button" onClick={() => setLoginStep('ID')} className="text-[10px] font-black text-indigo-500 hover:underline uppercase">Change</button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Enter 6-Digit OTP</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                          <KeyRound size={18} />
                        </div>
                        <input 
                          type="text" 
                          required
                          autoFocus
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                          placeholder="0 0 0 0 0 0"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 font-black text-slate-800 dark:text-white transition-all shadow-inner text-center text-2xl tracking-[0.5em]"
                        />
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <button type="button" className="text-[9px] font-black text-slate-400 hover:text-indigo-600 uppercase flex items-center gap-1 transition-colors">
                          <RefreshCcw size={10} /> Resend OTP
                        </button>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">Wait 00:59</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-2xl hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm tracking-widest uppercase ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {role === 'ADMIN' ? 'Authenticate Admin' : loginStep === 'ID' ? 'Request OTP' : 'Verify & Sign In'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-8 text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-[0.2em]">
          &copy; 2026 DEEN-E-ISLAM Institutional Engine
        </p>
      </div>
    </div>
  );
};

export default Login;
