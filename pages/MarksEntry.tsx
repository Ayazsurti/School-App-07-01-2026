
import React, { useState, useMemo, useEffect } from 'react';
import { User, Student } from '../types';
import { db, supabase } from '../supabase';
import { 
  Save, CheckCircle2, Loader2, BookOpen, Plus, X
} from 'lucide-react';
import { MOCK_STUDENTS, MOCK_SUBJECTS } from '../constants';

interface MarksEntryProps { user: User; }

const MarksEntry: React.FC<MarksEntryProps> = ({ user }) => {
  const [selectedClass, setSelectedClass] = useState('4 - Girls');
  const [selectedExam, setSelectedExam] = useState('SA-1');
  const [activeSubjects, setActiveSubjects] = useState<string[]>(['Mathematics', 'Science']);
  const [marks, setMarks] = useState<Record<string, Record<string, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchCloudMarks = async () => {
    try {
      const data = await db.marks.getByExam(selectedExam);
      const mapped: any = {};
      data.forEach((r: any) => {
        if (!mapped[r.student_id]) mapped[r.student_id] = {};
        mapped[r.student_id][r.subject] = r.total_marks.toString();
      });
      setMarks(mapped);
    } catch (err) { console.error("Marks Sync Error:", err); }
  };

  useEffect(() => {
    fetchCloudMarks();
    const channel = supabase.channel('realtime-marks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marks' }, () => fetchCloudMarks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedExam]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const records: any[] = [];
      Object.entries(marks).forEach(([studentId, subjects]) => {
        Object.entries(subjects).forEach(([subject, totalMarks]) => {
          records.push({
            student_id: studentId,
            exam_id: selectedExam,
            subject: subject,
            total_marks: parseInt(totalMarks) || 0
          });
        });
      });
      await db.marks.upsertMarks(records);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert("Failed to save marks to cloud."); }
    finally { setIsSaving(false); }
  };

  const handleMarkChange = (studentId: string, subject: string, value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [subject]: value }
    }));
  };

  const students = useMemo(() => (MOCK_STUDENTS as any as Student[]), []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-full">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} strokeWidth={3} />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest">Marks Matrix Synced</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Cloud Database Updated</p>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white border-t-8 border-[#9A4B23] shadow-xl overflow-hidden rounded-b-lg p-10">
        <div className="flex items-center justify-between mb-8">
           <h1 className="text-2xl font-black text-[#9A4B23] uppercase">Cloud Academic Matrix</h1>
           <button onClick={handleSaveAll} disabled={isSaving} className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl flex items-center gap-3 shadow-xl uppercase text-xs">
             {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} Sync All Marks
           </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white custom-scrollbar">
           <table className="w-full min-w-[1000px]">
              <thead className="bg-[#9A4B23] text-white">
                 <tr>
                    <th className="px-6 py-4 text-left uppercase text-[10px] font-black">Student Profile</th>
                    {activeSubjects.map(s => <th key={s} className="px-6 py-4 text-center uppercase text-[10px] font-black">{s}</th>)}
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {students.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-5">
                          <p className="font-black text-slate-800 text-sm uppercase">{s.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">GR: {s.grNumber}</p>
                       </td>
                       {activeSubjects.map(sub => (
                          <td key={sub} className="px-4 py-5">
                             <input type="number" value={marks[s.id]?.[sub] || ''} onChange={e => handleMarkChange(s.id, sub, e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 text-center font-black text-slate-800 focus:ring-2 focus:ring-[#9A4B23] outline-none" placeholder="0" />
                          </td>
                       ))}
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default MarksEntry;
