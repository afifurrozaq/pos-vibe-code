import React from 'react';
import { ShoppingCart, LayoutDashboard, Package, Tags, Settings } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'pos', icon: ShoppingCart, label: 'POS Terminal' },
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'inventory', icon: Package, label: 'Inventory' },
    { id: 'categories', icon: Tags, label: 'Categories' },
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
