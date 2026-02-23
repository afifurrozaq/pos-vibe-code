import React, { useState } from 'react';
import { Search, Plus, Minus, Trash2, ChevronRight, X, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, CartItem, ProductVariant } from '../types';

interface POSTerminalProps {
  products: Product[];
  categories: Category[];
  onCheckout: (items: CartItem[], total: number) => void;
}

export const POSTerminal: React.FC<POSTerminalProps> = ({ products, categories, onCheckout }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string, percent: number } | null>(null);

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category_id === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setVariantPickerProduct(product);
    } else {
      addToCart(product);
    }
  };

  const addToCart = (product: Product, variant?: ProductVariant) => {
    setCart(prev => {
      const cartKey = variant ? `${product.id}-${variant.id}` : `${product.id}`;
      const existing = prev.find(item => 
        variant 
          ? item.id === product.id && item.selected_variant_id === variant.id 
          : item.id === product.id && !item.selected_variant_id
      );

      if (existing) {
        return prev.map(item => 
          (variant ? item.selected_variant_id === variant.id : item.id === product.id && !item.selected_variant_id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      const price = variant ? (product.price + (variant.price_adjustment || 0)) : product.price;
      return [...prev, { 
        ...product, 
        quantity: 1, 
        price,
        selected_variant_id: variant?.id,
        selected_variant_name: variant?.name
      }];
    });
    setVariantPickerProduct(null);
  };

  const updateQuantity = (id: number, delta: number, variantId?: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && item.selected_variant_id === variantId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: number, variantId?: number) => {
    setCart(prev => prev.filter(item => !(item.id === id && item.selected_variant_id === variantId)));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = appliedDiscount ? (subtotal * appliedDiscount.percent / 100) : 0;
  const total = subtotal - discountAmount;

  const applyDiscount = () => {
    const codes: Record<string, number> = {
      'SAVE10': 10,
      'WELCOME20': 20,
      'NEXUS50': 50
    };
    if (codes[discountCode.toUpperCase()]) {
      setAppliedDiscount({ code: discountCode.toUpperCase(), percent: codes[discountCode.toUpperCase()] });
      setDiscountCode('');
    } else {
      alert('Invalid discount code');
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col bg-zinc-50 p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text" 
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            <button 
              onClick={() => setActiveCategory('all')}
              className={`px-6 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeCategory === 'all' ? 'bg-zinc-900 text-white shadow-lg' : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-300'}`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-6 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeCategory === cat.id ? 'bg-zinc-900 text-white shadow-lg' : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-300'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
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
                    src={product.image_url || `https://picsum.photos/seed/${encodeURIComponent(product.name)}/300/300`} 
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

      <div className="w-96 bg-white border-l border-zinc-200 flex flex-col shadow-xl">
        <div className="p-6 border-b border-zinc-100">
          <h2 className="text-xl font-black text-zinc-900 flex items-center gap-2">
            Current Order
            <span className="bg-emerald-100 text-emerald-600 text-xs px-2 py-1 rounded-full">{cart.length}</span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
              <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center">
                <ShoppingCart size={40} />
              </div>
              <p className="font-medium">Your cart is empty</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key={`${item.id}-${item.selected_variant_id || 'none'}`} 
                  className="flex items-center gap-4 group"
                >
                  <div className="w-16 h-16 bg-zinc-100 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={item.image_url || `https://picsum.photos/seed/${encodeURIComponent(item.name)}/100/100`} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-zinc-900 truncate">{item.name}</h4>
                    {item.selected_variant_name && (
                      <p className="text-xs text-emerald-600 font-medium">Variant: {item.selected_variant_name}</p>
                    )}
                    <p className="text-sm text-zinc-500">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-100 rounded-lg p-1">
                    <button 
                      onClick={() => updateQuantity(item.id, -1, item.selected_variant_id)}
                      className="p-1 hover:bg-white rounded-md transition-colors text-zinc-600"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1, item.selected_variant_id)}
                      className="p-1 hover:bg-white rounded-md transition-colors text-zinc-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="p-6 bg-zinc-50 border-t border-zinc-200 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-zinc-500 text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {appliedDiscount && (
              <div className="flex justify-between text-emerald-600 text-sm font-bold">
                <span>Discount ({appliedDiscount.code})</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-900 text-xl font-black pt-2 border-t border-zinc-200">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Discount code"
              className="flex-1 px-4 py-2 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
            />
            <button 
              onClick={applyDiscount}
              className="px-4 py-2 bg-zinc-200 text-zinc-900 font-bold rounded-xl text-sm hover:bg-zinc-300 transition-colors"
            >
              Apply
            </button>
          </div>

          <button 
            disabled={cart.length === 0}
            onClick={() => { onCheckout(cart, total); setCart([]); setAppliedDiscount(null); }}
            className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 group"
          >
            Complete Transaction
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

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
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Select Variant</h3>
                  <p className="text-sm text-zinc-500">{variantPickerProduct.name}</p>
                </div>
                <button onClick={() => setVariantPickerProduct(null)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-3">
                {variantPickerProduct.variants?.map(variant => (
                  <button
                    key={variant.id}
                    onClick={() => addToCart(variantPickerProduct, variant)}
                    disabled={variant.stock <= 0}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      variant.stock <= 0 
                        ? 'bg-zinc-50 border-zinc-100 opacity-50 grayscale cursor-not-allowed' 
                        : 'bg-white border-zinc-100 hover:border-emerald-500 hover:bg-emerald-50/30'
                    }`}
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
    </div>
  );
};
