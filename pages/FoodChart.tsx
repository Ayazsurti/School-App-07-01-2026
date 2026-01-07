import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { createAuditLog } from '../utils/auditLogger';
import { 
  UtensilsCrossed, 
  Plus, 
  Save, 
  CheckCircle2, 
  X, 
  Trash2, 
  Edit2,
  ChefHat,
  Printer,
  AlertTriangle,
  Banknote,
  ShieldCheck,
  Info
} from 'lucide-react';
import { APP_NAME } from '../constants';

interface FoodItem {
  id: string;
  name: string;
  type: 'Breakfast' | 'Lunch' | 'Snack';
  description: string;
  price: number;
}

interface DailyMenu {
  day: string;
  items: FoodItem[];
}

interface FoodChartProps {
  user: User;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const FoodChart: React.FC<FoodChartProps> = ({ user }) => {
  const [menu, setMenu] = useState<DailyMenu[]>(() => {
    const saved = localStorage.getItem('school_food_chart_v1');
    if (saved) return JSON.parse(saved);
    return DAYS.map(day => ({
      day,
      items: [
        { id: Math.random().toString(36).substr(2, 9), type: 'Breakfast', name: 'Standard Nutri-Pack', description: 'Fresh seasonal fruits and protein-rich oats.', price: 40 },
        { id: Math.random().toString(36).substr(2, 9), type: 'Lunch', name: 'Institutional Meal A', description: 'Balanced meal with legumes, rice, and fresh vegetables.', price: 80 }
      ]
    }));
  });

  const [showModal, setShowModal] = useState(false);
  const [activeDay, setActiveDay] = useState<string>('Monday');
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{day: string, item: FoodItem} | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<boolean>(false);
  
  const [newItem, setNewItem] = useState<{name: string, type: 'Breakfast' | 'Lunch' | 'Snack', description: string, price: number}>({
    name: '', type: 'Breakfast', description: '', price: 0
  });
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    localStorage.setItem('school_food_chart_v1', JSON.stringify(menu));
  }, [menu]);

  const handleOpenAdd = (day: string) => {
    setActiveDay(day);
    setEditingItem(null);
    setNewItem({ name: '', type: 'Breakfast', description: '', price: 0 });
    setSaveConfirm(false);
    setShowModal(true);
  };

  const handleOpenEdit = (day: string, item: FoodItem) => {
    setActiveDay(day);
    setEditingItem(item);
    setNewItem({ 
      name: item.name, 
      type: item.type, 
      description: item.description, 
      price: item.price 
    });
    setSaveConfirm(false);
    setShowModal(true);
  };

  const initiateSave = () => {
    if (!newItem.name) return;
    setSaveConfirm(true);
  };

  const handleFinalSave = () => {
    if (editingItem) {
      setMenu(prev => prev.map(d => d.day === activeDay ? {
        ...d,
        items: d.items.map(i => i.id === editingItem.id ? { ...editingItem, ...newItem } : i)
      } : d));
      createAuditLog(user, 'UPDATE', 'Catering', `Modified ${activeDay} menu item: ${newItem.name}`);
      setSuccessMsg('Menu Item Modified');
    } else {
      const item: FoodItem = {
        id: Math.random().toString(36).substr(2, 9),
        ...newItem
      };
      setMenu(prev => prev.map(d => d.day === activeDay ? { ...d, items: [...d.items, item] } : d));
      createAuditLog(user, 'CREATE', 'Catering', `Added ${item.name} to ${activeDay} menu`);
      setSuccessMsg('New Item Published');
    }

    setShowModal(false);
    setSaveConfirm(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const { day, item } = deleteConfirm;
    setMenu(prev => prev.map(d => d.day === day ? { ...d, items: d.items.filter(i => i.id !== item.id) } : d));
    createAuditLog(user, 'DELETE', 'Catering', `Purged ${item.name} from ${day} menu`);
    setDeleteConfirm(null);
    setShowModal(false);
    setSuccessMsg('Item Purged Successfully');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER';

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500 relative">
      {showSuccess && (
        <div className="fixed top-24 right-8 z-[1000] animate-in slide-in-from-right-8 duration-500">
           <div className="bg-emerald-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl shadow-emerald-200/50 flex items-center gap-4 border border-emerald-500/50 backdrop-blur-xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                 <CheckCircle2 size={24} strokeWidth={3} className="text-white" />
              </div>
              <div>
                 <p className="font-black text-xs uppercase tracking-[0.2em]">Transaction Verified</p>
                 <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mt-0.5">{successMsg}</p>
              </div>
           </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-sm w-full shadow-2xl animate-in zoom-in-95 text-center border border-slate-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[2rem] flex items-center justify-center mb-6 mx-auto border border-rose-100 dark:border-rose-900/50 shadow-inner">
                 <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Permanently Delete?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                 Are you sure you want to erase <b>{deleteConfirm.item.name}</b> from the roster?
              </p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors uppercase text-[10px] tracking-widest">Cancel</button>
                 <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest">Confirm Delete</button>
              </div>
           </div>
        </div>
      )}

      {saveConfirm && (
        <div className="fixed inset-0 z-[750] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 max-sm w-full shadow-2xl animate-in zoom-in-95 text-center border-t-8 border-indigo-600 dark:border-slate-800">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-[2rem] flex items-center justify-center mb-6 mx-auto border border-indigo-100 dark:border-indigo-900/50 shadow-inner">
                 <ShieldCheck size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Confirm Entry?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
                Verify details for <b>{newItem.name}</b> on {activeDay}.
              </p>
              <div className="flex gap-3">
                 <button onClick={() => setSaveConfirm(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors uppercase text-[10px] tracking-widest">Go Back</button>
                 <button onClick={handleFinalSave} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest">Verify & Sync</button>
              </div>
           </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">Institutional Food Chart</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Weekly nutritional plan and daily menu registry for campus catering.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => window.print()} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 rounded-2xl hover:text-indigo-600 shadow-sm transition-all" title="Print Chart">
            <Printer size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {menu.map((dayMenu) => (
          <div key={dayMenu.day} className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all flex flex-col group">
             <div className="p-8 pb-6 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all border border-slate-100 dark:border-slate-700">
                      <ChefHat size={24} />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{dayMenu.day}</h3>
                </div>
                {canManage && (
                  <button 
                    onClick={() => handleOpenAdd(dayMenu.day)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-indigo-700 transition-all shadow-lg"
                  >
                    <Plus size={16} strokeWidth={3} /> Add
                  </button>
                )}
             </div>

             <div className="p-8 space-y-4 flex-1">
                {dayMenu.items.map((item) => (
                  <div key={item.id} className="bg-slate-50/50 dark:bg-slate-800/30 rounded-[2rem] border border-slate-100 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all overflow-hidden flex flex-col shadow-sm">
                     <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                               item.type === 'Breakfast' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' :
                               item.type === 'Lunch' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' :
                               'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                             }`}>
                               {item.type}
                             </span>
                             <span className="px-3 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-[9px] font-black shadow-sm border border-slate-100 dark:border-slate-600">
                                ₹{item.price}
                             </span>
                           </div>
                        </div>
                        <h4 className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">{item.name}</h4>
                        {item.description && <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed mt-1 line-clamp-2">{item.description}</p>}
                     </div>

                     {canManage && (
                       <div className="px-6 py-4 bg-slate-100/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                          <button 
                            onClick={() => handleOpenEdit(dayMenu.day, item)}
                            className="flex-1 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-300 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            <Edit2 size={12} /> Modify
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({ day: dayMenu.day, item })}
                            className="flex-1 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                       </div>
                     )}
                  </div>
                ))}

                {dayMenu.items.length === 0 && (
                   <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] bg-slate-50/20">
                      <UtensilsCrossed size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                      <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">No entries scheduled</p>
                   </div>
                )}
             </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl max-w-md w-full animate-in zoom-in-95 overflow-hidden border border-slate-100 dark:border-slate-800">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                 <div>
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{editingItem ? 'Edit Entry' : `New ${activeDay} Item`}</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Catering Control Panel</p>
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-all shadow-sm"><X size={24} /></button>
              </div>

              <div className="p-10 space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Dish Name</label>
                    <input 
                      type="text" 
                      value={newItem.name}
                      onChange={e => setNewItem({...newItem, name: e.target.value})}
                      placeholder="e.g., Vegetable Pulao"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Meal Type</label>
                        <select 
                          value={newItem.type}
                          onChange={e => setNewItem({...newItem, type: e.target.value as any})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                        >
                           <option value="Breakfast">Breakfast</option>
                           <option value="Lunch">Lunch</option>
                           <option value="Snack">Snack</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Price (₹)</label>
                        <div className="relative">
                           <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                           <input 
                            type="number" 
                            value={newItem.price || ''}
                            onChange={e => setNewItem({...newItem, price: parseInt(e.target.value) || 0})}
                            placeholder="0"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                           />
                        </div>
                    </div>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Instructions / Description</label>
                    <textarea 
                      rows={3}
                      value={newItem.description}
                      onChange={e => setNewItem({...newItem, description: e.target.value})}
                      placeholder="Add specific notes or nutritional info..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-medium text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-inner"
                    />
                 </div>

                 <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    {editingItem ? (
                      <button 
                        type="button"
                        onClick={() => setDeleteConfirm({ day: activeDay, item: editingItem })}
                        className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 transition-all shadow-sm"
                        title="Delete this item"
                      >
                        <Trash2 size={20} />
                      </button>
                    ) : (
                      <button onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-200 transition-colors uppercase text-[10px] tracking-widest">Discard</button>
                    )}
                    
                    <button onClick={initiateSave} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20 flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all">
                       <Save size={18} /> {editingItem ? 'Sync Changes' : 'Publish to Menu'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FoodChart;