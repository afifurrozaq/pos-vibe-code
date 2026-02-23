import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Category, Stats, CartItem } from './types';
import { api } from './services/api';
import { useOfflineSync } from './hooks/useOfflineSync';

// Components
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { POSTerminal } from './components/POSTerminal';
import { Inventory } from './components/Inventory';
import { Categories } from './components/Categories';

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('low_stock_threshold');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [pData, cData, sData] = await Promise.all([
        api.fetchProducts(),
        api.fetchCategories(),
        fetch(`/api/stats?threshold=${lowStockThreshold}`).then(res => res.json())
      ]);
      setProducts(pData);
      setCategories(cData);
      setStats(sData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, [lowStockThreshold]);

  const handleThresholdChange = (newThreshold: number) => {
    setLowStockThreshold(newThreshold);
    localStorage.setItem('low_stock_threshold', newThreshold.toString());
  };

  const { isOnline, offlineQueue, addOfflineAction } = useOfflineSync(fetchData, showNotification);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckout = async (items: CartItem[], total: number) => {
    if (!isOnline) {
      addOfflineAction('checkout', { items, total });
      return;
    }

    try {
      await api.checkout(items, total);
      showNotification('Transaction completed successfully!', 'success');
      fetchData();
    } catch (err) {
      showNotification('Checkout failed. Saving locally...', 'error');
      addOfflineAction('checkout', { items, total });
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
        {/* Connection Status Bar */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold"
            >
              <WifiOff size={16} />
              Working Offline - Actions will sync when connection is restored
            </motion.div>
          )}
          {isOnline && offlineQueue.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold"
            >
              <Wifi size={16} />
              Online - {offlineQueue.length} actions pending sync
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-hidden relative">
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
                <Dashboard stats={stats} lowStockThreshold={lowStockThreshold} />
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
                  isOnline={isOnline}
                  onOfflineAction={addOfflineAction}
                  lowStockThreshold={lowStockThreshold}
                  onThresholdChange={handleThresholdChange}
                />
              </motion.div>
            )}

            {activeTab === 'categories' && (
              <motion.div 
                key="categories"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full overflow-y-auto"
              >
                <Categories 
                  categories={categories} 
                  onRefresh={fetchData} 
                  isOnline={isOnline}
                  onOfflineAction={addOfflineAction}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Global Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold text-white flex items-center gap-3 ${
              notification.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
