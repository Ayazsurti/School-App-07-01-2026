
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Notice, NoticeMedia } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { 
  Bell, 
  Plus, 
  Megaphone, 
  X, 
  FileText, 
  Search,
  Trash2,
  Edit2,
  Upload,
  Eye,
  Clock,
  ChevronRight,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  Database,
  Paperclip
} from 'lucide-react';

interface NoticeBoardProps { user: User; }

const NoticeBoard: React.FC<NoticeBoardProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const isAdmin = user.role === 'ADMIN';
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
  const [tempAttachment, setTempAttachment] = useState<NoticeMedia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTimestamp = () => {
    return new Date().toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true 
    }).toUpperCase();
  };

  const fetchCloudData = async () => {
    try {
      const data = await db.notices.getAll();
      const mappedNotices: Notice[] = data.map((n: any) => ({
        id: n.id, title: n.title, content: n.content, category: n.category,
        date: n.date, postedBy: n.posted_by, attachments: n.attachments || []
      }));
      setNotices(mappedNotices);
    } catch (err: any) {
      console.error("Cloud Sync Failed.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudData();
    const channel = supabase.channel('notices-sync-v25')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const [newNotice, setNewNotice] = useState<{
    title: string; content: string; category: string;
  }>({ title: '', content: '', category: 'GENERAL' });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTempAttachment({
          url: ev.target?.result as string,
          type: 'pdf',
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStudent) return;
    if (!newNotice.title || !newNotice.content) return;
    setIsUploading(true);
    try {
      const noticeToSync = {
        title: newNotice.title.toUpperCase(),
        content: newNotice.content,
        category: newNotice.category,
        date: formatTimestamp(),
        posted_by: user.name,
        attachments: tempAttachment ? [tempAttachment] : []
      };
      await db.notices.insert(noticeToSync);
      setShowForm(false);
      setNewNotice({ title: '', content: '', category: 'GENERAL' });
      setTempAttachment(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      createAuditLog(user, 'CREATE', 'Notices', `Broadcast Dispatched: ${newNotice.title}`);
    } catch (err: any) {
      alert("Failed to publish notice.");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDeleteNotice = async () => {
    if (!isAdmin || !deleteConfirmationId) return;
    try {
      await db.notices.delete(deleteConfirmationId);
      setDeleteConfirmationId(null);
      fetchCloudData();
    } catch (err) {
      alert("Deletion failed.");
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

  const canPost = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
      <div className="flex flex-wrap gap-4 no-print">
         <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 px-4 py-2 rounded-full shadow-sm">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Broadcast Access: Active</span>
         </div>
         <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 px-4 py-2 rounded-full shadow-sm">
            <Database size={14} className="text-indigo-500" />
            <span className="text-[8px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Cloud Sync: Secured</span>
         </div>
      </div>

      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-indigo-400">
              <RefreshCcw size={12} className="animate-spin" />
              <span className="text-[9px] font-black uppercase tracking-widest text-white">Refreshing...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={20} strokeWidth={3} />
              <p className="font-black text-[10px] uppercase tracking-widest">Broadcast Published</p>
           </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Notice Board</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional bulletins with real-time timestamps.</p>
        </div>
        {canPost && (
          <button onClick={() => setShowForm(true)} className="px-10 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl flex items-center gap-4 hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest">
            <Plus size={20} strokeWidth={3} /> Post Notice
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-6 no-print">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 text-sm uppercase tracking-[0.2em]">Filter Node</h3>
            <div className="space-y-2">
              {['All', ...categories].map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`w-full text-left px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{cat}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="relative group">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
            <input type="text" placeholder="Search archives..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-20 pr-10 py-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] outline-none font-bold text-slate-700 dark:text-white shadow-inner uppercase text-sm" />
          </div>

          <div className="grid grid-cols-1 gap-8">
            {isLoading ? (
              <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={64} className="animate-spin text-indigo-600" /></div>
            ) : filteredNotices.length > 0 ? (
              filteredNotices.map((notice) => (
                <div key={notice.id} className="bg-white dark:bg-slate-900 p-10 lg:p-14 rounded-[4rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all relative group overflow-hidden">
                  <div className={`absolute top-0 left-0 w-3 h-full ${notice.category === 'URGENT' ? 'bg-rose-500' : 'bg-indigo-600'} opacity-80 group-hover:w-5 transition-all duration-700`}></div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-3">
                       <span className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase ${notice.category === 'URGENT' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                         {notice.category}
                       </span>
                       {notice.attachments && notice.attachments.length > 0 && (
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-900/50">
                             <Paperclip size={12} /> Attachment
                          </div>
                       )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest"><Clock size={16} className="text-indigo-500" /> {notice.date}</div>
                  </div>

                  <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tighter leading-none">{notice.title}</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-12 text-lg whitespace-pre-wrap">{notice.content}</p>
                  
                  <div className="flex items-center justify-between pt-10 border-t border-slate-50 dark:border-slate-800">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                             <UserIcon size={14} />
                           </div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posted by: <span className="text-slate-700 dark:text-slate-300">{notice.postedBy}</span></p>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-3">
                        {notice.attachments && notice.attachments.length > 0 && (
                           <button 
                             onClick={() => {
                               const url = notice.attachments[0].url;
                               if (url.startsWith('data:application/pdf')) {
                                  const base64Data = url.split(',')[1];
                                  const byteCharacters = atob(base64Data);
                                  const byteNumbers = new Array(byteCharacters.length);
                                  for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                                  const byteArray = new Uint8Array(byteNumbers);
                                  const blob = new Blob([byteArray], { type: 'application/pdf' });
                                  const blobUrl = URL.createObjectURL(blob);
                                  window.open(blobUrl, '_blank');
                               } else {
                                  window.open(url, '_blank');
                               }
                             }}
                             className="px-6 py-3.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all"
                           >
                              <FileText size={16} /> View PDF
                           </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setDeleteConfirmationId(notice.id)} className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all">
                             <Trash2 size={20} />
                          </button>
                        )}
                     </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-[5rem] py-60 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                 <Megaphone size={64} className="text-slate-100 dark:text-slate-800 mb-6" />
                 <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Archive Node Empty</h3>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && canPost && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Post Broadcast</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Communication Node</p>
                 </div>
                 <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400"><X size={28} /></button>
              </div>
              
              <form onSubmit={handlePost} className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Announcement Title</label>
                    <input 
                      type="text" 
                      required 
                      value={newNotice.title} 
                      onChange={e => setNewNotice({...newNotice, title: e.target.value})} 
                      placeholder="e.g., WINTER VACATION SCHEDULE" 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" 
                    />
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Category</label>
                    <select value={newNotice.category} onChange={e => setNewNotice({...newNotice, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase outline-none shadow-inner cursor-pointer">
                       {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Content Detail</label>
                    <textarea 
                      rows={5} 
                      required 
                      value={newNotice.content} 
                      onChange={e => setNewNotice({...newNotice, content: e.target.value})} 
                      placeholder="Enter broadcast details..." 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-3xl px-8 py-6 font-medium outline-none resize-none shadow-inner" 
                    />
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Attach Guidance PDF (Optional)</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full h-24 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/10 ${tempAttachment ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                       {tempAttachment ? (
                         <div className="flex items-center gap-3">
                            <FileText className="text-indigo-600" size={24} />
                            <div className="text-left">
                               <p className="text-[10px] font-black text-indigo-900 truncate max-w-[200px]">{tempAttachment.name}</p>
                               <p className="text-[8px] font-bold text-indigo-400 uppercase">Document Linked</p>
                            </div>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setTempAttachment(null); }} className="p-1.5 bg-rose-100 text-rose-600 rounded-lg"><X size={12}/></button>
                         </div>
                       ) : (
                         <>
                            <Upload size={20} className="text-slate-300" />
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Click to browse Files</p>
                         </>
                       )}
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} />
                 </div>

                 <button type="submit" disabled={isUploading || !newNotice.title || !newNotice.content} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-indigo-700">
                    {isUploading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />} Publish to Cloud
                 </button>
              </form>
           </div>
        </div>
      )}

      {deleteConfirmationId && isAdmin && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-xs w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Purge Notice?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] leading-relaxed uppercase tracking-widest">This broadcast will be permanently erased from the archive.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteConfirmationId(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={confirmDeleteNotice} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Purge</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const UserIcon = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default NoticeBoard;
