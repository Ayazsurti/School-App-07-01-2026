import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ShieldCheck, User as UserIcon, GraduationCap, Lock, UserCircle, Eye, EyeOff, School, AlertCircle } from 'lucide-react';
import { APP_NAME } from '../constants';
import { createAuditLog } from '../utils/auditLogger';

interface LoginProps {
  onLogin: (user: User) => void;
  schoolLogo: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, schoolLogo }) => {
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Institutional Registry Credentials
    const VALID_CREDENTIALS = [
      { role: 'ADMIN', user: 'Ayazsurti', pass: 'Ayaz78692', name: 'Ayaz Surti' },
      { role: 'ADMIN', user: 'Zuber', pass: 'Zuber@1993', name: 'Zuber Shaikh' },
      { role: 'TEACHER', user: 'teacher', pass: 'teacher123', name: 'Staff Member' },
      { role: 'STUDENT', user: 'student', pass: 'student123', name: 'Student' }
    ];

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const target = VALID_CREDENTIALS.find(c => 
        c.role === role && 
        c.user === username && 
        c.pass === password
      );
      
      if (target) {
        const authenticatedUser: User = {
          id: Math.random().toString(36).substr(2, 9),
          name: target.name,
          email: `${target.user}@${APP_NAME.toLowerCase().replace(/\s+/g, '')}.com`,
          role,
        };
        createAuditLog(authenticatedUser, 'LOGIN', 'Auth', 'Identity verified via Institutional Registry');
        onLogin(authenticatedUser);
      } else {
        setError(`Access Denied: Incorrect credentials for ${role.toLowerCase()}. Please check your username and password.`);
      }
    } catch (err) {
      console.error("Login Engine Error:", err);
      setError("Portal Connection Timeout. Please try again.");
    } finally {
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden transition-colors">
      {/* Decorative Branding Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100/50 dark:bg-indigo-900/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10 group">
          <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-white font-bold text-4xl mx-auto shadow-2xl shadow-indigo-100 dark:shadow-none mb-6 overflow-hidden border-4 border-white dark:border-slate-800 ring-1 ring-slate-100 dark:ring-slate-700 transition-transform group-hover:scale-105 duration-500">
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

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 transition-colors">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Authorized Access</h2>
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Verify your institutional identity.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-8 p-1.5 bg-slate-100/80 dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700">
            <button 
              type="button"
              onClick={() => { setRole('ADMIN'); setError(null); }}
              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${role === 'ADMIN' ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <ShieldCheck size={14} /> Admin
            </button>
            <button 
              type="button"
              onClick={() => { setRole('TEACHER'); setError(null); }}
              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${role === 'TEACHER' ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <UserIcon size={14} /> Staff
            </button>
            <button 
              type="button"
              onClick={() => { setRole('STUDENT'); setError(null); }}
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 dark:text-slate-600 group-focus-within:text-indigo-500 transition-colors">
                  <UserCircle size={18} />
                </div>
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={`Institutional ID`}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
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
                  className="w-full pl-12 pr-14 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-900 font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm tracking-widest uppercase ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Log into Registry'}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-600 font-bold tracking-tight">
              Institutional ID: <span className="text-slate-900 dark:text-slate-300">EMS-2026-001-A</span>
            </p>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-[0.2em]">
          &copy; 2026 {APP_NAME} Local Engine Active
        </p>
      </div>
    </div>
  );
};

export default Login;