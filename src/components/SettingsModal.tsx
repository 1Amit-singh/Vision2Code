import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings, X, Key, Cpu } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customApiKey: string;
  onCustomApiKeyChange: (val: string) => void;
  useCustomKey: boolean;
  onUseCustomKeyChange: (val: boolean) => void;
  selectedModel: string;
  onSelectedModelChange: (val: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  customApiKey,
  onCustomApiKeyChange,
  useCustomKey,
  onUseCustomKeyChange,
  selectedModel,
  onSelectedModelChange
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-gray-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Settings</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-3.5 h-3.5" />
                    Custom API Key
                  </label>
                  <button 
                    onClick={() => onUseCustomKeyChange(!useCustomKey)}
                    className={`w-10 h-5 rounded-full transition-all relative ${useCustomKey ? 'bg-orange-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${useCustomKey ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <input 
                  type="password"
                  value={customApiKey}
                  onChange={(e) => onCustomApiKeyChange(e.target.value)}
                  placeholder="Enter your Gemini API Key..."
                  disabled={!useCustomKey}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors disabled:opacity-50"
                />
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  By default, we use the system API key. Enable this to use your own key for higher limits.
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5" />
                  Model Selection
                </label>
                <select 
                  value={selectedModel}
                  onChange={(e) => onSelectedModelChange(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                >
                  <option value="gemini-flash-latest">Gemini Flash (Fast)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Advanced)</option>
                  <option value="gemini-3-flash-preview">Gemini 3 Flash (Balanced)</option>
                </select>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
