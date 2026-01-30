import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Notice, NoticeMedia } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db, getErrorMessage } from '../supabase';
import { 
  Bell, Plus, Megaphone, X, Search, Trash2, Clock, ChevronRight, ShieldCheck, 
  Loader2, AlertTriangle, CheckCircle2, RefreshCcw, CheckSquare, Square, Layers,
  Upload, FileText, Eye, PlusCircle, Settings2, Database, Trash
} from 'lucide-react';

interface NoticeBoardProps { user: User; }

const ALL_CLASSES = [
  '1 - GIRLS', '2 - GIRLS', '3 - GIRLS', '4 - GIRLS', '5 - GIRLS', '6 - GIRLS', '7 - GIRLS', '8 - GIRLS', '9 - GIRLS', '10 - GIRLS', '11 - GIRLS', '12 - GIRLS',
  '1 - BOYS', '2 - BOYS', '3 - BOYS', '4 - BOYS', '5 - BOYS', '6 - BOYS', '7 - BOYS', '8 - BOYS', '9 - BOYS', '10 - BOYS', '11 - BOYS', '12 - BOYS'
];
const SECTIONS = ['A', 'B', 'C', 'D'];
const DEFAULT_CATEGORIES = ['General', 'Academic', 'Fees', 'Exam', 'Event', 'Holiday'];

