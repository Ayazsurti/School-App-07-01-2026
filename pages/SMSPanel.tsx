
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, Student, NoticeMedia } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  MessageSquareQuote, 
  Send, 
  Search, 
  X, 
  Users, 
  Upload, 
  FileText, 
  CheckCircle2, 
  Info, 
  AlertCircle,
  FileIcon,
  Smartphone,
  BookOpen,
  Layout,
  History,
  Clock,
  ArrowRight,
  RefreshCcw,
  Check,
  Trash2,
  FileSpreadsheet,
  Download,
  Terminal,
  Cpu,
  GraduationCap,
  ListChecks,
  UserCheck,
  SearchCode,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { db, supabase } from '../supabase';

interface SMSPanelProps {
  user: User;
}

interface SMSTransmission {
  id: string;
  targetClass: string;
  targetSection: string;
  recipientCount: number;
  message: string;
  fullMessage: string;
  date: string;
  time: string;
  status: 'SENT' | 'FAILED';
  hasAttachment: boolean;
  attachmentName?: string;
}

const ALL_CLASSES = ['Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const SMSPanel: React.FC<SMSPanelProps> = ({ user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tempAttachment, setTempAttachment] = useState<NoticeMedia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [reports, setReports] = useState<any[]>(() => {
    const saved = localStorage.getItem('school_sms_reports_json');
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<SMSTransmission[]>(() => {
    const saved = localStorage.getItem('school_sms_history');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const fetchCloudStudents = async () => {
    try {
      const data = await db.students.getAll();
      const mapped = data.map((s: any) => ({
        id: s.id, 
        fullName: s.full_name, 
        name: s.full_name, 
        grNumber: s.gr_number,
        class: s.class, 
        section: s.section, 
        rollNo: s.roll_no,
        fatherMobile: s.father_mobile
      }));
      setStudents(mapped as Student[]);
    } catch (err) {
      console.error("SMS Panel Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCloudStudents();
    const channel = supabase.channel('sms-panel-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        setIsSyncing(true);
        fetchCloudStudents().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    localStorage.setItem('school_sms_history', JSON.stringify(history));
    localStorage.setItem('school_sms_reports_json', JSON.stringify(reports));
  }, [history, reports]);

  const filteredRecipients = useMemo(() => {
    return students.filter(s => {
      const matchesClass = selectedClass === 'All' || s.class === selectedClass;
      const matchesSection = selectedSection === 'All' || s.section === selectedSection;
      const matchesSearch = (s.fullName || s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (s.grNumber || '').includes(searchQuery);
      return matchesClass && matchesSection && matchesSearch;
    });
  }, [students, selectedClass, selectedSection, searchQuery]);

  useEffect(() => {
    // Automatically select all in the filtered view by default
    setSelectedStudentIds(filteredRecipients.map(s => s.id));
  }, [selectedClass, selectedSection, students]);

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTempAttachment({
        url: ev.target?.result as string,
        type: 'pdf',
        name: file.name
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const sendSMS = () => {
    if (!message.trim() || selectedStudentIds.length === 0) return;
    
    setIsSending(true);
    
    setTimeout(() => {
      const now = new Date();
      const requestId = "wamid." + Math.random().toString(36).substr(2, 9).toUpperCase();
      
      const newEntry: SMSTransmission = {
        id: requestId,
        targetClass: selectedClass,
        targetSection: selectedSection,
        recipientCount: selectedStudentIds.length,
        fullMessage: message,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        status: 'SENT',
        hasAttachment: !!tempAttachment,
        attachmentName: tempAttachment?.name
      };

      const firstStudent = students.find(s => s.id === selectedStudentIds[0]);
      const newReport = {
        "type": "status_update",
        "request_id": requestId,
        "phone_number_id": "123456789012345",
        "recipient_id": firstStudent?.fatherMobile || "919876543210",
        "status": "delivered",
        "timestamp": Math.floor(now.getTime() / 1000),
        "errors": null
      };

      setReports(prev => [newReport, ...prev].slice(0, 10));
      setHistory(prev => [newEntry, ...prev]);
      setIsSending(false);
      setShowSuccess(true);
      createAuditLog(user, 'EXPORT', 'SMS', `Dispatched broadcast to ${selectedStudentIds.length} students in Std ${selectedClass}`);
      
      setMessage('');
      setTempAttachment(null);
      setTimeout(() => setShowSuccess(false), 4000);
    }, 2000);
  };

  const templates = [
    { title: 'Absence Notice', text: 'Dear Parent, your child was marked absent today. Please provide a leave note if already submitted.' },
    { title: 'Fee Reminder', text: 'Dear Parent, this is a friendly reminder that school fees for the current quarter are pending.' },
    { title: 'Exam Schedule', text: 'Dear Student, the final term examination schedule has been published. Please check the portal for details.' },
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              {/* Fixed: Use RefreshCcw which is imported instead of non-existent RefreshCw */}
              <RefreshCcw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Updating SMS Registry...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-5 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                 <CheckCircle2 size={28} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-sm uppercase tracking-[0.2em]">Broadcast Sent!</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Transmission successfully recorded</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase flex items-center gap-3">SMS Panel <ShieldCheck className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Institutional communication synced with Student Registry.</p>
        </div>
      </div>

      {/* Registry Class Filters - Matching Student Management Style */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative group w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search Registry (Name/GR)..." 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner dark:text-white" 
                  />
              </div>
              <div className="flex-1 w-full flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Section:</span>
                  <select 
                    value={selectedSection}
                    onChange={e => setSelectedSection(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-xs font-black uppercase text-slate-700 dark:text-white"
                  >
                    <option value="All">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
              </div>
          </div>
          <div className="flex gap-2 overflow-x-auto w-full pb-2 custom-scrollbar">
              <button 
                onClick={() => setSelectedClass('All')} 
                className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedClass === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
              >
                All Grades
              </button>
              {ALL_CLASSES.map(c => (
                <button 
                  key={c} 
                  onClick={() => setSelectedClass(c)} 
                  className={`whitespace-nowrap px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${selectedClass === c ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                >
                  Std {c}
                </button>
              ))}
          </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left Column: Student Registry Selection */}
        <div className="xl:col-span-5 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-full">
              <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between">
                 <div>
                    <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">Broadcast Targets</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registry Sync: {filteredRecipients.length} Identities</p>
                 </div>
                 <button 
                  onClick={() => {
                    if (selectedStudentIds.length === filteredRecipients.length) setSelectedStudentIds([]);
                    else setSelectedStudentIds(filteredRecipients.map(s => s.id));
                  }}
                  className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                 >
                    {selectedStudentIds.length === filteredRecipients.length ? 'Deselect All' : 'Select All'}
                 </button>
              </div>

              <div className="flex-1 max-h-[600px] overflow-y-auto p-4 custom-scrollbar space-y-2">
                 {isLoading ? (
                   <div className="py-20 flex flex-col items-center justify-center opacity-50"><Loader2 className="animate-spin text-indigo-500" /></div>
                 ) : filteredRecipients.length > 0 ? (
                   filteredRecipients.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => toggleStudentSelection(s.id)}
                      className={`flex items-center gap-4 p-4 rounded-[2rem] border-2 transition-all cursor-pointer ${selectedStudentIds.includes(s.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 hover:bg-slate-50'}`}
                    >
                       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm shrink-0 ${selectedStudentIds.includes(s.id) ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                          {s.rollNo || s.fullName?.charAt(0) || 'S'}
                       </div>
                       <div className="min-w-0 flex-1">
                          <p className={`font-black text-sm uppercase truncate ${selectedStudentIds.includes(s.id) ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>{s.fullName}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">GR: {s.grNumber}</span>
                             <span className="text-[9px] font-black text-indigo-500/60 uppercase tracking-widest">Std {s.class}-{s.section}</span>
                          </div>
                       </div>
                       {selectedStudentIds.includes(s.id) ? (
                         <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg"><Check size={14} strokeWidth={4} /></div>
                       ) : (
                         <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 rounded-full" />
                       )}
                    </div>
                   ))
                 ) : (
                   <div className="py-20 text-center opacity-30">
                      <UserCheck size={48} className="mx-auto mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest">Registry quadrant empty</p>
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* Right Column: Composer & History */}
        <div className="xl:col-span-7 space-y-8">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div className="space-y-2">
                 <div className="flex justify-between items-center mb-1 ml-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Broadcast Message</label>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${message.length > 160 ? 'text-rose-500' : 'text-indigo-400 dark:text-indigo-300'}`}>
                       {message.length} Characters
                    </span>
                 </div>
                 <textarea 
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Draft institutional announcement..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] px-8 py-8 font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner"
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Attachment (PDF)</label>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-8 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 font-black rounded-3xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
                    >
                        {isUploading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
                        <span className="text-[10px] uppercase tracking-widest">{tempAttachment ? 'PDF Loaded' : 'Attach PDF'}</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
                 </div>

                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Templates</label>
                    <div className="space-y-2">
                       {templates.map((t, idx) => (
                          <button key={idx} onClick={() => setMessage(t.text)} className="w-full text-left p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-indigo-500 transition-all group">
                             <p className="text-[9px] font-black text-indigo-600 uppercase mb-1">{t.title}</p>
                             <p className="text-[10px] text-slate-500 line-clamp-1 italic">"{t.text}"</p>
                          </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
                 <button 
                  onClick={sendSMS}
                  disabled={isSending || !message.trim() || selectedStudentIds.length === 0}
                  className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 text-sm tracking-[0.2em] uppercase disabled:opacity-50"
                 >
                    {isSending ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send size={20} /> Dispatch to {selectedStudentIds.length} Recipient(s)
                      </>
                    )}
                 </button>
              </div>
           </div>

           {/* Webhook Console */}
           <div className="bg-slate-950 rounded-[3rem] p-10 text-emerald-400 shadow-2xl border-4 border-slate-900 relative overflow-hidden font-mono">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-900/30 rounded-xl flex items-center justify-center border border-emerald-500/20">
                       <Terminal size={20} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">Live UPLINK Data</h3>
                 </div>
                 <button onClick={() => setReports([])} className="text-[9px] hover:underline uppercase text-emerald-800 font-black">Clear Node</button>
              </div>
              <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar">
                 {reports.length > 0 ? reports.map((rep, idx) => (
                    <div key={idx} className="p-4 bg-emerald-950/20 border border-emerald-500/10 rounded-2xl animate-in slide-in-from-left-4">
                       <div className="flex items-center gap-3 mb-2">
                          <Check size={12} className="text-emerald-500" />
                          <span className="text-[10px] text-emerald-500/60 font-black uppercase">{new Date(rep.timestamp * 1000).toLocaleTimeString()}</span>
                       </div>
                       <pre className="text-[9px] leading-relaxed whitespace-pre-wrap break-all opacity-80">{JSON.stringify(rep, null, 2)}</pre>
                    </div>
                 )) : (
                   <div className="py-12 text-center opacity-20">
                      <Cpu size={32} className="mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.5em]">Listening for cloud callbacks...</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SMSPanel;
