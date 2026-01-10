
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { db, supabase } from '../supabase';
import { 
  Stamp, 
  Upload, 
  Save, 
  CheckCircle2, 
  School, 
  Phone, 
  Mail, 
  ShieldCheck,
  Loader2,
  Trash2,
  Camera,
  RotateCcw,
  AlertTriangle,
  X
} from 'lucide-react';

interface SchoolSettingsProps { user: User; }

const SchoolSettings: React.FC<SchoolSettingsProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    school_name: '',
    school_address: '',
    school_contact: '',
    school_email: '',
    school_logo: ''
  });

  const fetchBranding = async () => {
    try {
      const settings = await db.settings.getAll();
      setFormData({
        school_name: settings.school_name || 'Deen-E-Islam School',
        school_address: settings.school_address || '',
        school_contact: settings.school_contact || '',
        school_email: settings.school_email || '',
        school_logo: settings.school_logo || ''
      });
    } catch (err) { 
      console.error("Identity Fetch Error:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("Photo size bahut zyada hai! Please 800KB se kam ki photo upload karein taaki cloud speed fast rahe.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => setFormData(prev => ({ ...prev, school_logo: ev.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const deleteLogo = async () => {
    setSyncing(true);
    try {
      await db.settings.update('school_logo', null);
      setFormData(prev => ({ ...prev, school_logo: '' }));
      createAuditLog(user, 'DELETE', 'Identity', `School Logo Removed from Cloud`);
      setShowDeleteConfirm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { 
      alert("Logo delete nahi ho paya. Cloud connection check karein."); 
    } finally { 
      setSyncing(false); 
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncing(true);
    try {
      // Logic to save all fields to cloud
      const entries = Object.entries(formData) as [string, string][];
      for (const [key, value] of entries) {
        await db.settings.update(key, value || null);
      }
      createAuditLog(user, 'UPDATE', 'Identity', `School Identity Updated: ${formData.school_name}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { 
      alert("Cloud Sync Fail: Database check karein."); 
    } finally { 
      setSyncing(false); 
    }
  };

  if (loading) {
    return (
      <div className="py-40 flex flex-col items-center justify-center">
        <Loader2 size={64} className="animate-spin text-indigo-600 mb-6" />
        <p className="font-black text-xs uppercase tracking-widest text-slate-400">Loading Cloud Branding...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in max-w-5xl mx-auto">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 border border-emerald-500">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">SAVED TO CLOUD</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">School Branding Updated</p>
              </div>
           </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-sm w-full shadow-2xl text-center">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
                 <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase">Logo Delete Karein?</h3>
              <p className="text-slate-500 text-xs mb-8 uppercase font-bold">Ye logo receipts aur ID cards se hat jayega.</p>
              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setShowDeleteConfirm(false)} className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 font-black rounded-2xl uppercase text-[10px]">Cancel</button>
                 <button onClick={deleteLogo} className="py-4 bg-rose-600 text-white font-black rounded-2xl uppercase text-[10px]">Delete</button>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-3">School Branding <Stamp className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Yahan se aap School ka Naam aur Logo badal sakte hain.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center">
              <div className="relative group mb-8">
                 <div className="w-44 h-44 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-4 border-white dark:border-slate-700 shadow-xl overflow-hidden flex items-center justify-center">
                    {formData.school_logo ? (
                      <img src={formData.school_logo} className="w-full h-full object-cover" alt="Logo" />
                    ) : (
                      <School size={50} className="text-slate-200" />
                    )}
                 </div>
                 
                 <div className="absolute -bottom-2 -right-2 flex flex-col gap-2">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                       <Camera size={18} />
                    </button>
                    {formData.school_logo && (
                      <button type="button" onClick={() => setShowDeleteConfirm(true)} className="p-3 bg-rose-500 text-white rounded-xl shadow-lg hover:scale-110 transition-transform">
                         <Trash2 size={18} />
                      </button>
                    )}
                 </div>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm">School Logo</h3>
              <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 text-center">PNG ya JPG use karein (Max 800KB)</p>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 p-10 space-y-8">
              <div className="group">
                 <div className="flex justify-between items-end mb-2 ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">School Ka Poora Naam</label>
                    <button type="button" onClick={() => setFormData({...formData, school_name: 'Deen-E-Islam School'})} className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:underline flex items-center gap-1"><RotateCcw size={10}/> Reset</button>
                 </div>
                 <input 
                  type="text" 
                  required 
                  value={formData.school_name} 
                  onChange={e => setFormData({...formData, school_name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 font-black text-slate-800 dark:text-white outline-none text-xl uppercase"
                  placeholder="School Name"
                 />
              </div>

              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">School Ka Address (Address Line)</label>
                 <textarea 
                  rows={2}
                  required 
                  value={formData.school_address} 
                  onChange={e => setFormData({...formData, school_address: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl px-6 py-4 font-bold text-slate-800 dark:text-white outline-none"
                  placeholder="Pata Likhein (Receipts par print hoga)"
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Email Address</label>
                    <div className="relative">
                       <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                       <input 
                        type="email" 
                        value={formData.school_email} 
                        onChange={e => setFormData({...formData, school_email: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-800 dark:text-white outline-none border-2 border-transparent focus:border-indigo-500"
                        placeholder="school@example.com"
                       />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Mobile / Contact</label>
                    <div className="relative">
                       <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                       <input 
                        type="text" 
                        value={formData.school_contact} 
                        onChange={e => setFormData({...formData, school_contact: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-800 dark:text-white outline-none border-2 border-transparent focus:border-indigo-500"
                        placeholder="+91-XXXXXXXXXX"
                       />
                    </div>
                 </div>
              </div>

              <div className="pt-6">
                 <button 
                  type="submit" 
                  disabled={syncing}
                  className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                    {syncing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Save Branding to Cloud
                 </button>
              </div>
           </div>
        </div>
      </form>
    </div>
  );
};

export default SchoolSettings;
