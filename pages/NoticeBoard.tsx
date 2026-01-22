
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Notice } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { 
  Bell, Plus, Megaphone, X, Search, Trash2, Clock, ChevronRight, ShieldCheck, 
  Loader2, AlertTriangle, CheckCircle2, RefreshCcw, CheckSquare, Square, Layers
} from 'lucide-react';

interface NoticeBoardProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];
const SECTIONS = ['A', 'B', 'C', 'D'];
const CATEGORIES = ['General', 'Academic', 'Fees', 'Exam', 'Event', 'Holiday'];

const NoticeBoard: React.FC<NoticeBoardProps> = ({ user }) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Multi-Targeting State
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [targetSections, setTargetSections] = useState<string[]>(['A', 'B', 'C', 'D']);

  const [formData, setFormData] = useState<Partial<Notice>>({
    title: '', content: '', category: 'General', attachments: []
  });

  const fetchNotices = async () => {
    try {
      const data = await db.notices.getAll();
      setNotices(data as any);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchNotices();
    const channel = supabase.channel('realtime-notices-v12')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        setIsSyncing(true);
        fetchNotices().then(() => setTimeout(() => setIsSyncing(false), 800));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleClass = (cls: string) => {
    setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
  };

  const toggleSection = (sec: string) => {
    setTargetSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content || targetClasses.length === 0) {
      if(targetClasses.length === 0) alert("Please select target classes.");
      return;
    }

    setIsSyncing(true);
    try {
      const targetStr = `[TARGETS: ${targetClasses.join(', ')} | SEC: ${targetSections.join(', ')}]`;
      const noticeData = {
        title: formData.title,
        content: `${targetStr} ${formData.content}`,
        category: formData.category,
        date: new Date().toLocaleDateString('en-GB'),
        postedBy: user.name,
        attachments: formData.attachments || []
      };

      await db.notices.insert(noticeData);
      await createAuditLog(user, 'CREATE', 'Notices', `Notice Broadcast: ${formData.title} to ${targetClasses.length} targets`);
      
      setShowModal(false);
      setShowSuccess(true);
      setFormData({ title: '', content: '', category: 'General', attachments: [] });
      setTargetClasses([]);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchNotices();
    } catch (err) { alert("Failed to sync notice."); }
    finally { setIsSyncing(false); }
  };

  const filteredNotices = useMemo(() => {
    return notices.filter(n => {
      const matchesSearch = (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (n.content || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (user.role === 'STUDENT') {
        const content = n.content || '';
        return matchesSearch && content.includes(user.class || '') && content.includes(`SEC: ${user.section || ''}`);
      }
      return matchesSearch;
    });
  }, [notices, searchQuery, user]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Notice Board <Bell className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional multi-target broadcasting console.</p>
        </div>
        {user.role !== 'STUDENT' && (
          <button onClick={() => { setTargetClasses([]); setShowModal(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:-translate-y-1 transition-all uppercase text-xs tracking-widest flex items-center gap-3">
            <Plus size={20} strokeWidth={3} /> Post Announcement
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 mx-4 sm:mx-0">
          <Search className="text-slate-300" size={20} />
          <input type="text" placeholder="Search archives..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none font-bold outline-none dark:text-white uppercase text-xs tracking-widest" />
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={48} className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 sm:px-0">
          {filteredNotices.map((notice) => {
            const hasTargetInfo = notice.content.startsWith('[TARGETS:');
            const targetInfo = hasTargetInfo ? notice.content.split(']')[0].replace('[', '') : 'Global';
            const displayContent = hasTargetInfo ? notice.content.split(']').slice(1).join(']').trim() : notice.content;

            return (
              <div key={notice.id} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                       <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">{notice.category}</span>
                       <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Clock size={12}/> {notice.date}</span>
                    </div>
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase">{notice.title}</h3>
                 <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Layers size={10}/> Audience: {targetInfo}</p>
                 <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8 flex-1 italic">"{displayContent}"</p>
                 <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400"><Megaphone size={14}/></div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">By {notice.postedBy}</span>
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Post Announcement</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-Target Protocol</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={28} /></button>
              </div>
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar flex flex-col md:flex-row gap-10">
                 <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notice Heading</label>
                       <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value.toUpperCase()})} placeholder="E.G. SCHOOL HOLIDAY NOTICE" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                       <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase outline-none shadow-inner">
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content Details</label>
                       <textarea rows={6} required value={formData.content} onChange={e => setFormData({...formData, content: e.target.value.toUpperCase()})} placeholder="DETAILED BROADCAST DETAILS..." className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-[2rem] px-8 py-6 font-medium outline-none resize-none shadow-inner" />
                    </div>
                 </div>

                 <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 space-y-8 border border-slate-100 dark:border-slate-800 shadow-inner">
                    <div className="space-y-4">
                       <div className="flex justify-between items-center px-1">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={14}/> Standards</h4>
                          <button type="button" onClick={() => setTargetClasses(targetClasses.length === ALL_CLASSES.length ? [] : [...ALL_CLASSES])} className="text-[8px] font-black text-slate-400 uppercase hover:text-indigo-600">Select All</button>
                       </div>
                       <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                          {ALL_CLASSES.map(cls => (
                             <button key={cls} type="button" onClick={() => toggleClass(cls)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-100'}`}>
                                {targetClasses.includes(cls) ? <CheckSquare size={14} /> : <Square size={14} />}
                                <span className="text-[9px] font-black uppercase truncate">{cls}</span>
                             </button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 px-1"><Layers size={14}/> Sections</h4>
                       <div className="grid grid-cols-2 gap-2">
                          {SECTIONS.map(sec => (
                             <button key={sec} type="button" onClick={() => toggleSection(sec)} className={`py-3 rounded-xl border font-black text-[10px] transition-all ${targetSections.includes(sec) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-100'}`}>
                                SEC {sec}
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </form>
              <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                 <button onClick={handleSave} disabled={isSyncing || targetClasses.length === 0} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-sm tracking-[0.3em] flex items-center justify-center gap-4">
                    {isSyncing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={24} />} Sync & Broadcast
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;
