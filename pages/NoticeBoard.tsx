
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Notice, NoticeMedia } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { 
  Bell, 
  Calendar, 
  Plus, 
  Megaphone, 
  X, 
  FileText, 
  Search,
  Tag,
  Trash2,
  Edit2,
  Upload,
  FileIcon,
  Eye,
  Clock,
  ChevronRight,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Download,
  CloudLightning,
  RefreshCcw,
  Check
} from 'lucide-react';

interface NoticeBoardProps { user: User; }

const NoticeBoard: React.FC<NoticeBoardProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedNoticeForView, setSelectedNoticeForView] = useState<Notice | null>(null);
  
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories] = useState<string[]>(['URGENT', 'GENERAL', 'ACADEMIC', 'EVENT']);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCloudData = async () => {
    setIsLoading(true);
    try {
      const data = await db.notices.getAll();
      const mappedNotices: Notice[] = data.map((n: any) => ({
        id: n.id, title: n.title, content: n.content, category: n.category,
        date: n.date, posted_by: n.posted_by, attachments: n.attachments
      }));
      setNotices(mappedNotices);
    } catch (err: any) {
      setErrorMsg("Cloud Sync Failed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('notices-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const [newNotice, setNewNotice] = useState<{
    title: string; content: string; category: string; attachments: NoticeMedia[];
  }>({ title: '', content: '', category: 'GENERAL', attachments: [] });

  const handlePost = async () => {
    if (isStudent) return;
    if (!newNotice.title || !newNotice.content) return;
    setIsUploading(true);
    try {
      const noticeToSync = {
        title: newNotice.title, content: newNotice.content, category: newNotice.category,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        postedBy: user.name, attachments: newNotice.attachments
      };
      await db.notices.insert(noticeToSync);
      setShowForm(false);
      setNewNotice({ title: '', content: '', category: 'GENERAL', attachments: [] });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      createAuditLog(user, 'CREATE', 'Notices', `Cloud Broadcast: ${newNotice.title}`);
    } catch (err: any) {
      setErrorMsg("Upload Failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDeleteNotice = async () => {
    if (isStudent || !deleteConfirmationId) return;
    try {
      await db.notices.delete(deleteConfirmationId);
      setDeleteConfirmationId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setErrorMsg("Deletion Failed.");
    }
  };

  const filteredNotices = useMemo(() => {
    return notices.filter(notice => {
      const content = (notice.title + ' ' + notice.content).toLowerCase();
      const matchesSearch = content.includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || notice.category === selectedCategory.toUpperCase();
      return matchesSearch && matchesCategory;
    });
  }, [notices, searchQuery, selectedCategory]);

  const canManage = !isStudent && (user.role === 'ADMIN' || user.role === 'TEACHER');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              {/* Fix: Use RefreshCcw which is imported instead of RefreshCw */}
              <RefreshCcw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Updating...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              <p className="font-black text-xs uppercase tracking-widest">Notice Published</p>
           </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Notice Board</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional Bulletins.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="px-10 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl flex items-center gap-4 hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest">
            <Plus size={20} strokeWidth={3} /> Post Notice
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {!isStudent && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 text-sm uppercase tracking-[0.2em]">Categories</h3>
              <div className="space-y-2">
                {['All', ...categories].map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`w-full text-left px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{cat}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={`${isStudent ? 'lg:col-span-4' : 'lg:col-span-3'} space-y-8`}>
          <div className="relative group">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
            <input type="text" placeholder="Search archive..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-20 pr-10 py-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] outline-none font-bold text-slate-700 dark:text-white shadow-inner uppercase text-sm" />
          </div>

          <div className="grid grid-cols-1 gap-8">
            {isLoading ? (
              <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
            ) : filteredNotices.length > 0 ? (
              filteredNotices.map((notice) => (
                <div key={notice.id} className="bg-white dark:bg-slate-900 p-10 lg:p-14 rounded-[4rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all relative group overflow-hidden">
                  <div className={`absolute top-0 left-0 w-3 h-full ${notice.category === 'URGENT' ? 'bg-rose-500' : 'bg-indigo-600'} opacity-80 group-hover:w-5 transition-all duration-700`}></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <span className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase ${notice.category === 'URGENT' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {notice.category}
                    </span>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest"><Calendar size={16} className="text-indigo-500" /> {notice.date}</div>
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tighter leading-none">{notice.title}</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-12 text-lg">{notice.content}</p>
                  <div className="flex items-center justify-between pt-10 border-t border-slate-50 dark:border-slate-800">
                     <button onClick={() => { setSelectedNoticeForView(notice); setShowViewModal(true); }} className="text-indigo-600 dark:text-indigo-400 font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-3">Open Details <ChevronRight size={16}/></button>
                     {canManage && (
                       <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(notice.id); }} className="p-4 bg-slate-50 dark:bg-slate-800 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={20}/></button>
                     )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-[5rem] py-60 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                 <Megaphone size={64} className="text-slate-100 dark:text-slate-800 mb-6" />
                 <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">No Active Broadcasts</h3>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && canManage && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black uppercase tracking-tight">Post New Broadcast</h3>
                 <button onClick={() => setShowForm(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400"><X size={28} /></button>
              </div>
              <form onSubmit={handlePost} className="space-y-6 flex-1 overflow-y-auto p-2">
                 <input type="text" required value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} placeholder="Announcement Title" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-5 font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500" />
                 <select value={newNotice.category} onChange={e => setNewNotice({...newNotice, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-5 font-black uppercase">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <textarea rows={6} required value={newNotice.content} onChange={e => setNewNotice({...newNotice, content: e.target.value})} placeholder="Main content..." className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-3xl px-8 py-8 font-medium outline-none resize-none" />
                 <button type="submit" disabled={isUploading} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                    {isUploading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />} Publish Official Notice
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;