const NoticeBoard: React.FC<NoticeBoardProps> = ({ user }) => {
  const isTeacher = user.role === 'TEACHER';
  
  // Restricted classes for Teacher
  const authorizedClasses = useMemo(() => {
    if (user.role === 'ADMIN') return ALL_CLASSES;
    const teacherClasses = (user as any).classes || (user.class ? [user.class] : []);
    return ALL_CLASSES.filter(c => teacherClasses.includes(c));
  }, [user]);

  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Custom Category State
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Multi-Targeting State
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [targetSections, setTargetSections] = useState<string[]>(['A', 'B', 'C', 'D']);

  // PDF Attachment State
  const [tempPdf, setTempPdf] = useState<NoticeMedia | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingPdf, setViewingPdf] = useState<NoticeMedia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<Notice>>({
    title: '', content: '', category: 'General', attachments: []
  });

  const fetchNoticesAndConfig = async () => {
    try {
      const [noticeData, settings] = await Promise.all([
        db.notices.getAll(),
        db.settings.getAll()
      ]);
      
      // Normalize database keys for the UI
      const mappedNotices = (noticeData as any[]).map(n => ({
        ...n,
        postedBy: n.posted_by || n.postedBy || 'Admin'
      }));
      setNotices(mappedNotices);
      
      // Load custom categories from cloud if they exist
      if (settings.notice_categories) {
        try {
          const cloudCats = JSON.parse(settings.notice_categories);
          setCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...cloudCats])));
        } catch (e) {
          setCategories(DEFAULT_CATEGORIES);
        }
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchNoticesAndConfig();
    const channel = supabase.channel('realtime-notices-v14')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => {
        setIsSyncing(true);
        fetchNoticesAndConfig().then(() => setTimeout(() => setIsSyncing(false), 800));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const cat = newCatName.trim().charAt(0).toUpperCase() + newCatName.trim().slice(1);
    if (categories.includes(cat)) {
      setNewCatName('');
      setShowCategoryModal(false);
      return;
    }

    const updated = [...categories, cat];
    setCategories(updated);
    try {
      await db.settings.update('notice_categories', JSON.stringify(updated.filter(c => !DEFAULT_CATEGORIES.includes(c))));
      createAuditLog(user, 'UPDATE', 'Notices', `Added custom notice category: ${cat}`);
    } catch (e) {}
    setNewCatName('');
    setShowCategoryModal(false);
  };

  const toggleClass = (cls: string) => {
    setTargetClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
  };

  const toggleSection = (sec: string) => {
    setTargetSections(prev => prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File too large. Maximum size is 2MB.");
        return;
      }
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTempPdf({ 
          url: ev.target?.result as string, 
          type: 'pdf', 
          name: file.name.toUpperCase() 
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
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
      // Map frontend keys to database column names (snake_case)
      const noticePayload = {
        title: formData.title.toUpperCase(),
        content: `${targetStr} ${formData.content.toUpperCase()}`,
        category: formData.category,
        date: new Date().toLocaleDateString('en-GB'),
        posted_by: user.name,
        attachments: tempPdf ? [tempPdf] : []
      };

      await db.notices.insert(noticePayload);
      await createAuditLog(user, 'CREATE', 'Notices', `Notice Broadcast: ${formData.title} with ${tempPdf ? 'PDF' : 'no'} attachment`);
      
      setShowModal(false);
      setShowSuccess(true);
      setFormData({ title: '', content: '', category: 'General', attachments: [] });
      setTargetClasses([]);
      setTempPdf(null);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchNoticesAndConfig();
    } catch (err: any) { 
      alert(`Sync Failed: ${getErrorMessage(err)}`); 
    }
    finally { setIsSyncing(false); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSyncing(true);
    try {
      await db.notices.delete(deleteTarget.id);
      await createAuditLog(user, 'DELETE', 'Notices', `Purged Broadcast: ${deleteTarget.title}`);
      setDeleteTarget(null);
      fetchNoticesAndConfig();
    } catch (err: any) {
      alert(`Delete Failed: ${getErrorMessage(err)}`);
    } finally {
      setIsSyncing(false);
    }
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
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCcw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Registry Updating...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Broadcast Synced</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Dispatched to Cloud</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-4 sm:px-0">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Notice Board <Bell className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional multi-target broadcasting console.</p>
        </div>
        {user.role !== 'STUDENT' && (
          <button onClick={() => { setTargetClasses([]); setTempPdf(null); setShowModal(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:-translate-y-1 transition-all uppercase text-xs tracking-widest flex items-center gap-3">
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
            const hasAttachment = notice.attachments && notice.attachments.length > 0;

            return (
              <div key={notice.id} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                       <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">{notice.category}</span>
                       <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Clock size={12}/> {notice.date}</span>
                    </div>
                    {hasAttachment && (
                       <span className="flex items-center gap-1.5 text-[8px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest">
                          <FileText size={10}/> Document Attached
                       </span>
                    )}
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2 uppercase">{notice.title}</h3>
                 <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Layers size={10}/> Audience: {targetInfo}</p>
                 <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8 flex-1 italic">"{displayContent}"</p>
                 
                 <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400"><Megaphone size={14}/></div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">By {notice.postedBy}</span>
                    </div>
                    <div className="flex gap-2">
                       {hasAttachment && (
                          <button 
                            onClick={() => setViewingPdf(notice.attachments[0])}
                            className="px-6 py-3 bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
                          >
                             <Eye size={14}/> View Document
                          </button>
                       )}
                       {user.role === 'ADMIN' && (
                         <button onClick={() => setDeleteTarget(notice)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 size={16}/>
                         </button>
                       )}
                    </div>
                 </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Post Announcement</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-Target Protocol</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={28} /></button>
              </div>
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar flex flex-col md:flex-row gap-10 bg-white dark:bg-slate-900">
                 <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notice Heading</label>
                       <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value.toUpperCase()})} placeholder="E.G. SCHOOL HOLIDAY NOTICE" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner" />
                    </div>
                    
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                       <div className="flex gap-2">
                          <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 font-black uppercase outline-none shadow-inner">
                             {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <button type="button" onClick={() => setShowCategoryModal(true)} className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                             <PlusCircle size={20} strokeWidth={3}/>
                          </button>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content Details</label>
                       <textarea rows={5} required value={formData.content} onChange={e => setFormData({...formData, content: e.target.value.toUpperCase()})} placeholder="DETAILED BROADCAST DETAILS..." className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-[2rem] px-8 py-6 font-medium outline-none resize-none shadow-inner" />
                    </div>

                    <div className="space-y-2 pt-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Document (Optional PDF)</label>
                       <div 
                         onClick={() => fileInputRef.current?.click()}
                         className={`w-full h-32 border-4 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${tempPdf ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 hover:bg-slate-100'}`}
                       >
                          {isUploading ? <Loader2 className="animate-spin" size={24}/> : <Upload size={32} strokeWidth={1.5} />}
                          <p className="text-[9px] font-black uppercase tracking-widest truncate max-w-[300px]">{tempPdf ? tempPdf.name : 'Tap to attach PDF Circular'}</p>
                       </div>
                       <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handlePdfUpload} />
                    </div>
                 </div>

                 <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 space-y-8 border border-slate-100 dark:border-slate-800 shadow-inner">
                    <div className="space-y-4">
                       <div className="flex justify-between items-center px-1">
                          <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><CheckSquare size={14}/> Standards</h4>
                          <button type="button" onClick={() => setTargetClasses(targetClasses.length === authorizedClasses.length ? [] : [...authorizedClasses])} className="text-[9px] font-black text-slate-400 uppercase hover:text-indigo-600">Select All</button>
                       </div>
                       <div className="grid grid-cols-1 gap-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                          {authorizedClasses.map(cls => (
                             <button key={cls} type="button" onClick={() => toggleClass(cls)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${targetClasses.includes(cls) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-100'}`}>
                                {targetClasses.includes(cls) ? <CheckSquare size={14} strokeWidth={3} /> : <Square size={14} />}
                                <span className="text-[10px] font-black uppercase truncate">{cls}</span>
                             </button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
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
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 dark:bg-slate-800/30">
                 <button onClick={handleSave} disabled={isSyncing || targetClasses.length === 0} className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-sm tracking-[0.3em] flex items-center justify-center gap-4">
                    {isSyncing ? <Loader2 className="animate-spin" /> : <ShieldCheck size={24} />} Sync & Broadcast
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* COMPACT CATEGORY ADD MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-sm w-full shadow-2xl animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner mx-auto">
                 <Settings2 size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 text-center uppercase tracking-tight">Add Label</h3>
              <p className="text-slate-400 text-[10px] font-bold text-center uppercase tracking-widest mb-6">Create New Notice Category</p>
              
              <div className="space-y-4">
                 <input 
                  type="text" 
                  value={newCatName} 
                  onChange={e => setNewCatName(e.target.value)} 
                  placeholder="E.G. SPORTS DAY" 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl px-6 py-4 font-black uppercase text-xs text-indigo-600 outline-none focus:border-indigo-500"
                  onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                 />
                 <div className="flex gap-3">
                    <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                    <button onClick={handleAddCategory} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px]">Add Label</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-sm w-full shadow-2xl text-center border border-rose-100/20 animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[1.8rem] flex items-center justify-center mb-6 mx-auto shadow-inner border border-rose-100">
                 <AlertTriangle size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter leading-tight">Purge Notice?</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium text-[10px] leading-relaxed uppercase tracking-widest">Delete <b>{deleteTarget.title}</b> from all institutional terminals? This action is irreversible.</p>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setDeleteTarget(null)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={handleConfirmDelete} className="py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 transition-all uppercase text-[10px]">Purge</button>
              </div>
           </div>
        </div>
      )}

      {/* PDF VIEWER MODAL */}
      {viewingPdf && (
        <div className="fixed inset-0 z-[1400] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FileText size={20}/></div>
                    <div>
                       <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white truncate max-w-[200px] md:max-w-md">{viewingPdf.name}</h3>
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">BROADCAST DOCUMENT NODE</p>
                    </div>
                 </div>
                 <button onClick={() => setViewingPdf(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-hidden bg-white">
                 <iframe src={viewingPdf.url} className="w-full h-full border-none" title="Notice Viewer" />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;