
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ShieldCheck, User as UserIcon, GraduationCap, Lock, UserCircle, Eye, EyeOff, School, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Artificial delay for professional feel
    await new Promise(resolve => setTimeout(resolve, 1000));

    let authenticatedUser: User | null = null;

    if (role === 'ADMIN') {
      const ADMIN_CREDENTIALS = [
        { user: 'admin', pass: 'admin123', name: 'Ayaz Surti' },
        { user: 'ayazsurti', pass: 'Ayaz78692', name: 'Ayaz Surti' },
        { user: 'zuber', pass: 'Zuber@1993', name: 'Zuber Shaikh' }
      ];
      const target = ADMIN_CREDENTIALS.find(c => c.user.toLowerCase() === username.toLowerCase() && c.pass === password);
      if (target) {
        authenticatedUser = {
          id: 'ADMIN_01',
          name: target.name,
          email: `${target.user}@school.com`,
          role: 'ADMIN',
        };
      }
    } else if (role === 'TEACHER') {
      // Logic: Username is Staff ID (e.g., teacher) and Password is teacher123
      if (username.toLowerCase() === 'teacher' && password === 'teacher123') {
        authenticatedUser = {
          id: 'T_MOCK',
          name: 'Demo Teacher',
          email: 'teacher@school.com',
          role: 'TEACHER',
          staffId: 'TEA-101'
        };
      }
    } else if (role === 'STUDENT') {
      // Logic: Username is student and Password is student123
      if (username.toLowerCase() === 'student' && password === 'student123') {
        authenticatedUser = {
          id: 'S_MOCK',
          name: 'Demo Student',
          email: 'student@school.com',
          role: 'STUDENT',
          // Fix: Added class and section alongside rollNo to fulfill student user requirements
          rollNo: '101',
          class: '10th',
          section: 'A'
        };
      }
    }

    if (authenticatedUser) {
      createAuditLog(authenticatedUser, 'LOGIN', 'Auth', `${role} verified via secure login`);
      onLogin(authenticatedUser);
    } else {
      setError("Invalid Credentials: Use 'admin'/'admin123', 'teacher'/'teacher123', or 'student'/'student123'");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden transition-colors">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10 group">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white font-bold text-4xl mx-auto shadow-2xl mb-6 border-4 border-white dark:border-slate-800 transition-transform group-hover:scale-105 duration-500">
            {schoolLogo ? (
              <img src={schoolLogo} className="w-full h-full object-cover" alt="School Logo" />
            ) : (
              <School size={40} strokeWidth={2.5} />
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">{APP_NAME}</h1>
          <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mt-2">Institutional Portal Login</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-2 mb-8 p-1.5 bg-slate-100/80 dark:bg-slate-800 rounded-2xl">
            {(['ADMIN', 'TEACHER', 'STUDENT'] as UserRole[]).map((r) => (
              <button 
                key={r}
                type="button"
                onClick={() => { setRole(r); setUsername(''); setPassword(''); setError(null); }}
                className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${role === r ? 'bg-white dark:bg-slate-700 shadow-lg text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {r === 'ADMIN' ? <ShieldCheck size={12} className="inline mr-1"/> : r === 'TEACHER' ? <UserIcon size={12} className="inline mr-1"/> : <GraduationCap size={12} className="inline mr-1"/>}
                {r}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex items-start gap-3 animate-in fade-in">
              <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username / ID</label>
              <div className="relative group">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={`${role.toLowerCase()} username`}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 dark:text-white transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-14 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 dark:text-white transition-all shadow-inner"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 text-xs tracking-widest uppercase disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                <>Sign In to {role}<ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>
        <p className="text-center mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
          Powered by EDUCATION WORLD Registry Engine
        </p>
      </div>
    </div>
  );
};

export default Login;
