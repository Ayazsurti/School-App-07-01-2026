
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
  const [viewableUrls, setViewableUrls] = useState<string[]>([]);
  
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories] = useState<string[]>(['URGENT', 'GENERAL', 'ACADEMIC', 'EVENT']);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data from Supabase Cloud
  const fetchCloudData = async () => {
    setIsLoading(true);
    try {
      const data = await db.notices.getAll();
      const mappedNotices: Notice[] = data.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        category: n.category,
        date: n.date,
        postedBy: n.posted_by,
        attachments: n.attachments
      }));
      setNotices(mappedNotices);
    } catch (err: any) {
      console.error("Sync Error:", err);
      setErrorMsg("Cloud Sync Failed: Check Internet Connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        setIsSyncing(true);
        fetchCloudData().then(() => {
           setTimeout(() => setIsSyncing(false), 1000);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert("Invalid Format: Only PDF documents are supported.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("File Too Large: Keep PDF under 2MB for Cloud Sync.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const attachment: NoticeMedia = {
        url: ev.target?.result as string,
        type: 'pdf',
        name: file.name
      };
      setNewNotice(prev => ({
        ...prev,
        attachments: [...prev.attachments, attachment]
      }));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const [newNotice, setNewNotice] = useState<{
    title: string;
    content: string;
    category: string;
    attachments: NoticeMedia[];
  }>({ title: '', content: '', category: 'GENERAL', attachments: [] });

  const handlePost = async () => {
    if (isStudent) return;
    if (!newNotice.title || !newNotice.content) {
      alert("Title and Content are required.");
      return;
    }
    
    setIsUploading(true);
    try {
      const noticeToSync = {
        title: newNotice.title,
        content: newNotice.content,
        category: newNotice.category,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        postedBy: user.name,
        attachments: newNotice.attachments
      };

      await db.notices.insert(noticeToSync);
      triggerSuccess('Broadcast Published to Cloud');
      setShowForm(false);
      setNewNotice({ title: '', content: '', category: 'GENERAL', attachments: [] });
      createAuditLog(user, 'CREATE', 'Notices', `Cloud Broadcast: ${newNotice.title}`);
    } catch (err: any) {
      setErrorMsg("Failed to upload to cloud: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDeleteNotice = async () => {
    if (isStudent || !deleteConfirmationId) return;
    try {
      await db.notices.delete(deleteConfirmationId);
      setDeleteConfirmationId(null);
      triggerSuccess('Record Erased from Cloud');
    } catch (err) {
      setErrorMsg("Cloud Deletion Failed.");
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
      {/* CLOUD SYNC INDICATOR */}
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-in slide-in-from-top-4">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCcw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Refreshing Cloud Data...</span>
           </div>
        </div>
      )}

      {/* ERROR TOAST */}
      {errorMsg && (
        <div className="fixed bottom-8 left-8 right-8 z-[1100] animate-in slide-in-from-bottom-4">
           <div className="bg-rose-600 text-white p-6 rounded-3xl shadow-2xl flex items-center justify-between border border-rose-500">
              <div className="flex items-center gap-4">
                 <AlertCircle size={24} />
                 <p className="font-bold text-sm">{errorMsg}</p>
              </div>
              <button onClick={() => setErrorMsg(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
           </div>
        </div>
      )}

      {/* SUCCESS TOAST */}
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Global Sync Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">{successMsg}</p>
              </div>
           </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CloudLightning className="text-indigo-600 animate-pulse" size={20} />
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Cloud Synchronized Registry</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Notice Board</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
            {isStudent ? 'Official real-time bulletins.' : 'Broadcast information to all devices worldwide.'}
          </p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="px-10 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl flex items-center gap-4 hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest">
            <Plus size={20} strokeWidth={3} /> Post Cloud Broadcast
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center text-slate-400 animate-pulse">
          <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
          <p className="font-black text-xs uppercase tracking-[0.3em]">Connecting to Education Cloud...</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${isStudent ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} gap-10`}>
          {!isStudent && (
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 text-sm uppercase tracking-[0.2em]">
                  <Tag size={18} className="text-indigo-500" /> Categories
                </h3>
                <div className="space-y-2">
                  {['All', ...categories].map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`w-full text-left px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{cat}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={`${isStudent ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-8`}>
            <div className="relative group">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
              <input type="text" placeholder="Search cloud archive..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-20 pr-10 py-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner font-bold text-slate-700 dark:text-white text-lg placeholder:text-slate-300" />
            </div>

            <div className="grid grid-cols-1 gap-8">
              {filteredNotices.length > 0 ? (
                filteredNotices.map((notice) => (
                  <div key={notice.id} onClick={() => { setSelectedNoticeForView(notice); setShowViewModal(true); }} className="bg-white dark:bg-slate-900 p-10 lg:p-14 rounded-[4rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all cursor-pointer relative group overflow-hidden">
                    <div className={`absolute top-0 left-0 w-3 h-full ${notice.category === 'URGENT' ? 'bg-rose-500' : 'bg-indigo-600'} opacity-80 group-hover:w-5 transition-all duration-700`}></div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                      <div className="flex items-center gap-5">
                        <span className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase ${notice.category === 'URGENT' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'}`}>
                          {notice.category}
                        </span>
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                          <Calendar size={16} className="text-indigo-500" /> {notice.date}
                        </div>
                      </div>
                    </div>

                    <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white mb-6 group-hover:text-indigo-600 transition-colors uppercase tracking-tighter leading-none">{notice.title}</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-12 line-clamp-3 text-lg">{notice.content}</p>

                    <div className="flex items-center justify-between pt-10 border-t border-slate-50 dark:border-slate-800">
                       <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-black text-[11px] uppercase tracking-[0.3em] group-hover:translate-x-4 transition-all">
                          <Eye size={20} /> Open Details <ChevronRight size={20} />
                       </div>
                       {!isStudent && (
                         <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(notice.id); }} className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all"><Trash2 size={20}/></button>
                       )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-[5rem] py-60 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center">
                   <Megaphone size={64} className="text-slate-100 dark:text-slate-800 mb-6" />
                   <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">No Active Broadcasts</h3>
                   <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Cloud registry is currently empty.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 max-sm w-full shadow-2xl text-center border border-rose-100 dark:border-rose-900/50 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={48} strokeWidth={2.5} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Purge from Cloud?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium text-xs leading-relaxed uppercase tracking-widest">This broadcast will be erased permanently from all devices worldwide.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeleteConfirmationId(null)} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-3xl uppercase text-[10px] tracking-widest">Cancel</button>
                 <button onClick={confirmDeleteNotice} className="py-5 bg-rose-600 text-white font-black rounded-3xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Delete Now</button>
              </div>
           </div>
        </div>
      )}

      {/* FORM MODAL */}
      {canManage && showForm && (
        <div className="fixed inset-0 z-[700] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-1 shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <div>
                   <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Post Cloud Broadcast</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Official Institutional Data Sync</p>
                 </div>
                 <button onClick={() => setShowForm(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={32} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-12 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Announcement Title</label>
                       <input type="text" required value={newNotice.title} onChange={e => setNewNotice({...newNotice, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 font-bold text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner" placeholder="e.g., Annual Exam Schedule" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Select Category</label>
                       <select value={newNotice.category} onChange={e => setNewNotice({...newNotice, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 font-bold text-slate-800 dark:text-white outline-none shadow-inner">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Main Content</label>
                    <textarea rows={6} required value={newNotice.content} onChange={e => setNewNotice({...newNotice, content: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] px-8 py-8 font-medium text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none shadow-inner" placeholder="Enter the detailed information..." />
                 </div>

                 <div className="space-y-6">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1">PDF Document (Max 2MB)</label>
                    <button type="button" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="w-full py-10 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 font-black rounded-[2.5rem] border-4 border-dashed border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-4 hover:bg-indigo-100 transition-all">
                       {isUploading ? <Loader2 className="animate-spin" size={40} /> : <Upload size={40} />}
                       <span className="text-[10px] uppercase tracking-[0.3em]">{newNotice.attachments.length > 0 ? 'PDF Attached' : 'Choose Device PDF'}</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
                 </div>
              </div>

              <div className="p-12 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                 <button onClick={handlePost} disabled={isUploading} className="w-full py-7 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all uppercase text-sm tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-50">
                    {isUploading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                    Finalize Official Cloud Broadcast
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;
