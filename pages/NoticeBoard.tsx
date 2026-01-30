
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Notice, NoticeMedia } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Bell, Plus, Megaphone, X, Search, Trash2, Clock, ChevronRight, ShieldCheck, 
  Loader2, AlertTriangle, CheckCircle2, RefreshCw, CheckSquare, Square, Layers,
  Upload, FileText, Eye, PlusCircle, Settings2, Database, Trash, Lock
} from 'lucide-react';
import { db, supabase, getErrorMessage } from '../supabase';

interface NoticeBoardProps { user: User; }

const NoticeBoard: React.FC<NoticeBoardProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingPdf, setViewingPdf] = useState<NoticeMedia | null>(null);

  const fetchNotices = async () => {
    try {
      const data = await db.notices.getAll();
      setNotices(data as any[]);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchNotices(); }, []);

  const filteredNotices = useMemo(() => {
    return notices.filter(n => {
      const matchesSearch = (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (n.content || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (isStudent) {
        const content = n.content || '';
        const matchesClass = content.includes(user.class || '');
        const matchesSection = content.includes(`SEC: ${user.section || ''}`) || content.includes(`SECTION ${user.section || ''}`);
        return matchesSearch && (matchesClass || n.category === 'GENERAL');
      }
      return matchesSearch;
    });
  }, [notices, searchQuery, isStudent, user]);

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Institutional Bulletin <Bell className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Official institutional broadcasts and identity hub.</p>
        </div>
        {isStudent && (
          <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-2xl shadow-sm">
             <ShieldCheck size={18} className="text-emerald-600" />
             <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">Authenticated Stream Active</span>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 mx-4 sm:mx-0">
          <Search className="text-slate-300 ml-2" size={20} />
          <input type="text" placeholder="Search archived notices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent border-none font-bold outline-none dark:text-white uppercase text-xs tracking-widest" />
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={48} className="animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 sm:px-0">
          {filteredNotices.map((notice) => {
            const hasTargetInfo = notice.content?.startsWith('[TARGETS:');
            const displayContent = hasTargetInfo ? notice.content?.split(']').slice(1).join(']').trim() : notice.content;
            const hasAttachment = notice.attachments && notice.attachments.length > 0;

            return (
              <div key={notice.id} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                       <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">{notice.category}</span>
                       <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Clock size={12}/> {notice.date}</span>
                    </div>
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase">{notice.title}</h3>
                 <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8 flex-1 italic">"{displayContent}"</p>
                 
                 <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400"><Megaphone size={14}/></div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Official Broadcast</span>
                    </div>
                    {hasAttachment && (
                       <button onClick={() => setViewingPdf(notice.attachments[0])} className="px-6 py-3 bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"><Eye size={14}/> View PDF</button>
                    )}
                 </div>
              </div>
            );
          })}
          {filteredNotices.length === 0 && (
            <div className="col-span-full py-40 text-center opacity-30">
               <Megaphone size={64} className="mx-auto mb-4" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional archive empty</p>
            </div>
          )}
        </div>
      )}

      {viewingPdf && (
        <div className="fixed inset-0 z-[1400] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FileText size={20}/></div>
                    <div>
                       <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white truncate">{viewingPdf.name}</h3>
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">OFFICIAL BROADCAST DOCUMENT</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingPdf(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-hidden bg-white">
                 <iframe src={viewingPdf.url} className="w-full h-full border-none" title="Notice Viewer" />
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 flex justify-center border-t border-slate-100">
                 <div className="flex items-center gap-2 text-slate-400">
                    <Lock size={12}/>
                    <span className="text-[9px] font-black uppercase tracking-widest">Authenticated View Only</span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;
