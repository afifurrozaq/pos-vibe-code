import React, { useEffect, useState } from 'react';
import { X, History, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StockHistory, Product } from '../types';
import { api } from '../services/api';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({ isOpen, onClose, product }) => {
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setIsLoading(true);
      api.fetchProductHistory(product.id)
        .then(setHistory)
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, product]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 text-white rounded-xl">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900">Stock History</h3>
                  <p className="text-sm text-zinc-500">{product?.name}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-zinc-400">
                  <p>No history records found for this product.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${
                          record.change_amount > 0 ? 'bg-emerald-50 text-emerald-600' : 
                          record.change_amount < 0 ? 'bg-red-50 text-red-600' : 
                          'bg-zinc-50 text-zinc-400'
                        }`}>
                          {record.change_amount > 0 ? <ArrowUpRight size={20} /> : 
                           record.change_amount < 0 ? <ArrowDownRight size={20} /> : 
                           <Minus size={20} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-zinc-900">
                              {record.change_amount > 0 ? '+' : ''}{record.change_amount} units
                            </p>
                            {record.variant_name && (
                              <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-bold uppercase">
                                {record.variant_name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 font-medium">{record.reason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-zinc-900">{record.new_stock} in stock</p>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                          {new Date(record.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
