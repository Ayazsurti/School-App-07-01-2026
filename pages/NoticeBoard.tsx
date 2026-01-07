
import React, { useState, useMemo, useRef } from 'react';
import { User, Notice, NoticeMedia } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Bell, 
  Calendar, 
  User as UserIcon, 
  Plus, 
  Megaphone, 
  X, 
  FileText, 
  Search,
  Settings2,
  Tag,
  Trash2,
  Edit2,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Video,
  FileIcon
} from 'lucide-react';

interface NoticeBoardProps { user: User; }

interface AttachmentToDelete {
  noticeId: string;
  index: number;
}

const NoticeBoard: React.FC<NoticeBoardProps> = ({ user }) => {
  const [showForm, setShowForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<AttachmentToDelete | null>(null);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(['URGENT', 'GENERAL', 'ACADEMIC', 'EVENT']);
  const [newCatName, setNewCatName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notices, setNotices] = useState<Notice[]>([
    {
      id: '1',
      title: 'Annual Sports Day 2024',
      content: 'The annual sports competition has been scheduled for next Friday. All students are encouraged to participate in at least one event. Please contact your class teacher for registration.',
      category: 'EVENT',
      date: '24 May 2024',
      postedBy: 'Principal Office',
      attachments: [
        { url: 'https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=400', type: 'image', name: 'Sports Day Map' }
      ]
    },
    {
      id: '2',
      title: 'Summer Vacation Announcement',
      content: 'School will remain closed for summer break from June 1st to July 15th. Homework assignments have been uploaded to the curriculum section.',
      category: 'GENERAL',
      date: '22 May 2024',
      postedBy: 'Admin'
    }
  ]);

  const [newNotice, setNewNotice] = useState<{
    title: string;
    content: string;
    category: string;
    attachments: NoticeMedia[];
  }>({ title: '', content: '', category: 'GENERAL', attachments: [] });

  const handlePost = () => {
    if (!newNotice.title || !newNotice.content) return;
    if (editingNoticeId) {
      setNotices(notices.map(n => n.id === editingNoticeId ? {
        ...n,
        title: newNotice.title,
        content: newNotice.content,
        category: newNotice.category as any,
        attachments: newNotice.attachments
      } : n));
      createAuditLog(user, 'UPDATE', 'Notices', `Modified announcement: "${newNotice.title}"`);
    } else {
      const notice: Notice = {
        id: Math.random().toString(),
        title: newNotice.title,
        content: newNotice.content,
        category: newNotice.category as any,
        attachments: newNotice.attachments,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        postedBy: user.name
      };
      setNotices([notice, ...notices]);
      createAuditLog(user, 'CREATE', 'Notices', `Published new announcement: "${newNotice.title}"`);
    }
    setShowForm(false);
    setEditingNoticeId(null);
    setNewNotice({ title: '', content: '', category: 'GENERAL', attachments: [] });
  };

  const handleEditClick = (notice: Notice) => {
    setEditingNoticeId(notice.id);
    setNewNotice({ 
      title: notice.title, 
      content: notice.content, 
      category: notice.category,
      attachments: notice.attachments || []
    });
    setShowForm(true);
  };

  const handleDeleteNoticeRequest = (id: string) => setDeleteConfirmationId(id);
  const confirmDeleteNotice = () => {
    if (deleteConfirmationId) {
      const target = notices.find(n => n.id === deleteConfirmationId);
      setNotices(notices.filter(n => n.id !== deleteConfirmationId));
      setDeleteConfirmationId(null);
      createAuditLog(user, 'DELETE', 'Notices', `Purged announcement: "${target?.title}"`);
    }
  };

  const handleAttachmentDeleteRequest = (noticeId: string, index: number) => {
    setAttachmentToDelete({ noticeId, index });
  };

  const confirmDeleteAttachment = () => {
    if (attachmentToDelete) {
      const { noticeId, index } = attachmentToDelete;
      
      // If we are currently editing a notice
      if (showForm) {
        setNewNotice(prev => ({
          ...prev,
          attachments: prev.attachments.filter((_, i) => i !== index)
        }));
      } else {
        // Deleting from the main list
        setNotices(prev => prev.map(n => n.id === noticeId ? {
          ...n,
          attachments: n.attachments?.filter((_, i) => i !== index)
        } : n));
      }
      
      setAttachmentToDelete(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      const newAttachment: NoticeMedia = {
        url: event.target?.result as string,
        type: type as 'image' | 'video',
        name: file.name
      };
      
      setNewNotice(prev => ({
        ...prev,
        attachments: [...prev.attachments, newAttachment]
      }));
      setIsUploading(false);
    };
    
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  const handleAddCategory = () => {
    const trimmed = newCatName.trim().toUpperCase();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed]);
      setNewCatName('');
      createAuditLog(user, 'UPDATE', 'Notices', `Added new announcement category: "${trimmed}"`);
    }
  };

  const handleDeleteCategory = (cat: string) => {
    if (['URGENT', 'GENERAL', 'ACADEMIC', 'EVENT'].includes(cat)) {
      alert("System categories cannot be deleted.");
      return;
    }
    setCategories(categories.filter(c => c !== cat));
    if (selectedCategory === cat) setSelectedCategory('All');
    createAuditLog(user, 'DELETE', 'Notices', `Removed announcement category: "${cat}"`);
  };

  const filteredNotices = useMemo(() => {
    return notices.filter(notice => {
      const matchesSearch = (notice.title + ' ' + notice.content).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || notice.category === selectedCategory.toUpperCase();
      return matchesSearch && matchesCategory;
    });
  }, [notices, searchQuery, selectedCategory]);

  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Notice Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-sm w-full shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Announcement?</h3>
            <p className="text-slate-500 mb-8 font-medium">This will permanently remove the entire notice from the board.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmationId(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={confirmDeleteNotice} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Delete Confirmation Modal */}
      {attachmentToDelete && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-sm w-full shadow-2xl text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Remove Attachment?</h3>
            <p className="text-slate-500 mb-8 font-medium">Are you sure you want to remove this media file from the announcement?</p>
            <div className="flex gap-3">
              <button onClick={() => setAttachmentToDelete(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={confirmDeleteAttachment} className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Tag className="text-indigo-600" size={24} /> Manage Categories
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New Category..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button onClick={handleAddCategory} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Add</button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {categories.map((cat) => (
                  <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-sm font-bold text-slate-700 tracking-wide">{cat}</span>
                    {!['URGENT', 'GENERAL', 'ACADEMIC', 'EVENT'].includes(cat) && (
                      <button onClick={() => handleDeleteCategory(cat)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setShowCategoryModal(false)} className="w-full mt-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Done</button>
          </div>
        </div>
      )}

      {/* Post Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">{editingNoticeId ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Announcement Title</label>
                <input 
                  type="text" 
                  value={newNotice.title}
                  onChange={e => setNewNotice({...newNotice, title: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Subject of notice..."
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                <select 
                  value={newNotice.category}
                  onChange={e => setNewNotice({...newNotice, category: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold uppercase text-sm text-slate-700"
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Message Content</label>
                <textarea 
                  rows={4}
                  value={newNotice.content}
                  onChange={e => setNewNotice({...newNotice, content: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-600 resize-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Write full details here..."
                />
              </div>

              {/* Attachments Section */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Media Attachments</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {newNotice.attachments.map((file, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      {file.type === 'image' ? (
                        <img src={file.url} className="w-full h-full object-cover" alt="attachment" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                          <Video size={24} />
                          <span className="text-[8px] font-bold mt-1">VIDEO</span>
                        </div>
                      )}
                      <button 
                        onClick={() => handleAttachmentDeleteRequest(editingNoticeId || 'temp', idx)}
                        className="absolute top-1 right-1 p-1.5 bg-rose-500 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Upload size={20} />
                        <span className="text-[10px] font-bold mt-1">UPLOAD</span>
                      </>
                    )}
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,video/*" 
                  onChange={handleFileUpload}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowForm(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={handlePost} className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Publish Notice</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main UI Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Notice Board</h1>
          <p className="text-slate-500 font-medium">Official announcements and school updates.</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCategoryModal(true)} 
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-sm transition-all"
              title="Manage Categories"
            >
              <Settings2 size={20} />
            </button>
            <button 
              onClick={() => { setEditingNoticeId(null); setNewNotice({ title: '', content: '', category: 'GENERAL', attachments: [] }); setShowForm(true); }} 
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all hover:-translate-y-0.5"
            >
              <Plus size={18} strokeWidth={3} /> Post Announcement
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Tag size={18} className="text-indigo-500" /> Categories
            </h3>
            <div className="space-y-1">
              <button 
                onClick={() => setSelectedCategory('All')} 
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${selectedCategory === 'All' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              >
                All Notices
              </button>
              {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedCategory(cat)} 
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${selectedCategory === cat ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-5050/10 rounded-full -mr-8 -mt-8"></div>
            <Megaphone size={32} className="mb-4 text-indigo-400" />
            <h4 className="font-bold text-lg mb-2">Archives</h4>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">Historical announcements are indexed by academic semester.</p>
            <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-[10px] tracking-[0.2em] uppercase transition-all">View Archive</button>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <Search size={20} />
            </div>
            <input 
              type="text" 
              placeholder="Search announcements by title or content..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-12 py-4.5 bg-white border border-slate-200 rounded-[2rem] outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all font-medium text-slate-700"
            />
          </div>

          {filteredNotices.length > 0 ? (
            filteredNotices.map((notice) => (
              <div key={notice.id} className="bg-white p-8 sm:p-10 rounded-[3rem] shadow-sm border border-slate-100 relative group overflow-hidden hover:shadow-xl hover:shadow-indigo-100/30 transition-all">
                <div className={`absolute top-0 left-0 w-2 h-full ${notice.category === 'URGENT' ? 'bg-rose-500' : 'bg-indigo-500'} opacity-80`}></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div className="flex items-center flex-wrap gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.15em] uppercase ${notice.category === 'URGENT' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {notice.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-tighter">
                      <Calendar size={14} className="text-indigo-400" />
                      {notice.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50/50 px-4 py-1.5 rounded-xl border border-slate-100">
                    <UserIcon size={12} className="text-indigo-300" /> Posted by: {notice.postedBy}
                  </div>
                </div>

                <h2 className="text-2xl font-black text-slate-800 mb-4 group-hover:text-indigo-600 transition-colors leading-tight">
                  {notice.title}
                </h2>
                
                <p className="text-slate-600 leading-relaxed mb-8 whitespace-pre-wrap font-medium">
                  {notice.content}
                </p>

                {/* Attachments List */}
                {notice.attachments && notice.attachments.length > 0 && (
                  <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {notice.attachments.map((file, fIdx) => (
                      <div key={fIdx} className="relative aspect-video rounded-[1.5rem] overflow-hidden bg-slate-100 group/file border border-slate-200">
                        {file.type === 'image' ? (
                          <img src={file.url} className="w-full h-full object-cover transition-transform group-hover/file:scale-105" alt={file.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900">
                            <Video size={24} className="text-white" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover/file:opacity-100 transition-opacity">
                          <p className="text-white text-[10px] font-bold truncate">{file.name}</p>
                        </div>
                        {canManage && (
                          <button 
                            onClick={() => handleAttachmentDeleteRequest(notice.id, fIdx)}
                            className="absolute top-3 right-3 w-8 h-8 bg-white/95 backdrop-blur rounded-xl text-rose-500 flex items-center justify-center shadow-lg opacity-0 group-hover/file:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-6 pt-8 border-t border-slate-50">
                  <button className="text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform">
                    <Check size={16} strokeWidth={3} /> Mark as Read
                  </button>
                  {canManage && (
                    <div className="flex items-center gap-5">
                      <button onClick={() => handleEditClick(notice)} className="text-amber-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-amber-700 transition-colors">
                        <Edit2 size={14} /> Edit
                      </button>
                      <button onClick={() => handleDeleteNoticeRequest(notice.id)} className="text-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-rose-700 transition-colors">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                  <div className="flex-1" />
                  <button className="text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 transition-colors">Share</button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-[3rem] p-24 text-center border border-slate-100 shadow-sm flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner">
                <Search size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">No announcements found</h3>
              <p className="text-slate-500 font-medium max-w-xs mx-auto">We couldn't find any notices matching your current search or filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simplified Check Icon
const Check = ({ size, strokeWidth }: { size: number, strokeWidth: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
);

export default NoticeBoard;
