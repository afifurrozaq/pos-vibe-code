import React, { useState } from 'react';
import { Search, Plus, Settings, Trash2, X, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category } from '../types';
import { api } from '../services/api';

interface InventoryProps {
  products: Product[];
  categories: Category[];
  onRefresh: () => void;
  isOnline: boolean;
  onOfflineAction: (type: 'product', data: any) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ products, categories, onRefresh, isOnline, onOfflineAction }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    
    const totalStock = p.variants && p.variants.length > 0 
      ? p.variants.reduce((sum, v) => sum + v.stock, 0)
      : p.stock;
      
    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = totalStock > 0 && totalStock < 10;
    if (stockFilter === 'out') matchesStock = totalStock <= 0;
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct(prev => ({ ...prev, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addVariant = () => {
    setEditingProduct(prev => ({
      ...prev,
      variants: [...(prev?.variants || []), { id: Date.now(), product_id: prev?.id || 0, name: '', stock: 0, price_adjustment: 0 }]
    }));
  };

  const updateVariant = (index: number, field: string, value: any) => {
    setEditingProduct(prev => {
      const newVariants = [...(prev?.variants || [])];
      newVariants[index] = { ...newVariants[index], [field]: value };
      return { ...prev, variants: newVariants };
    });
  };

  const removeVariant = (index: number) => {
    setEditingProduct(prev => ({
      ...prev,
      variants: (prev?.variants || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...editingProduct,
      image_url: editingProduct?.image_url || `https://picsum.photos/seed/${Math.random()}/400/400`
    };

    if (!isOnline) {
      onOfflineAction('product', payload);
      setIsModalOpen(false);
      setEditingProduct(null);
      return;
    }

    try {
      await api.saveProduct(payload);
      setIsModalOpen(false);
      setEditingProduct(null);
      onRefresh();
    } catch (err: any) {
      if (err.type === 'conflict') {
        if (confirm(`Conflict: This product was updated by another device. Overwrite with your changes?`)) {
          await api.saveProduct({ ...payload, updated_at: Math.floor(Date.now() / 1000) });
          setIsModalOpen(false);
          setEditingProduct(null);
          onRefresh();
        }
      } else {
        alert(err.message || 'Operation failed');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await api.deleteProduct(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Inventory Management</h1>
          <p className="text-zinc-500 mt-1">Manage your products and stock levels</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search inventory..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select 
            className="px-4 py-2 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
          >
            <option value="all">All Stock Levels</option>
            <option value="low">Low Stock (&lt;10)</option>
            <option value="out">Out of Stock</option>
          </select>
          <button 
            onClick={() => { setEditingProduct({ name: '', price: 0, stock: 0, category_id: categories[0]?.id }); setIsModalOpen(true); }}
            className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-colors whitespace-nowrap"
          >
            <Plus size={20} />
            Add Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Product</th>
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Category</th>
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Price</th>
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Stock</th>
              <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredProducts.map(product => (
              <tr key={product.id} className="hover:bg-zinc-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-100 rounded-lg overflow-hidden">
                      <img src={product.image_url || `https://picsum.photos/seed/${product.id}/100/100`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 block">{product.name}</span>
                      {product.variants && product.variants.length > 0 && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          {product.variants.length} Variants
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="bg-zinc-100 text-zinc-600 text-xs font-bold px-2 py-1 rounded-md">{product.category_name}</span>
                </td>
                <td className="p-4 font-bold text-zinc-900">${product.price.toFixed(2)}</td>
                <td className="p-4">
                  {product.variants && product.variants.length > 0 ? (
                    <div className="space-y-1">
                      {(() => {
                        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                        return (
                          <span className={`text-xs font-bold block ${totalStock <= 0 ? 'text-red-600' : totalStock < 10 ? 'text-amber-600' : 'text-zinc-500'}`}>
                            Total: {totalStock} units
                          </span>
                        );
                      })()}
                      <div className="flex flex-wrap gap-1">
                        {product.variants.slice(0, 2).map(v => (
                          <span key={v.id} className={`text-[10px] px-1 rounded font-medium ${v.stock <= 0 ? 'bg-red-50 text-red-600' : v.stock < 5 ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-500'}`}>
                            {v.name}: {v.stock}
                          </span>
                        ))}
                        {product.variants.length > 2 && <span className="text-[10px] text-zinc-400">+{product.variants.length - 2} more</span>}
                      </div>
                    </div>
                  ) : (
                    <span className={`font-bold ${product.stock <= 0 ? 'text-red-600' : product.stock < 10 ? 'text-amber-600' : 'text-zinc-900'}`}>
                      {product.stock} units
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                      className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
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

      {/* Modal */}
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
                <h3 className="text-xl font-bold text-zinc-900">{editingProduct?.id ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Product Image</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-zinc-100 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-200">
                      {editingProduct?.image_url ? (
                        <img src={editingProduct.image_url} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          <Package size={24} />
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                      onChange={handleImageChange}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Product Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editingProduct?.name || ''}
                    onChange={e => setEditingProduct(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Price ($)</label>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      value={editingProduct?.price || ''}
                      onChange={e => setEditingProduct(prev => ({ ...prev, price: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Stock</label>
                    <input 
                      required
                      type="number" 
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      value={editingProduct?.stock || ''}
                      onChange={e => setEditingProduct(prev => ({ ...prev, stock: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Category</label>
                  <select 
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    value={editingProduct?.category_id || ''}
                    onChange={e => setEditingProduct(prev => ({ ...prev, category_id: Number(e.target.value) }))}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">Product Variants</label>
                    <button 
                      type="button"
                      onClick={addVariant}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Variant
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {editingProduct?.variants?.map((variant, index) => (
                      <div key={variant.id} className="flex items-center gap-2 bg-zinc-50 p-2 rounded-xl border border-zinc-200">
                        <input 
                          type="text" 
                          placeholder="Name (e.g. XL, Red)"
                          className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium"
                          value={variant.name}
                          onChange={e => updateVariant(index, 'name', e.target.value)}
                        />
                        <input 
                          type="number" 
                          placeholder="Stock"
                          className="w-16 bg-transparent outline-none text-sm font-medium text-center"
                          value={variant.stock}
                          onChange={e => updateVariant(index, 'stock', Number(e.target.value))}
                        />
                        <button 
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="text-zinc-400 hover:text-red-600 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {(!editingProduct?.variants || editingProduct.variants.length === 0) && (
                      <p className="text-xs text-zinc-400 italic text-center py-2">No variants added</p>
                    )}
                  </div>
                </div>

                <button type="submit" className="w-full bg-zinc-900 text-white font-bold py-4 rounded-2xl mt-4 hover:bg-zinc-800 transition-all">
                  {editingProduct?.id ? 'Save Changes' : 'Create Product'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
