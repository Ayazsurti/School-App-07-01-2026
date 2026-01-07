import React, { useState, useEffect } from 'react';
import { User, Exam, ExamSubject } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  Settings, 
  Save, 
  CheckCircle2, 
  Info, 
  X, 
  ArrowUp, 
  ArrowDown, 
  MoreHorizontal
} from 'lucide-react';
import { MOCK_SUBJECTS } from '../constants';

interface MarksSetupProps {
  user: User;
}

interface SubjectSetupEntry extends ExamSubject {
  groupName: string;
  includeInExam: boolean;
  markingType: 'Marks' | 'Indicator';
  convertToGrade: boolean;
  includeInTotal: boolean;
  gradeProfile: string;
  theoryMin: number;
  practicalMin: number;
}

const MarksSetup: React.FC<MarksSetupProps> = ({ user }) => {
  const [selectedClass, setSelectedClass] = useState('4 - Girls');
  const [selectedCategory, setSelectedCategory] = useState('Default');
  const [selectedExamId, setSelectedExamId] = useState('UT1');
  const [examType, setExamType] = useState<'Marks' | 'Indicator'>('Marks');
  const [sameMarksForAll, setSameMarksForAll] = useState(false);
  const [showSubjectSortModal, setShowSubjectSortModal] = useState(false);
  const [showBasicSettings, setShowBasicSettings] = useState(false);
  
  const [globalConfig, setGlobalConfig] = useState({
    theoryMax: 30,
    theoryMin: 1,
    practicalMax: 0,
    practicalMin: 0
  });

  const [subjectEntries, setSubjectEntries] = useState<SubjectSetupEntry[]>(() => {
    return MOCK_SUBJECTS.map(s => ({
      subjectName: s,
      groupName: '',
      includeInExam: true,
      markingType: 'Marks',
      convertToGrade: true,
      includeInTotal: true,
      gradeProfile: 'Default',
      maxTheory: 30,
      theoryMin: 1,
      maxPractical: 0,
      practicalMin: 0
    }));
  });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleGlobalConfigChange = (field: string, value: number) => {
    setGlobalConfig(prev => {
      const next = { ...prev, [field]: value };
      if (sameMarksForAll) {
        setSubjectEntries(current => current.map(s => ({
          ...s,
          maxTheory: field === 'theoryMax' ? value : s.maxTheory,
          theoryMin: field === 'theoryMin' ? value : s.theoryMin,
          maxPractical: field === 'practicalMax' ? value : s.maxPractical,
          practicalMin: field === 'practicalMin' ? value : s.practicalMin
        })));
      }
      return next;
    });
  };

  const handleSubjectChange = (index: number, field: keyof SubjectSetupEntry, value: any) => {
    setSubjectEntries(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = () => {
    setShowSuccess(true);
    createAuditLog(user, 'UPDATE', 'Exams', `Updated MaxMin Marks Setup for Class ${selectedClass}`);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const moveSubject = (index: number, direction: 'UP' | 'DOWN') => {
    const newEntries = [...subjectEntries];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newEntries.length) {
      [newEntries[index], newEntries[targetIndex]] = [newEntries[targetIndex], newEntries[index]];
      setSubjectEntries(newEntries);
    }
  };

  const brownHeaderStyle = "bg-[#9A4B23] text-white text-[10px] font-bold uppercase py-3 px-2 border border-[#8B4513]/20";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-full">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} className="text-white" />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest leading-none mb-1">Configuration Synced</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">Master matrix updated</p>
              </div>
           </div>
        </div>
      )}

      {/* Main Container - Brown theme & High Contrast Labels */}
      <div className="bg-white border-t-8 border-[#9A4B23] shadow-xl overflow-hidden rounded-b-lg">
        
        {/* Title Bar */}
        <div className="bg-[#9A4B23] py-3 text-center">
          <h1 className="text-white font-bold text-base tracking-widest uppercase">MaxMin Marks Setup</h1>
        </div>

        {/* Form Content - White Background & Black Labels */}
        <div className="p-6 space-y-6 bg-white">
          
          <div className="border border-slate-200 p-5 rounded-lg bg-white space-y-5">
            <h3 className="text-xs font-bold text-black uppercase border-b border-slate-100 pb-2 mb-4">Select Class and Exam</h3>
            <div className="flex flex-wrap items-center gap-10">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-black uppercase">Class</span>
                <select 
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-2 text-xs bg-white text-black font-bold focus:ring-1 focus:ring-[#9A4B23] outline-none w-44 shadow-sm"
                >
                  <option value="4 - Girls">4 - Girls</option>
                  <option value="5 - Girls">5 - Girls</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-black uppercase">Category</span>
                <select 
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-2 text-xs bg-white text-black font-bold focus:ring-1 focus:ring-[#9A4B23] outline-none w-44 shadow-sm"
                >
                  <option value="Default">Default</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-black uppercase">Exam</span>
                <select 
                  value={selectedExamId}
                  onChange={e => setSelectedExamId(e.target.value)}
                  className="border border-slate-300 rounded px-3 py-2 text-xs bg-white text-black font-bold focus:ring-1 focus:ring-[#9A4B23] outline-none w-64 shadow-sm"
                >
                  <option value="UT1">U.T.1</option>
                  <option value="SA1">S.A.1</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 p-5 rounded-lg bg-white flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-4 w-full md:w-auto">
              <h3 className="text-xs font-bold text-black uppercase border-b border-slate-100 pb-2 mb-4">Select Exam Type</h3>
              <div className="flex flex-col gap-4">
                <label className="flex items-center gap-4 cursor-pointer">
                  <input 
                    type="radio" 
                    name="examType" 
                    checked={examType === 'Indicator'} 
                    onChange={() => setExamType('Indicator')}
                    className="w-5 h-5 text-[#9A4B23] focus:ring-[#9A4B23]"
                  />
                  <span className="text-xs font-bold text-black uppercase">Indicator (Indicator and/or Grade will be shown in marksheet.)</span>
                </label>
                <label className="flex items-center gap-4 cursor-pointer">
                  <input 
                    type="radio" 
                    name="examType" 
                    checked={examType === 'Marks'} 
                    onChange={() => setExamType('Marks')}
                    className="w-5 h-5 text-[#9A4B23] focus:ring-[#9A4B23]"
                  />
                  <span className="text-xs font-bold text-black uppercase">Marks (Marks and/or Grade will be shown in mark sheet.)</span>
                </label>
              </div>
            </div>
            <button 
              onClick={() => setShowBasicSettings(!showBasicSettings)}
              className="bg-gradient-to-b from-[#9A4B23] to-[#8B4513] text-white px-10 py-3 rounded font-black text-xs uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            >
              <Settings size={14} /> Configure Basic Settings
            </button>
          </div>

          {showBasicSettings && (
            <div className="border border-slate-200 p-6 rounded-lg bg-slate-50 animate-in slide-in-from-top-4 duration-300">
               <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black text-[#9A4B23] uppercase">Advanced Configuration Panel</h4>
                  <button onClick={() => setShowBasicSettings(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={18} /></button>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Grace Threshold</label>
                    <input type="number" defaultValue={2} className="w-full text-sm font-bold text-black outline-none" />
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2">Rounding Method</label>
                    <select className="w-full text-xs font-bold text-black outline-none bg-transparent">
                      <option>UPWARD CEILING</option>
                      <option>STANDARD MATH</option>
                    </select>
                  </div>
               </div>
            </div>
          )}

          <div className="border border-slate-200 p-5 rounded-lg bg-white flex flex-wrap items-end gap-12">
            <div className="flex-1 min-w-[400px] space-y-5">
               <label className="flex items-center gap-4 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={sameMarksForAll}
                    onChange={e => setSameMarksForAll(e.target.checked)}
                    className="w-5 h-5 rounded text-[#9A4B23] border-slate-300 focus:ring-[#9A4B23]"
                  />
                  <span className="text-xs font-bold text-black uppercase">Select here if all the subjects have same max-min marks.</span>
               </label>
               <div className="flex items-center gap-6">
                  {[
                    { label: 'Theory Max', key: 'theoryMax' },
                    { label: 'Theory Min', key: 'theoryMin' },
                    { label: 'Practical Max', key: 'practicalMax' },
                    { label: 'Practical Min', key: 'practicalMin' }
                  ].map(field => (
                    <div key={field.key} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-black uppercase">{field.label}</span>
                      <input 
                        type="number" 
                        value={(globalConfig as any)[field.key]} 
                        onChange={e => handleGlobalConfigChange(field.key, parseInt(e.target.value) || 0)}
                        className="border border-slate-300 w-20 px-3 py-2 text-xs text-center font-bold text-black rounded shadow-inner"
                      />
                    </div>
                  ))}
               </div>
            </div>
            <div className="flex flex-col gap-5 items-end">
               <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-black uppercase">Grade Profile</span>
                  <select className="border border-slate-300 rounded px-4 py-2 text-xs bg-white text-black font-bold outline-none w-56 shadow-sm">
                    <option>--Select Profile--</option>
                    <option value="PRIMARY">PRIMARY (A-D)</option>
                    <option value="SECONDARY">SECONDARY (A1-E)</option>
                  </select>
               </div>
               <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-black uppercase">Subject Sorting</span>
                  <button 
                    onClick={() => setShowSubjectSortModal(true)}
                    className="bg-orange-700 hover:bg-orange-800 text-white w-14 py-2 rounded text-xl flex items-center justify-center font-black shadow-lg transition-all active:scale-90"
                  >
                    <MoreHorizontal size={20} />
                  </button>
               </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <span className="text-xs font-bold text-black uppercase">Assign Marks to Subjects</span>
                <div className="flex gap-6">
                  <label className="flex items-center gap-3 text-xs font-bold text-black uppercase cursor-pointer"><input type="radio" name="bulk" className="w-4 h-4 text-[#9A4B23]" /> Include All</label>
                  <label className="flex items-center gap-3 text-xs font-bold text-black uppercase cursor-pointer"><input type="radio" name="bulk" className="w-4 h-4 text-[#9A4B23]" /> Include None</label>
                </div>
              </div>
              <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                 <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">Setup Active</span>
                 <span className="text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">Practical N/A</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-inner">
               <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-center">
                      <th className={`${brownHeaderStyle} w-72 text-left px-6`}>Subject Identity</th>
                      <th className={`${brownHeaderStyle}`}>Group</th>
                      <th className={`${brownHeaderStyle}`}>Include</th>
                      <th className={`${brownHeaderStyle}`}>Type</th>
                      <th className={`${brownHeaderStyle}`}>Grade?</th>
                      <th className={`${brownHeaderStyle}`}>In Total</th>
                      <th className={`${brownHeaderStyle}`}>Profile</th>
                      <th className={`${brownHeaderStyle}`}>T-Max</th>
                      <th className={`${brownHeaderStyle}`}>T-Min</th>
                      <th className={`${brownHeaderStyle}`}>P-Max</th>
                      <th className={`${brownHeaderStyle}`}>P-Min</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectEntries.map((sub, idx) => (
                      <tr key={sub.subjectName} className="hover:bg-slate-50 transition-colors border-b border-slate-200">
                        <td className="px-6 py-4 bg-white font-bold text-xs text-[#9A4B23] uppercase border-r border-slate-100">{sub.subjectName}</td>
                        <td className="p-2"><input type="text" placeholder="General" className="w-full border border-slate-200 p-2 text-center text-xs font-bold text-black bg-white rounded" /></td>
                        <td className="p-2 text-center"><input type="checkbox" checked={sub.includeInExam} onChange={e => handleSubjectChange(idx, 'includeInExam', e.target.checked)} className="w-5 h-5 rounded text-[#9A4B23]" /></td>
                        <td className="p-2 text-center">
                          <select className="border border-slate-200 text-[10px] w-24 p-1.5 font-bold text-black rounded bg-white">
                            <option>Marks</option>
                            <option>Grade</option>
                          </select>
                        </td>
                        <td className="p-2 text-center"><input type="checkbox" checked={sub.convertToGrade} className="w-5 h-5 rounded text-[#9A4B23]" /></td>
                        <td className="p-2 text-center"><input type="checkbox" checked={sub.includeInTotal} className="w-5 h-5 rounded text-[#9A4B23]" /></td>
                        <td className="p-2 text-center"><select className="border border-slate-200 text-[10px] w-24 p-1.5 font-bold text-black rounded bg-white"><option>Default</option></select></td>
                        <td className="p-2"><input type="number" value={sub.maxTheory} onChange={e => handleSubjectChange(idx, 'maxTheory', parseInt(e.target.value) || 0)} className="w-16 border border-slate-200 p-2 text-center text-xs font-bold text-black bg-white rounded shadow-inner" /></td>
                        <td className="p-2"><input type="number" value={sub.theoryMin} onChange={e => handleSubjectChange(idx, 'theoryMin', parseInt(e.target.value) || 0)} className="w-16 border border-slate-200 p-2 text-center text-xs font-bold text-black bg-white rounded shadow-inner" /></td>
                        <td className="p-2"><input type="number" value={sub.maxPractical} onChange={e => handleSubjectChange(idx, 'maxPractical', parseInt(e.target.value) || 0)} className="w-16 border border-slate-200 p-2 text-center text-xs font-bold text-black bg-white rounded shadow-inner" /></td>
                        <td className="p-2"><input type="number" value={sub.practicalMin} onChange={e => handleSubjectChange(idx, 'practicalMin', parseInt(e.target.value) || 0)} className="w-16 border border-slate-200 p-2 text-center text-xs font-bold text-black bg-white rounded shadow-inner" /></td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>

          <div className="flex justify-end pt-6 gap-6">
             <button onClick={handleSave} className="bg-gradient-to-b from-[#9A4B23] to-[#8B4513] text-white px-16 py-4 rounded-xl font-black uppercase text-sm shadow-2xl hover:scale-105 transition-all flex items-center gap-3">
                <Save size={20} strokeWidth={3} /> Synchronize Matrix
             </button>
          </div>
        </div>
      </div>

      {showSubjectSortModal && (
        <div className="fixed inset-0 z-[600] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 overflow-hidden border-t-8 border-[#9A4B23]">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black text-black uppercase tracking-tight">Priority Reordering</h3>
                 <button onClick={() => setShowSubjectSortModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24} /></button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                 {subjectEntries.map((sub, idx) => (
                    <div key={sub.subjectName} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#9A4B23] transition-all">
                       <span className="text-xs font-black text-black uppercase tracking-widest">{sub.subjectName}</span>
                       <div className="flex gap-1">
                          <button onClick={() => moveSubject(idx, 'UP')} disabled={idx === 0} className="p-2 text-slate-400 hover:text-[#9A4B23] disabled:opacity-0 transition-all"><ArrowUp size={18} /></button>
                          <button onClick={() => moveSubject(idx, 'DOWN')} disabled={idx === subjectEntries.length - 1} className="p-2 text-slate-400 hover:text-[#9A4B23] disabled:opacity-0 transition-all"><ArrowDown size={18} /></button>
                       </div>
                    </div>
                 ))}
              </div>
              <button 
                onClick={() => setShowSubjectSortModal(false)}
                className="w-full mt-8 py-4 bg-[#9A4B23] text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl hover:bg-orange-800 transition-all"
              >
                Apply Custom Sequence
              </button>
           </div>
        </div>
      )}

      <div className="flex items-center gap-4 p-8 bg-orange-50/30 rounded-[2.5rem] border-2 border-dashed border-[#9A4B23]/20">
         <div className="w-12 h-12 bg-[#9A4B23] text-white rounded-xl flex items-center justify-center shadow-lg"><Info size={24} /></div>
         <div className="flex-1">
            <p className="text-xs font-black text-[#9A4B23] uppercase tracking-widest mb-1">Matrix Calibration Policy</p>
            <p className="text-[10px] font-bold text-orange-900/60 uppercase leading-relaxed tracking-wider">
              Establish global theory/practical thresholds. Use "Indicator" mode for grade-only marksheets. White contrast mode enabled for high-fidelity data entry.
            </p>
         </div>
      </div>
    </div>
  );
};

export default MarksSetup;