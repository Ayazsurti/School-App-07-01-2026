
import React, { useState, useEffect } from 'react';
import { User, GradeRule } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { supabase, db } from '../supabase';
import { Plus, Trash2, Edit2, X, Save, CheckCircle2, ShieldCheck, Loader2, RefreshCw, Star, Info, Award } from 'lucide-react';

interface GradingSystemProps { user: User; }

const GradingSystem: React.FC<GradingSystemProps> = ({ user }) => {
  const [rules, setRules] = useState<GradeRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<GradeRule | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const initialFormData: Partial<GradeRule> = { grade: '', minPercent: 0, maxPercent: 0, point: 0, remark: '' };
  const [formData, setFormData] = useState<Partial<GradeRule>>(initialFormData);

  const fetchRules = async () => {
    try {
      const data = await db.grading.getAll();
      setRules(data.map((r: any) => ({
        id: r.id, grade: r.grade, minPercent: r.min_percent, maxPercent: r.max_percent, point: r.point, remark: r.remark
      })));
    } catch (err) { console.error("Grading Sync Error"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchRules();
    const channel = supabase.channel('realtime-grading')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grading_rules' }, () => {
        setIsSyncing(true);
        fetchRules().then(() => setTimeout(() => setIsSyncing(false), 800));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.grade) return;
    setIsSyncing(true);
    try {
      await db.grading.upsert({
        id: editingRule?.id,
        grade: formData.grade,
        min_percent: formData.minPercent,
        max_percent: formData.maxPercent,
        point: formData.point,
        remark: formData.remark
      });
      createAuditLog(user, editingRule ? 'UPDATE' : 'CREATE', 'Exams', `Grading Updated: ${formData.grade}`);
      setShowModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Failed to save rule."); }
    finally { setIsSyncing(false); }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in relative">
      {isSyncing && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1100] animate-bounce no-print">
           <div className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-indigo-400">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Grading Sync Active...</span>
           </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Policy Updated</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase mt-0.5">Scale synced to cloud</p>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 uppercase">Grading Policies <Award className="text-indigo-600" /></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg uppercase tracking-tight">Establish global assessment scales and percentage boundaries.</p>
        </div>
        <button onClick={() => { setEditingRule(null); setFormData(initialFormData); setShowModal(true); }} className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:-translate-y-1 transition-all uppercase text-xs tracking-widest flex items-center gap-3"><Plus size={20} /> Define New Scale</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden min-h-[400px]">
               {isLoading ? (
                 <div className="py-40 flex flex-col items-center justify-center animate-pulse"><Loader2 size={48} className="animate-spin text-indigo-600" /></div>
               ) : (
                 <div className="overflow-x-auto">
                    <table className="w-full">
                       <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                             <th className="px-10 py-6 text-left">Grade Token</th>
                             <th className="px-8 py-6 text-center">Boundaries (%)</th>
                             <th className="px-8 py-6 text-center">Grade Points</th>
                             <th className="px-8 py-6 text-right">Registry Operations</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {rules.map(rule => (
                            <tr key={rule.id} className="hover:bg-slate-50/50 transition-colors">
                               <td className="px-10 py-6">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg">{rule.grade}</div>
                                     <div>
                                        <p className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">{rule.remark}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-8 py-6 text-center">
                                  <span className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl font-black text-xs text-slate-700 dark:text-slate-300">{rule.minPercent}% - {rule.maxPercent}%</span>
                               </td>
                               <td className="px-8 py-6 text-center font-black text-indigo-600 text-lg">{rule.point.toFixed(1)}</td>
                               <td className="px-8 py-6 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                     <button onClick={() => { setEditingRule(rule); setFormData(rule); setShowModal(true); }} className="p-3 bg-white dark:bg-slate-800 text-indigo-600 rounded-xl border border-slate-100 dark:border-slate-900 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit2 size={16} /></button>
                                     <button onClick={async () => { await db.grading.delete(rule.id); fetchRules(); }} className="p-3 bg-white dark:bg-slate-800 text-rose-500 rounded-xl border border-slate-100 dark:border-slate-900 hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={16} /></button>
                                  </div>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
               )}
            </div>
         </div>

         <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
               <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 mb-6"><Award className="text-indigo-400" /> Grading Protocol</h3>
               <p className="text-slate-400 text-xs leading-relaxed uppercase font-bold tracking-widest">The grading system automatically converts raw percentages into institutional grades and points during result generation. Ensure boundaries do not overlap to prevent calculation errors.</p>
               <div className="mt-8 p-6 bg-white/5 rounded-[2rem] border border-white/5 flex items-start gap-4">
                  <Info className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">Updates to these scales will re-calibrate all published results in the next sync cycle.</p>
               </div>
            </div>
         </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-md w-full animate-in zoom-in-95 border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <h3 className="text-2xl font-black uppercase tracking-tight">{editingRule ? 'Modify Scale' : 'New Grading Scale'}</h3>
                 <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 rounded-full text-slate-400"><X size={28} /></button>
              </div>
              <form onSubmit={handleSave} className="p-10 space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Grade Symbol</label>
                    <input type="text" required value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value.toUpperCase()})} placeholder="e.g., A+" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 font-black text-2xl uppercase text-indigo-600 outline-none" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Min %</label>
                       <input type="number" value={formData.minPercent} onChange={e => setFormData({...formData, minPercent: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 font-black outline-none" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Max %</label>
                       <input type="number" value={formData.maxPercent} onChange={e => setFormData({...formData, maxPercent: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 font-black outline-none" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Grade Points</label>
                       <input type="number" step="0.1" value={formData.point} onChange={e => setFormData({...formData, point: parseFloat(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 font-black outline-none" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Remark Token</label>
                       <input type="text" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} placeholder="EXCELLENT" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 font-black outline-none uppercase" />
                    </div>
                 </div>
                 <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-3">
                    <ShieldCheck size={20} /> Finalize Sync
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default GradingSystem;
