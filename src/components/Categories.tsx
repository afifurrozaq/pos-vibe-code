import React, { useState } from 'react';
import { Plus, Settings, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Category } from '../types';
import { api } from '../services/api';

interface CategoriesProps {
  categories: Category[];
  onRefresh: () => void;
  isOnline: boolean;
  onOfflineAction: (type: 'category', data: any) => void;
}

export const Categories: React.FC<CategoriesProps> = ({ categories, onRefresh, isOnline, onOfflineAction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      onOfflineAction('category', editingCategory);
      setIsModalOpen(false);
      setEditingCategory(null);
      return;
    }

    try {
      await api.saveCategory(editingCategory!);
      setIsModalOpen(false);
      setEditingCategory(null);
      onRefresh();
    } catch (err: any) {
      if (err.type === 'conflict') {
        if (confirm(`Conflict: This category was updated by another device. Overwrite with your changes?`)) {
          await api.saveCategory({ ...editingCategory, updated_at: Math.floor(Date.now() / 1000) });
          setIsModalOpen(false);
          setEditingCategory(null);
          onRefresh();
        }
      } else {
        alert(err.message || 'Operation failed');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this category? This will fail if products are linked.')) {
      try {
        await api.deleteCategory(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Category Management</h1>
          <p className="text-zinc-500 mt-1">Organize your products into groups</p>
        </div>
        <button 
          onClick={() => { setEditingCategory({ name: '' }); setIsModalOpen(true); }}
          className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-colors"
        >
          <Plus size={20} />
          Add Category
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Category Name</th>
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {categories.map(category => (
              <tr key={category.id} className="hover:bg-zinc-50 transition-colors">
                <td className="p-4 font-bold text-zinc-900">{category.name}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => { setEditingCategory(category); setIsModalOpen(true); }}
                      className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-zinc-900">{editingCategory?.id ? 'Edit Category' : 'Add New Category'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Category Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editingCategory?.name || ''}
                    onChange={e => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <button type="submit" className="w-full bg-zinc-900 text-white font-bold py-4 rounded-2xl mt-4 hover:bg-zinc-800 transition-all">
                  {editingCategory?.id ? 'Save Changes' : 'Create Category'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
