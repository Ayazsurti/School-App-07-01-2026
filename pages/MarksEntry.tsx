import React, { useState, useMemo, useEffect } from 'react';
import { User, Exam, Student } from '../types';
import { 
  Save, 
  Search, 
  Plus, 
  CheckCircle2, 
  X, 
  Users, 
  BookOpen, 
  Download,
  CalendarRange,
  ArrowUpDown
} from 'lucide-react';
import { MOCK_STUDENTS, MOCK_SUBJECTS } from '../constants';

interface MarksEntryProps {
  user: User;
}

const MarksEntry: React.FC<MarksEntryProps> = ({ user }) => {
  const [selectedClass, setSelectedClass] = useState('4 - Girls');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedCategory, setSelectedCategory] = useState('Default');
  const [selectedExam, setSelectedExam] = useState('SA-1');
  
  const [includeLeftStudents, setIncludeLeftStudents] = useState(false);
  const [isSyncMarksEntry, setIsSyncMarksEntry] = useState(true);

  const [activeSubjects, setActiveSubjects] = useState<string[]>([]);
  const [subjectToAdd, setSubjectToAdd] = useState('');
  const [marks, setMarks] = useState<Record<string, Record<string, string>>>({});
  
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const students = useMemo(() => {
    const saved = localStorage.getItem('school_students_db');
    return saved ? JSON.parse(saved) as Student[] : MOCK_STUDENTS as any as Student[];
  }, []);

  const addSubjectColumn = () => {
    if (subjectToAdd && !activeSubjects.includes(subjectToAdd)) {
      setActiveSubjects(prev => [...prev, subjectToAdd]);
      setSubjectToAdd('');
    }
  };

  const removeSubjectColumn = (sub: string) => {
    setActiveSubjects(prev => prev.filter(s => s !== sub));
  };

  const handleMarkChange = (studentId: string, subjectName: string, value: string) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectName]: value
      }
    }));
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  const tableHeaderStyle = "bg-[#9A4B23] text-white text-[11px] font-bold uppercase tracking-tight py-4 px-4 border border-[#8B4513]/30";

  return (
    <div className="min-h-full space-y-4 animate-in fade-in duration-500 pb-20 relative max-w-full">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <CheckCircle2 size={24} className="text-white" />
              <div>
                 <p className="font-black text-xs uppercase tracking-widest leading-none mb-1">Matrix Synced</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">Grades successfully recorded</p>
              </div>
           </div>
        </div>
      )}

      {/* Control Panel - Styled for School Admin Usage */}
      <div className="bg-[#F0F8FF] p-6 rounded-2xl border border-slate-200 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-black uppercase">Class</span>
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-white border border-slate-300 rounded px-3 py-2 text-xs font-bold text-black focus:ring-1 focus:ring-[#9A4B23] outline-none w-40"
            >
              <option value="4 - Girls">4 - Girls</option>
              <option value="5 - Girls">5 - Girls</option>
              <option value="6 - Boys">6 - Boys</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-black uppercase">Section</span>
            <select 
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="bg-white border border-slate-300 rounded px-3 py-2 text-xs font-bold text-black focus:ring-1 focus:ring-[#9A4B23] outline-none w-24"
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-black uppercase">Category</span>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded px-3 py-2 text-xs font-bold text-black focus:ring-1 focus:ring-[#9A4B23] outline-none w-40"
            >
              <option value="Default">Default</option>
              <option value="Academic">Academic</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-black uppercase">Exam</span>
            <select 
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="bg-white border border-slate-300 rounded px-3 py-2 text-xs font-bold text-black focus:ring-1 focus:ring-[#9A4B23] outline-none w-48"
            >
              <option value="SA-1">SA-1</option>
              <option value="UT-1">UT-1</option>
              <option value="TERM-2">TERM-2</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-8 py-2 border-t border-slate-200/50">
           <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={includeLeftStudents}
                onChange={e => setIncludeLeftStudents(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-[#9A4B23] focus:ring-[#9A4B23]"
              />
              <span className="text-xs font-bold text-black uppercase">Include Left Students</span>
           </label>
           <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isSyncMarksEntry}
                onChange={e => setIsSyncMarksEntry(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-[#9A4B23] focus:ring-[#9A4B23]"
              />
              <span className="text-xs font-bold text-black uppercase">Is Sync Marks Entry</span>
           </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 pt-2 border-t border-slate-200/50">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-black uppercase">Add Subject Column</span>
            <div className="flex items-center gap-2">
              <select 
                value={subjectToAdd}
                onChange={e => setSubjectToAdd(e.target.value)}
                className="bg-white border border-slate-300 rounded px-3 py-2 text-xs font-bold text-black focus:ring-1 focus:ring-[#9A4B23] outline-none w-48"
              >
                <option value="">-- Select Subject --</option>
                {MOCK_SUBJECTS.map(s => (
                  <option key={s} value={s} disabled={activeSubjects.includes(s)}>{s}</option>
                ))}
              </select>
              <button 
                onClick={addSubjectColumn}
                className="p-2 bg-[#9A4B23] text-white rounded hover:opacity-90 transition-all shadow-md"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-[10px] font-black rounded uppercase shadow-md transition-all flex items-center gap-2">
               <Download size={14} /> Download Marksheet
             </button>
             <button className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-[10px] font-black rounded uppercase shadow-md transition-all flex items-center gap-2">
               <CalendarRange size={14} /> Add/Edit Leave
             </button>
             <button className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-[10px] font-black rounded uppercase shadow-md transition-all flex items-center gap-2">
               <ArrowUpDown size={14} /> Subject Sorting
             </button>
             <button 
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded uppercase shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                Save All
             </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-2">
        <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">CLICK</span>
        <span className="bg-orange-500 text-white w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold shadow-sm">P</span>
        <span className="text-[11px] font-bold text-slate-500">- Pending Entries</span>
      </div>

      <div className="px-1 text-slate-600 font-bold text-xs uppercase tracking-tight">
        Marks Entry [{selectedExam}]
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xl bg-white custom-scrollbar">
        <table className="w-full border-collapse min-w-[1200px]">
          <thead>
            <tr>
              <th className={`${tableHeaderStyle} sticky left-0 z-30 w-32`}>GR.No.</th>
              <th className={`${tableHeaderStyle} sticky left-32 z-30 w-28 border-l-0`}>Roll No.</th>
              <th className={`${tableHeaderStyle} sticky left-60 z-30 w-80 border-l-0 text-left`}>Student Name</th>
              
              {activeSubjects.map((subject) => (
                <th key={subject} className={`${tableHeaderStyle} text-center min-w-[140px] relative group`}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="truncate max-w-[120px]">{subject}</span>
                    <button 
                      onClick={() => removeSubjectColumn(subject)}
                      className="opacity-0 group-hover:opacity-100 p-1 bg-white/20 hover:bg-white/40 rounded transition-all"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </th>
              ))}

              {activeSubjects.length === 0 && (
                <th className={`${tableHeaderStyle} text-center italic opacity-50`}>
                  Please add subjects to begin entry
                </th>
              )}
              
              <th className={`${tableHeaderStyle} text-right w-28`}>Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map(student => {
              let rowTotal = 0;
              return (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-5 sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-100 font-bold text-xs text-slate-400">
                    {student.grNumber}
                  </td>
                  <td className="px-4 py-5 sticky left-32 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-100 font-bold text-xs text-slate-400">
                    {student.rollNo}
                  </td>
                  <td className="px-4 py-5 sticky left-60 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-100">
                    <p className="font-bold text-slate-800 text-xs uppercase truncate">{student.fullName || student.name}</p>
                  </td>
                  
                  {activeSubjects.map(subject => {
                    const val = marks[student.id]?.[subject] || '';
                    rowTotal += parseInt(val) || 0;

                    return (
                      <td key={subject} className="px-3 py-4 border-r border-slate-50">
                        <div className="relative group/input">
                          <input 
                            type="number" 
                            value={val}
                            onChange={(e) => handleMarkChange(student.id, subject, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-center font-black text-slate-800 focus:ring-2 focus:ring-[#9A4B23] focus:bg-white outline-none text-xs transition-all shadow-inner"
                            placeholder="0"
                          />
                          {val === '' && (
                            <div className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none">
                              <span className="text-[10px] font-black text-orange-400 opacity-40 group-focus-within/input:opacity-0 transition-opacity">P</span>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {activeSubjects.length === 0 && (
                    <td className="px-4 py-5 text-center text-slate-200 italic text-xs">---</td>
                  )}
                  
                  <td className="px-6 py-5 text-right">
                     <span className="text-sm font-black text-slate-900 tracking-tighter">
                       {rowTotal}
                     </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center gap-5 p-8 bg-orange-50/30 rounded-[2.5rem] border-2 border-dashed border-[#9A4B23]/20">
         <div className="w-12 h-12 bg-[#9A4B23] text-white rounded-xl flex items-center justify-center shadow-lg"><BookOpen size={24} /></div>
         <div className="flex-1">
            <p className="text-xs font-black text-[#9A4B23] uppercase tracking-widest mb-1">Matrix Documentation</p>
            <p className="text-[10px] font-bold text-orange-900/60 uppercase leading-relaxed tracking-wider">
              Dynamic Subject Addition enabled. Horizontal totals update in real-time per student identity. Ensure synchronization after batch entry.
            </p>
         </div>
      </div>
    </div>
  );
};

export default MarksEntry;