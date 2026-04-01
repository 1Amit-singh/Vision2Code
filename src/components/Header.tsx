import React from "react";
import { Layout, History, Settings } from "lucide-react";

interface HeaderProps {
  onShowProjects: () => void;
  onShowSettings: () => void;
  useCustomKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onShowProjects, onShowSettings, useCustomKey }) => {
  return (
    <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Layout className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Vision2Code <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-400 font-normal ml-2 uppercase tracking-widest">Pro</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onShowProjects}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all border border-white/5"
          >
            <History className="w-4 h-4" />
            Projects
          </button>
          <button 
            onClick={onShowSettings}
            className="p-2 hover:bg-white/5 rounded-full transition-colors relative"
          >
            <Settings className="w-5 h-5 text-gray-400" />
            {useCustomKey && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full border border-black" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
