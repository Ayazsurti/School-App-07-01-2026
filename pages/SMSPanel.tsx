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
  Download
} from 'lucide-react';
import { MOCK_STUDENTS } from '../constants';

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

const ALL_CLASSES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

const SMSPanel: React.FC<SMSPanelProps> = ({ user }) => {
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedSection, setSelectedSection] = useState('All');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tempAttachment, setTempAttachment] = useState<NoticeMedia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [history, setHistory] = useState<SMSTransmission[]>(() => {
    const saved = localStorage.getItem('school_sms_history');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'h1',
        targetClass: '10th',
        targetSection: 'A',
        recipientCount: 42,
        message: 'Annual Sports Day schedule published...',
        fullMessage: 'Dear Parent, the annual Sports Day schedule has been published. Please check the portal for details.',
        date: '24 May 2024',
        time: '10:30 AM',
        status: 'SENT',
        hasAttachment: true,
        attachmentName: 'sports_schedule.pdf'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('school_sms_history', JSON.stringify(history));
  }, [history]);

  const students = useMemo(() => {
    const saved = localStorage.getItem('school_students_db');
    if (saved) return JSON.parse(saved) as Student[];
    return MOCK_STUDENTS as any as Student[];
  }, []);

  const filteredRecipients = useMemo(() => {
    return students.filter(s => {
      const matchesClass = selectedClass === 'All' || s.class === selectedClass;
      const matchesSection = selectedSection === 'All' || s.section === selectedSection;
      return matchesClass && matchesSection;
    });
  }, [students, selectedClass, selectedSection]);

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
    if (!message.trim() || filteredRecipients.length === 0) return;
    
    setIsSending(true);
    
    setTimeout(() => {
      const now = new Date();
      const newEntry: SMSTransmission = {
        id: Math.random().toString(36).substr(2, 9),
        targetClass: selectedClass,
        targetSection: selectedSection,
        recipientCount: filteredRecipients.length,
        fullMessage: message,
        message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        status: 'SENT',
        hasAttachment: !!tempAttachment,
        attachmentName: tempAttachment?.name
      };

      setHistory(prev => [newEntry, ...prev]);
      setIsSending(false);
      setShowSuccess(true);
      createAuditLog(user, 'EXPORT', 'SMS', `Dispatched SMS broadcast to ${filteredRecipients.length} recipients.`);
      
      setMessage('');
      setTempAttachment(null);
      setTimeout(() => setShowSuccess(false), 4000);
    }, 2000);
  };

  const exportHistoryToExcel = () => {
    if (history.length === 0) return;
    const headers = ['ID', 'Date', 'Time', 'Class', 'Section', 'Recipients', 'Status', 'Message'];
    const rows = history.map(h => [h.id, h.date, h.time, h.targetClass, h.targetSection, h.recipientCount, h.status, `"${h.fullMessage.replace(/"/g, '""')}"`]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SMS_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const templates = [
    { title: 'Absence Notice', text: 'Dear Parent, your child was marked absent today. Please provide a leave note if already submitted.' },
    { title: 'Fee Reminder', text: 'Dear Parent, this is a friendly reminder that school fees for the current quarter are pending.' },
    { title: 'Exam Schedule', text: 'Dear Student, the final term examination schedule has been published. Please check the portal for details.' },
  ];

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-5 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
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
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">SMS Panel</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Broadcast institutional messages and alerts to the school community.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportHistoryToExcel}
            disabled={history.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-all border border-emerald-100 dark:border-emerald-800 shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet size={16} /> Export Logs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Target Class</label>
                    <select 
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="All">All Grades (Broadcast)</option>
                      {ALL_CLASSES.map(c => <option key={c} value={c}>Std {c}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Target Section</label>
                    <select 
                      value={selectedSection}
                      onChange={e => setSelectedSection(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="All">All Sections</option>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>
                 </div>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between items-center mb-1 ml-1">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Message Text</label>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${message.length > 160 ? 'text-rose-500' : 'text-indigo-400 dark:text-indigo-300'}`}>
                       {message.length} Characters
                    </span>
                 </div>
                 <textarea 
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Enter message content..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] px-8 py-8 font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner"
                 />
              </div>

              <div className="space-y-4">
                 <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Attachment (Optional PDF)</label>
                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 font-black rounded-3xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 flex flex-col items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-all"
                 >
                    {isUploading ? (
                      <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Upload size={32} />
                        <span className="text-xs uppercase tracking-widest">{tempAttachment ? 'Change PDF' : 'Attach PDF Document'}</span>
                      </>
                    )}
                 </button>
                 <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />

                 {tempAttachment && (
                    <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center justify-center gap-4">
                       <FileIcon size={20} className="text-emerald-600 dark:text-emerald-400" />
                       <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-xs">{tempAttachment.name}</span>
                       <button onClick={() => setTempAttachment(null)} className="p-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 rounded-lg"><X size={16} /></button>
                    </div>
                 )}
              </div>

              <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
                 <button 
                  onClick={sendSMS}
                  disabled={isSending || !message.trim() || filteredRecipients.length === 0}
                  className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] shadow-2xl shadow-indigo-100 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-4 text-sm tracking-[0.2em] uppercase disabled:opacity-50"
                 >
                    {isSending ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send size={20} /> Broadcast to {filteredRecipients.length} Recipient(s)
                      </>
                    )}
                 </button>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
              <h3 className="text-xl font-black mb-8 flex items-center gap-4 tracking-tight uppercase">
                 <Layout size={24} className="text-indigo-400" /> Quick Templates
              </h3>
              <div className="space-y-4">
                 {templates.map((t, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setMessage(t.text)}
                      className="w-full p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-indigo-600 transition-all text-left group/btn"
                    >
                       <p className="text-[10px] font-black uppercase text-indigo-400 group-hover/btn:text-white mb-2 tracking-widest">{t.title}</p>
                       <p className="text-xs text-slate-400 group-hover/btn:text-white/80 line-clamp-2 leading-relaxed">{t.text}</p>
                    </button>
                 ))}
              </div>
           </div>

           <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 mb-8">
                 <History size={24} className="text-indigo-600 dark:text-indigo-400" />
                 <div>
                    <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">Recent Dispatches</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Transmission History</p>
                 </div>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                 {history.length > 0 ? (
                   history.map((entry) => (
                    <div key={entry.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 border-l-4 border-l-indigo-600">
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase">Std {entry.targetClass}</span>
                          <span className="text-[9px] font-black px-2 py-1 rounded-lg uppercase bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">{entry.status}</span>
                       </div>
                       <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">"{entry.message}"</p>
                       <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                             <Clock size={10} /> {entry.time} • {entry.date}
                          </div>
                          {entry.hasAttachment && <FileText size={12} className="text-indigo-400 dark:text-indigo-300" />}
                       </div>
                    </div>
                   ))
                 ) : (
                   <p className="text-center py-10 text-slate-300 dark:text-slate-700 font-bold text-xs uppercase">No recent activity</p>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SMSPanel;