import React, { useState, useMemo, useEffect } from 'react';
import { User, Student } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  MessageSquareQuote, Send, CheckCircle2, Loader2,
  ShieldCheck, CheckSquare, Square, Layers, RefreshCw, Search,
  Clock, History, Users, MessageSquare, ArrowRight, Info, Zap, AlertTriangle
} from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';

interface SMSPanelProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];
const SECTIONS = ['A', 'B', 'C', 'D'];

const SMSPanel: React.FC<SMSPanelProps> = ({ user }) => {
  const isTeacher = user.role === 'TEACHER';
  
  // Restricted classes for Teacher
  const authorizedClasses = useMemo(() => {
    if (user.role === 'ADMIN') return ALL_CLASSES;
    const teacherClasses = (user as any).classes || (user.class ? [user.class] : []);
    return ALL_CLASSES.filter(c => teacherClasses.includes(c));
  }, [user]);

  const [students, setStudents] = useState<Student[]>([]);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [targetSections, setTargetSections] = useState<string[]>(['A', 'B', 'C', 'D']);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const fetchStudentsAndLogs = async () => {
    try {
      const [studentData, historyData] = await Promise.all([
        db.students.getAll(),
        db.sms.getHistory()
      ]);

      const mappedStudents = studentData.map((s: any) => ({
        id: s.id, fullName: s.full_name, grNumber: s.gr_number,
        class: s.class, section: s.section, fatherMobile: s.father_mobile, 
        motherMobile: s.mother_mobile
      }));
      
      setStudents(mappedStudents as any);
      setSmsLogs(historyData);
      setSyncError(null);
    } catch (err: any) { 
      console.error("SMS Fetch Error:", err); 
      setSyncError(getErrorMessage(err));
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => {
    fetchStudentsAndLogs();
    
    const channel = supabase.channel('realtime-sms-v13')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchStudentsAndLogs().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sms_history' }, () => {
        setIsSyncing(true);
        fetchStudentsAndLogs().then(() => setTimeout(() => setIsSyncing(false), 800));
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

      // Simulate Gateway Dispatch
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const targetsDescription = targetClasses.length === ALL_CLASSES.length ? 'ALL CLASSES' : targetClasses.join(', ');
      
      // 1. ATTEMPT DEDICATED HISTORY SYNC
      try {
        await db.sms.insertHistory({
          message: message.toUpperCase(),
          targets: targetsDescription,
          recipient_count: uniqueMobiles.length,
          sent_by: user.name
        });
      } catch (e: any) {
        console.error("SMS History Write Failed:", e);
        // We still show alert if user needs to fix the schema
        alert(`Cloud Sync Issue: ${e.message || 'Table sms_history not found'}. Run SQL command in Supabase editor.`);
      }
      
      // 2. ALWAYS LOG TO AUDIT (BACKUP)
      await createAuditLog(user, 'CREATE', 'SMS', `Dispatched: ${uniqueMobiles.length} Recipients in ${targetClasses.length} Classes.`);
      
      setShowSuccess(true);
      setMessage('');
      setTargetClasses([]);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchStudentsAndLogs();
    } catch (err: any) { 
      alert(`Broadcast terminal error: ${getErrorMessage(err)}`); 
    } finally { 
      setIsSending(false); 
    }
  };

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Registry Sync...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Broadcast Dispatched</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Cloud Ledger Updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center gap-3 uppercase leading-none">Institutional SMS Terminal <MessageSquareQuote className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase text-xs tracking-[0.4em] leading-relaxed">Multicast transmission engine for parent-teacher communication.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 px-4 sm:px-0">
        <div className="lg:col-span-7">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div className="space-y-4">
                 <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Content / संदेश सामग्री</label>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">Unicode Active</span>
                 </div>
                 <textarea 
                    rows={10} 
                    value={message} 
                    onChange={e => setMessage(e.target.value.toUpperCase())} 
                    placeholder="TYPE BROADCAST MESSAGE HERE (ALL CAPS PREFERRED)..." 
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-[2.5rem] px-10 py-8 font-black text-indigo-600 dark:text-indigo-400 outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner resize-none uppercase text-lg leading-relaxed"
                 />
                 <div className="flex justify-between px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2"><MessageSquare size={12}/> {message.length} Characters</div>
                    <div className="flex items-center gap-2"><Layers size={12}/> {Math.ceil(message.length / 160)} SMS Credits</div>
                 </div>
              </div>

              <button 
                onClick={handleSendSMS}
                disabled={isSending || !message.trim() || targetClasses.length === 0}
                className="w-full py-8 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 hover:-translate-y-1 transition-all uppercase text-sm tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-50 active:scale-95"
              >
                {isSending ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />} 
                Commit & Execute Broadcast
              </button>
           </div>
        </div>

        <div className="lg:col-span-5 space-y-8">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div className="space-y-4">
                 <div className="flex justify-between items-center px-1">
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={14}/> Target Standards</h4>
                    <button type="button" onClick={() => setTargetClasses(targetClasses.length === authorizedClasses.length ? [] : [...authorizedClasses])} className="text-[9px] font-black text-slate-400 uppercase hover:text-indigo-600 transition-colors">Select All</button>
                 </div>
                 <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {authorizedClasses.map(cls => (
                       <button key={cls} type="button" onClick={() => toggleClass(cls)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400 hover:border-slate-200'}`}>
                          {targetClasses.includes(cls) ? <CheckSquare size={14} /> : <Square size={14} />}
                          <span className="text-[9px] font-black uppercase truncate">{cls}</span>
                       </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                 <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 px-1"><Layers size={14}/> Active Sections</h4>
                 <div className="flex gap-2">
                    {SECTIONS.map(sec => (
                       <button key={sec} type="button" onClick={() => toggleSection(sec)} className={`flex-1 py-3 rounded-xl border font-black text-[10px] transition-all ${targetSections.includes(sec) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-indigo-100'}`}>
                          SEC {sec}
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           <div className="p-10 bg-indigo-50 dark:bg-indigo-900/10 rounded-[3rem] border border-indigo-100 dark:border-indigo-800 flex items-start gap-5">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0 shadow-indigo-100"><ShieldCheck size={24}/></div>
              <div className="space-y-1">
                 <p className="text-xs font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Sync Policy</p>
                 <p className="text-[10px] font-medium text-indigo-700/60 dark:text-indigo-400/60 leading-relaxed uppercase tracking-wider">SMS broadcasts are dispatched via cloud gateway. Multi-factor logging enabled.</p>
              </div>
           </div>
        </div>
      </div>

      {/* CLOUD ARCHIVE SECTION */}
      <div className="bg-slate-950 rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl mx-4 sm:mx-0">
         <div className="absolute inset-0 neural-grid-white opacity-10 pointer-events-none"></div>
         
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
            <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-[1.8rem] flex items-center justify-center border border-indigo-500/30 shadow-inner">
                  <History size={32} />
               </div>
               <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter">Broadcast Archive</h3>
                  <div className="flex items-center gap-3 mt-1 text-slate-500">
                     <Zap size={14} className="text-amber-500" />
                     <p className="text-[10px] font-black uppercase tracking-widest">Vault Sync Active</p>
                  </div>
               </div>
            </div>
            
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl">
               <div className="text-right">
                  <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Entries</p>
                  <p className="text-sm font-black text-white uppercase">{smsLogs.length} Broadcasts</p>
               </div>
               <div className="w-px h-8 bg-white/10"></div>
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={20} />
               </div>
            </div>
         </div>

         {syncError && (
           <div className="relative z-10 mb-8 p-6 bg-rose-900/30 border border-rose-500/50 rounded-3xl flex items-start gap-4">
              <AlertTriangle className="text-rose-500 shrink-0" size={24} />
              <div>
                 <p className="font-black text-xs uppercase text-rose-200">Database Table Missing</p>
                 <p className="text-[10px] text-rose-300/70 uppercase mt-1">Please create 'sms_history' table in Supabase SQL editor to see history here.</p>
              </div>
           </div>
         )}

         <div className="relative z-10 space-y-4">
            {isLoading ? (
               <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 size={32} className="animate-spin mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Accessing Vault...</p>
               </div>
            ) : smsLogs.length > 0 ? (
               smsLogs.map((log) => (
                  <div key={log.id} className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-white/10 hover:border-indigo-500/30 transition-all group">
                     <div className="flex items-start gap-6 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/5 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                           <MessageSquareQuote size={24} />
                        </div>
                        <div className="min-w-0">
                           <div className="flex flex-wrap items-center gap-3 mb-2">
                              <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-400/20">
                                 <Layers size={10}/> {log.targets || 'MULTIPLE'}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-400/20">
                                 <Users size={10}/> {log.recipient_count || '0'} RECIPIENTS
                              </div>
                           </div>
                           <p className="text-slate-400 text-sm font-medium italic truncate max-w-2xl">"{log.message}"</p>
                        </div>
                     </div>
                     
                     <div className="flex flex-col items-end shrink-0 gap-1.5">
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                           <Clock size={12}/> {log.timestamp || new Date(log.created_at).toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                           <span className="text-[8px] font-black uppercase text-slate-300 tracking-widest">BY {log.sent_by}</span>
                        </div>
                     </div>
                  </div>
               ))
            ) : (
               <div className="py-32 text-center border-4 border-dashed border-white/5 rounded-[3rem] bg-white/5">
                  <MessageSquareQuote size={64} className="mx-auto text-white/5 mb-6" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Vault Archive Empty</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default SMSPanel;