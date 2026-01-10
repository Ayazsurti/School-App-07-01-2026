
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Notice, NoticeMedia } from '../types';
import { createAuditLog } from '../utils/auditLogger';
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
  Lock,
  EyeOff,
  AlertCircle,
  Download,
  Send,
  // Added Check icon to fix line 507 error
  Check
} from 'lucide-react';

interface NoticeBoardProps { user: User; }

const NoticeBoard: React.FC<NoticeBoardProps> = ({ user }) => {
  const isStudent = user.role === 'STUDENT';
  const [showForm, setShowForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedNoticeForView, setSelectedNoticeForView] = useState<Notice | null>(null);
  const [viewableUrls, setViewableUrls] = useState<string[]>([]);
  
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories] = useState<string[]>(['URGENT', 'GENERAL', 'ACADEMIC', 'EVENT']);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Convert Base64 to safe Blob URL for Chrome to prevent "Blocked" error
  const base64ToBlobUrl = (base64Data: string) => {
    try {
      const parts = base64Data.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("PDF Blob Conversion Failed", e);
      return base64Data;
    }
  };

  // Sync effect to handle Chrome's blocking of Data URLs in iframes
  useEffect(() => {
    if (showViewModal && selectedNoticeForView?.attachments) {
      const urls = selectedNoticeForView.attachments.map(file => {
        if (file.url.startsWith('data:application/pdf')) {
          return base64ToBlobUrl(file.url);
        }
        return file.url;
      });
      setViewableUrls(urls);
      
      return () => {
        urls.forEach(url => {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        });
      };
    } else {
      setViewableUrls([]);
    }
  }, [showViewModal, selectedNoticeForView]);

  const [notices, setNotices] = useState<Notice[]>(() => {
    try {
      const saved = localStorage.getItem('school_notices_registry_v5');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      localStorage.removeItem('school_notices_registry_v5');
    }
    return [
      {
        id: '1',
        title: 'Institutional Safety Protocol 2026',
        content: 'Official security and safety guidelines for the current academic session.',
        category: 'URGENT',
        date: '25 May 2026',
        postedBy: 'Admin Terminal',
        attachments: []
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('school_notices_registry_v5', JSON.stringify(notices));
    } catch (e) {
      setErrorMsg("Storage Quota Full: Please delete old notices to save new ones.");
    }
  }, [notices]);

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
    if (file.size > 3 * 1024 * 1024) {
      alert("File Too Large: PDF must be under 3MB.");
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

  const handlePost = () => {
    if (isStudent) return;
    if (!newNotice.title || !newNotice.content) {
      alert("Please fill in both Title and Content.");
      return;
    }
    
    let updatedNotices: Notice[];
    if (editingNoticeId) {
      updatedNotices = notices.map(n => n.id === editingNoticeId ? {
        ...n,
        title: newNotice.title,
        content: newNotice.content,
        category: newNotice.category as any,
        attachments: newNotice.attachments
      } : n);
      triggerSuccess('Broadcast Updated Successfully');
    } else {
      const notice: Notice = {
        id: Math.random().toString(36).substr(2, 9),
        title: newNotice.title,
        content: newNotice.content,
        category: newNotice.category as any,
        attachments: newNotice.attachments,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        postedBy: user.name
      };
      updatedNotices = [notice, ...notices];
      triggerSuccess('Broadcast Published to Portal');
    }
    
    setNotices(updatedNotices);
    setShowForm(false);
    setEditingNoticeId(null);
    setNewNotice({ title: '', content: '', category: 'GENERAL', attachments: [] });
    createAuditLog(user, editingNoticeId ? 'UPDATE' : 'CREATE', 'Notices', `Published: ${newNotice.title}`);
  };

  const confirmDeleteNotice = () => {
    if (isStudent || !deleteConfirmationId) return;
    const updated = notices.filter(n => n.id !== deleteConfirmationId);
    setNotices(updated);
    setDeleteConfirmationId(null);
    triggerSuccess('Notice Deleted Successfully');
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

      {/* SUCCESS TOAST MESSAGE */}
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Registry Sync Complete</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">{successMsg}</p>
              </div>
           </div>
        </div>
      )}

      {/* PDF VIEWER TERMINAL */}
      {showViewModal && selectedNoticeForView && (
        <div className="fixed inset-0 z-[600] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 lg:p-10 animate-in zoom-in-95 duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-white/10">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${selectedNoticeForView.category === 'URGENT' ? 'bg-rose-500' : 'bg-indigo-600'}`}>
                       <Megaphone size={28} />
                    </div>
                    <div>
                       <h3 className="text-slate-900 dark:text-white font-black text-xl tracking-tight uppercase leading-none">Safe View Terminal</h3>
                       <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Institutional Data Access Portal</p>
                    </div>
                 </div>
                 <button onClick={() => setShowViewModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                    <X size={32} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 lg:p-12 custom-scrollbar">
                 <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                       <span className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border ${selectedNoticeForView.category === 'URGENT' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400'}`}>
                          {selectedNoticeForView.category}
                       </span>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Clock size={14} className="text-indigo-500" /> Date: {selectedNoticeForView.date}
                       </span>
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight uppercase mb-8">{selectedNoticeForView.title}</h2>
                    <p className="text-slate-600 dark:text-slate-300 text-xl font-medium leading-relaxed whitespace-pre-wrap mb-10">
                       {selectedNoticeForView.content}
                    </p>

                    {selectedNoticeForView.attachments && selectedNoticeForView.attachments.length > 0 && (
                      <div className="space-y-8 pt-10 border-t border-slate-100 dark:border-slate-800">
                         <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-[0.3em] flex items-center gap-3">
                               <FileText size={18} className="text-indigo-600" /> Attached Documents
                            </h4>
                         </div>
                         <div className="grid grid-cols-1 gap-12">
                            {selectedNoticeForView.attachments.map((file, idx) => (
                              <div key={idx} className="bg-slate-100 dark:bg-slate-950 rounded-[3rem] border-4 border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-inner h-[700px]">
                                 <div className="flex-1 relative bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                                    {viewableUrls[idx] ? (
                                      <iframe 
                                        src={`${viewableUrls[idx]}#toolbar=0`} 
                                        className="w-full h-full border-none" 
                                        title={file.name} 
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center gap-4 text-slate-300 animate-pulse">
                                         <Loader2 size={48} className="animate-spin" />
                                         <p className="font-black uppercase text-xs">Authenticating PDF stream...</p>
                                      </div>
                                    )}
                                 </div>
                                 <div className="p-8 flex items-center justify-between bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-4">
                                       <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                                          <FileIcon size={32} />
                                       </div>
                                       <div className="min-w-0">
                                          <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase truncate block max-w-sm">{file.name}</span>
                                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Institutional Resource</p>
                                       </div>
                                    </div>
                                    
                                    {!isStudent ? (
                                      <button 
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = viewableUrls[idx] || file.url;
                                          link.download = file.name;
                                          link.click();
                                        }} 
                                        className="flex items-center gap-2 px-10 py-4 bg-emerald-600 text-white font-black text-[11px] rounded-2xl uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all"
                                      >
                                         <Download size={18} /> Download Copy
                                      </button>
                                    ) : (
                                      <div className="px-8 py-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black text-[10px] rounded-2xl uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                                         Authenticated Secure View Only
                                      </div>
                                    )}
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}
                 </div>
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
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 uppercase tracking-tighter">Confirm Purge?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium text-xs leading-relaxed uppercase tracking-widest">This broadcast will be erased permanently from the student registry.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setDeleteConfirmationId(null)} className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-3xl uppercase text-[10px] tracking-widest hover:bg-slate-200">Cancel</button>
                 <button onClick={confirmDeleteNotice} className="py-5 bg-rose-600 text-white font-black rounded-3xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Delete Now</button>
              </div>
           </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-tight">Academic Notice Board</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
            {isStudent ? 'Official academic bulletins and safe-view material.' : 'Broadcast announcements and secure PDF documents to students.'}
          </p>
        </div>
        {canManage && (
          <button onClick={() => { setShowForm(true); setEditingNoticeId(null); setNewNotice({ title: '', content: '', category: 'GENERAL', attachments: [] }); }} className="px-10 py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl flex items-center gap-4 hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest">
            <Plus size={20} strokeWidth={3} /> Post Announcement
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 ${isStudent ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} gap-10`}>
        {!isStudent && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3 text-sm uppercase tracking-[0.2em]">
                <Tag size={18} className="text-indigo-500" /> Filter Categories
              </h3>
              <div className="space-y-2">
                {['All', ...categories].map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`w-full text-left px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{cat === 'All' ? 'All Records' : cat}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className={`${isStudent ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-8`}>
          <div className="relative group">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
            <input type="text" placeholder="Search archive by title or keywords..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-20 pr-10 py-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner font-bold text-slate-700 dark:text-white text-lg placeholder:text-slate-300" />
          </div>

          <div className="grid grid-cols-1 gap-8">
            {filteredNotices.length > 0 ? (
              filteredNotices.map((notice) => (
                <div key={notice.id} onClick={() => { setSelectedNoticeForView(notice); setShowViewModal(true); }} className="bg-white dark:bg-slate-900 p-10 lg:p-14 rounded-[4rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all cursor-pointer relative group overflow-hidden hover:-translate-y-1">
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
                    {notice.attachments && notice.attachments.length > 0 && (
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-inner">
                         <FileText size={14} /> PDF Material
                      </div>
                    )}
                  </div>

                  <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white mb-6 group-hover:text-indigo-600 transition-colors uppercase tracking-tighter leading-none">{notice.title}</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-12 line-clamp-3 text-lg">{notice.content}</p>

                  <div className="flex items-center justify-between pt-10 border-t border-slate-50 dark:border-slate-800">
                     <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-black text-[11px] uppercase tracking-[0.3em] group-hover:translate-x-4 transition-all">
                        <Eye size={20} /> Open Details <ChevronRight size={20} />
                     </div>
                     
                     {!isStudent && canManage && (
                       <div className="flex items-center gap-3">
                          <button onClick={(e) => { e.stopPropagation(); setEditingNoticeId(notice.id); setNewNotice({ title: notice.title, content: notice.content, category: notice.category, attachments: notice.attachments || [] }); setShowForm(true); }} className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all"><Edit2 size={20}/></button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmationId(notice.id); }} className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all"><Trash2 size={20}/></button>
                       </div>
                     )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-[5rem] py-60 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center">
                 <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 text-slate-200 dark:text-slate-700 rounded-[3rem] flex items-center justify-center mb-10 shadow-inner"><EyeOff size={64} /></div>
                 <h3 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Archive Empty</h3>
                 <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Adjust your filters or post a new announcement.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FORM MODAL - POST NOTICE */}
      {canManage && showForm && (
        <div className="fixed inset-0 z-[700] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-1 shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800">
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <div>
                   <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingNoticeId ? 'Edit Broadcast' : 'Post New Broadcast'}</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Official Institutional Registry</p>
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
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Main Content / Instructions</label>
                    <textarea rows={6} required value={newNotice.content} onChange={e => setNewNotice({...newNotice, content: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] px-8 py-8 font-medium text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none shadow-inner" placeholder="Enter the detailed information for students and parents..." />
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 ml-1">PDF Document Vault (Max 3MB)</label>
                    </div>
                    <button 
                      type="button" 
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-12 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 font-black rounded-[2.5rem] border-4 border-dashed border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-4 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all group shadow-sm"
                    >
                       {isUploading ? <Loader2 className="animate-spin" size={40} /> : <Upload size={40} className="group-hover:-translate-y-2 transition-transform" />}
                       <span className="text-[10px] uppercase tracking-[0.3em]">{isUploading ? 'Encoding Stream...' : 'Upload Official PDF'}</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />

                    <div className="grid grid-cols-1 gap-4">
                       {newNotice.attachments.map((file, idx) => (
                         <div key={idx} className="p-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-3xl flex items-center justify-between shadow-sm animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-5 min-w-0">
                               <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                                  <FileIcon size={24} />
                               </div>
                               <div className="min-w-0">
                                  <span className="text-sm font-black text-slate-700 dark:text-slate-300 truncate block max-w-md uppercase">{file.name}</span>
                                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2"><Check size={12}/> Document Ready</span>
                               </div>
                            </div>
                            <button onClick={() => setNewNotice(prev => ({...prev, attachments: prev.attachments.filter((_, i) => i !== idx)}))} className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-xl shadow-lg hover:bg-rose-50 transition-all border border-rose-100"><Trash2 size={20} /></button>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="p-12 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                 <button 
                  onClick={handlePost} 
                  disabled={isUploading}
                  className="w-full py-7 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-sm tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-50"
                 >
                    {isUploading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} strokeWidth={2.5} />}
                    Finalize Official Broadcast
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;
