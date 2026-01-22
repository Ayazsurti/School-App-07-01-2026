
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  MessageSquareQuote, Send, CheckCircle2, Loader2,
  ShieldCheck, CheckSquare, Square, Layers, RefreshCcw, Search
} from 'lucide-react';
import { db, supabase } from '../supabase';

interface SMSPanelProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];
const SECTIONS = ['A', 'B', 'C', 'D'];

const SMSPanel: React.FC<SMSPanelProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [targetSections, setTargetSections] = useState<string[]>(['A', 'B', 'C', 'D']);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await db.students.getAll();
      const mapped = data.map((s: any) => ({
        id: s.id, fullName: s.full_name, grNumber: s.gr_number,
        class: s.class, section: s.section, fatherMobile: s.father_mobile, 
        motherMobile: s.mother_mobile
      }));
      setStudents(mapped as any);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchStudents();
    const channel = supabase.channel('realtime-sms-sync-v10')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchStudents().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleClass = (cls: string) => {
    setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
  };

  const toggleSection = (sec: string) => {
    setTargetSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || targetClasses.length === 0) {
      alert("Please enter message and select target classes.");
      return;
    }

    setIsSending(true);
    try {
      const filteredRecipients = students.filter(s => 
        targetClasses.includes(s.class) && targetSections.includes(s.section)
      );

      const mobiles = filteredRecipients
        .map(s => s.fatherMobile || s.motherMobile)
        .filter(m => m && m.length === 10);

      const uniqueMobiles = Array.from(new Set(mobiles));
      
      if (uniqueMobiles.length === 0) {
        alert("No valid mobile numbers found for selection.");
        setIsSending(false);
        return;
      }

      // Simulate API call for SMS Gateway
      await new Promise(resolve => setTimeout(resolve, 2000));
      await createAuditLog(user, 'CREATE', 'SMS', `Broadcast sent to ${uniqueMobiles.length} recipients across ${targetClasses.length} classes.`);
      
      setShowSuccess(true);
      setMessage('');
      setTargetClasses([]);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Sync failed."); }
    finally { setIsSending(false); }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCcw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Identity Sync...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Broadcast Sent</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Dispatched to Cloud Terminal</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase leading-none">SMS Panel <MessageSquareQuote className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-2 uppercase tracking-tight">Institutional multi-target broadcasting console.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 px-4 sm:px-0">
        <div className="lg:col-span-7">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Content / संदेश</label>
                 <textarea 
                    rows={10} 
                    value={message} 
                    onChange={e => setMessage(e.target.value.toUpperCase())} 
                    placeholder="TYPE BROADCAST MESSAGE HERE..." 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-[2rem] px-8 py-6 font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner resize-none uppercase"
                 />
                 <div className="flex justify-between px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>{message.length} Characters</span>
                    <span>{Math.ceil(message.length / 160)} SMS Parts</span>
                 </div>
              </div>

              <button 
                onClick={handleSendSMS}
                disabled={isSending || !message.trim() || targetClasses.length === 0}
                className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-sm tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {isSending ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />} 
                Commit & Dispatch Broadcast
              </button>
           </div>
        </div>

        <div className="lg:col-span-5 space-y-8">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div className="space-y-4">
                 <div className="flex justify-between items-center px-1">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={14}/> Standards</h4>
                    <button type="button" onClick={() => setTargetClasses(targetClasses.length === ALL_CLASSES.length ? [] : [...ALL_CLASSES])} className="text-[9px] font-black text-slate-400 uppercase hover:text-indigo-600">Toggle All</button>
                 </div>
                 <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {ALL_CLASSES.map(cls => (
                       <button key={cls} type="button" onClick={() => toggleClass(cls)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-100'}`}>
                          {targetClasses.includes(cls) ? <CheckSquare size={14} /> : <Square size={14} />}
                          <span className="text-[9px] font-black uppercase truncate">{cls}</span>
                       </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                 <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 px-1"><Layers size={14}/> Sections</h4>
                 <div className="flex gap-2">
                    {SECTIONS.map(sec => (
                       <button key={sec} type="button" onClick={() => toggleSection(sec)} className={`flex-1 py-3 rounded-xl border font-black text-[10px] transition-all ${targetSections.includes(sec) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-transparent text-slate-400 hover:border-indigo-100'}`}>
                          SEC {sec}
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           <div className="p-8 bg-indigo-50 dark:bg-indigo-900/10 rounded-[3rem] border border-indigo-100 dark:border-indigo-800 flex items-start gap-4">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0 shadow-indigo-100"><ShieldCheck size={24}/></div>
              <div className="space-y-1">
                 <p className="text-xs font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Broadcast Policy</p>
                 <p className="text-[10px] font-medium text-indigo-700/60 dark:text-indigo-400/60 leading-relaxed uppercase tracking-wider">SMS is dispatched to primary mobile terminals stored in the institutional student registry. All broadcasts are logged in the audit trail.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SMSPanel;
