import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  History, 
  Settings, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, CartItem, Stats, Sale, ProductVariant } from './types';

// Components
const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const menuItems = [
    { id: 'pos', icon: ShoppingCart, label: 'POS Terminal' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'inventory', icon: Package, label: 'Inventory' },
  ];

  return (
    <div className="w-20 lg:w-64 bg-zinc-950 text-zinc-400 flex flex-col border-r border-zinc-800 h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">N</div>
        <span className="hidden lg:block text-white font-bold text-xl tracking-tight">Nexus POS</span>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id 
                ? 'bg-emerald-500/10 text-emerald-500' 
                : 'hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <item.icon size={22} />
            <span className="hidden lg:block font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-zinc-800">
        <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 transition-colors">
          <Settings size={22} />
          <span className="hidden lg:block font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
};

const Dashboard = ({ stats }: { stats: Stats | null }) => {
  if (!stats) return <div className="p-8">Loading stats...</div>;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Business Overview</h1>
        <p className="text-zinc-500 mt-1">Real-time performance metrics</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12.5%</span>
          </div>
          <p className="text-sm font-medium text-zinc-500">Total Revenue</p>
          <p className="text-3xl font-bold text-zinc-900 mt-1">${stats.revenue.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-zinc-500">Total Transactions</p>
          <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.salesCount}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-zinc-500">Low Stock Items</p>
          <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.lowStockCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="font-bold text-zinc-900">Recent Transactions</h2>
          <button className="text-sm text-emerald-600 font-semibold hover:underline">View All</button>
        </div>
        <div className="divide-y divide-zinc-100">
          {stats.recentSales.map((sale) => (
            <div key={sale.id} className="p-4 hover:bg-zinc-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500">
                  <History size={20} />
                </div>
                <div>
                  <p className="font-semibold text-zinc-900">Sale #{sale.id}</p>
                  <p className="text-xs text-zinc-500">{new Date(sale.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-zinc-900">${sale.total_amount.toFixed(2)}</p>
                <p className="text-xs text-zinc-500">{sale.item_count} items</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const POSTerminal = ({ products, categories, onCheckout }: { 
  products: Product[], 
  categories: Category[],
  onCheckout: (items: CartItem[], total: number) => Promise<void>
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState(0); // Percentage
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);

  const discountCodes: Record<string, number> = {
    'SAVE10': 10,
    'WELCOME20': 20,
    'NEXUS50': 50
  };

  const applyDiscount = () => {
    const code = discountCode.toUpperCase().trim();
    if (discountCodes[code]) {
      setDiscount(discountCodes[code]);
      setDiscountCode('');
    } else {
      alert('Invalid discount code');
    }
  };

  const filteredProducts = products.filter(p => 
    (selectedCategory === null || p.category_id === selectedCategory) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product, variant?: ProductVariant) => {
    if (variant) {
      if (variant.stock <= 0) return;
    } else if (product.stock <= 0) {
      return;
    }

    setCart(prev => {
      const cartKey = variant ? `${product.id}-${variant.id}` : `${product.id}`;
      const existing = prev.find(item => {
        const itemKey = item.selected_variant_id ? `${item.id}-${item.selected_variant_id}` : `${item.id}`;
        return itemKey === cartKey;
      });

      if (existing) {
        return prev.map(item => {
          const itemKey = item.selected_variant_id ? `${item.id}-${item.selected_variant_id}` : `${item.id}`;
          return itemKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item;
        });
      }

      return [...prev, { 
        ...product, 
        quantity: 1, 
        selected_variant_id: variant?.id, 
        selected_variant_name: variant?.name,
        price: product.price + (variant?.price_adjustment || 0)
      }];
    });
    setVariantPickerProduct(null);
  };

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setVariantPickerProduct(product);
    } else {
      addToCart(product);
    }
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discount / 100);
  const totalAfterDiscount = subtotal - discountAmount;
  const tax = totalAfterDiscount * 0.08;
  const grandTotal = totalAfterDiscount + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    await onCheckout(cart, grandTotal);
    setCart([]);
    setDiscount(0);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Products Area */}
      <div className="flex-1 flex flex-col bg-zinc-50 p-6 overflow-hidden">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            onChange={(e) => setSelectedCategory(e.target.value === 'all' ? null : Number(e.target.value))}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <motion.button
                layout
                key={product.id}
                onClick={() => handleProductClick(product)}
                disabled={product.stock <= 0 && (!product.variants || product.variants.length === 0)}
                className={`group bg-white p-4 rounded-2xl border border-zinc-200 text-left transition-all hover:shadow-md hover:border-emerald-500/50 relative ${product.stock <= 0 && (!product.variants || product.variants.length === 0) ? 'opacity-50 grayscale' : ''}`}
              >
                <div className="aspect-square bg-zinc-100 rounded-xl mb-3 overflow-hidden">
                  <img 
                    src={product.image_url || `https://picsum.photos/seed/${product.id}/300/300`} 
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">{product.category_name}</p>
                <h3 className="font-bold text-zinc-900 line-clamp-1">{product.name}</h3>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-lg font-black text-zinc-900">${product.price.toFixed(2)}</p>
                  <p className={`text-xs font-bold ${
                    product.variants && product.variants.length > 0 
                      ? 'text-zinc-500' 
                      : product.stock <= 0 ? 'text-red-600' : product.stock < 10 ? 'text-amber-600' : 'text-zinc-500'
                  }`}>
                    {product.variants && product.variants.length > 0 
                      ? `${product.variants.length} variants` 
                      : `${product.stock} in stock`}
                  </p>
                </div>
                {product.stock <= 0 && (!product.variants || product.variants.length === 0) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl">
                    <span className="bg-zinc-900 text-white text-xs font-bold px-3 py-1 rounded-full">OUT OF STOCK</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Variant Picker Modal */}
      <AnimatePresence>
        {variantPickerProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVariantPickerProduct(null)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100">
                <h3 className="text-xl font-bold text-zinc-900">Select Variant</h3>
                <p className="text-sm text-zinc-500">{variantPickerProduct.name}</p>
              </div>
              <div className="p-4 grid grid-cols-1 gap-2">
                {variantPickerProduct.variants?.map(variant => (
                  <button
                    key={variant.id}
                    disabled={variant.stock <= 0}
                    onClick={() => addToCart(variantPickerProduct, variant)}
                    className={`flex items-center justify-between p-4 rounded-2xl border border-zinc-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all ${variant.stock <= 0 ? 'opacity-50 grayscale' : ''}`}
                  >
                    <div className="text-left">
                      <p className="font-bold text-zinc-900">{variant.name}</p>
                      <p className={`text-xs font-bold ${variant.stock <= 0 ? 'text-red-600' : variant.stock < 5 ? 'text-amber-600' : 'text-zinc-500'}`}>
                        {variant.stock} in stock
                      </p>
                    </div>
                    <p className="font-black text-zinc-900">
                      ${(variantPickerProduct.price + (variant.price_adjustment || 0)).toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l border-zinc-200 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            Current Order
            <span className="bg-emerald-100 text-emerald-600 text-xs px-2 py-0.5 rounded-full">{cart.length}</span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence mode="popLayout">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-center space-y-3">
                <ShoppingCart size={48} strokeWidth={1.5} />
                <p className="font-medium">Your cart is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key={item.id}
                  className="flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.image_url || `https://picsum.photos/seed/${item.id}/100/100`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-zinc-900 truncate">{item.name}</h4>
                    {item.selected_variant_name && (
                      <p className="text-xs text-emerald-600 font-medium">Variant: {item.selected_variant_name}</p>
                    )}
                    <p className="text-sm text-zinc-500">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-100 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white rounded-md transition-colors"><Minus size={14} /></button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white rounded-md transition-colors"><Plus size={14} /></button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-zinc-50 border-t border-zinc-200 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Discount code"
              className="flex-1 px-3 py-2 bg-white border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
            />
            <button 
              onClick={applyDiscount}
              className="px-4 py-2 bg-zinc-900 text-white text-sm font-bold rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Apply
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-zinc-500 text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 text-sm font-medium">
                <span>Discount ({discount}%)</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-500 text-sm">
              <span>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-zinc-900 pt-2 border-t border-zinc-200">
              <span>Total</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            Complete Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

const Inventory = ({ products, categories, onRefresh }: { 
  products: Product[], 
  categories: Category[],
  onRefresh: () => void 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    const method = editingProduct?.id ? 'PUT' : 'POST';
    const url = editingProduct?.id ? `/api/products/${editingProduct.id}` : '/api/products';
    
    // Use placeholder if no image is provided
    const payload = {
      ...editingProduct,
      image_url: editingProduct?.image_url || `https://picsum.photos/seed/${Math.random()}/400/400`
    };

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    setIsModalOpen(false);
    setEditingProduct(null);
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      onRefresh();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Inventory Management</h1>
          <p className="text-zinc-500 mt-1">Manage your products and stock levels</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search inventory..."
              className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setEditingProduct({ name: '', price: 0, stock: 0, category_id: categories[0]?.id }); setIsModalOpen(true); }}
            className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-colors"
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

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const fetchData = async () => {
    const [pRes, cRes, sRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/categories'),
      fetch('/api/stats')
    ]);
    setProducts(await pRes.json());
    setCategories(await cRes.json());
    setStats(await sRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckout = async (items: CartItem[], total: number) => {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, total })
      });
      if (res.ok) {
        setNotification({ message: 'Transaction completed successfully!', type: 'success' });
        fetchData();
      } else {
        throw new Error('Checkout failed');
      }
    } catch (err) {
      setNotification({ message: 'Checkout failed. Please try again.', type: 'error' });
    }
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="flex min-h-screen bg-white font-sans text-zinc-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 h-screen overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {activeTab === 'pos' && (
            <motion.div 
              key="pos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              <POSTerminal 
                products={products} 
                categories={categories} 
                onCheckout={handleCheckout} 
              />
            </motion.div>
          )}
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full overflow-y-auto"
            >
              <Dashboard stats={stats} />
            </motion.div>
          )}
          {activeTab === 'inventory' && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full overflow-y-auto"
            >
              <Inventory 
                products={products} 
                categories={categories} 
                onRefresh={fetchData} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-emerald-500 text-white border-emerald-400' 
                : 'bg-red-500 text-white border-red-400'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e4e4e7;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d4d4d8;
        }
      `}</style>
    </div>
  );
}
