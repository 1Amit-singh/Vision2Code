import React, { useRef } from "react";
import { 
  ImageIcon, 
  RefreshCw, 
  MousePointer2, 
  X, 
  Send, 
  Loader2, 
  Trash2, 
  Save 
} from "lucide-react";
import { cn } from "../lib/utils";
import { Project } from "../types";

interface SidebarProps {
  currentProject: Project | null;
  onSaveProject: (name?: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  image: string | null;
  selectedElement: { html: string; tag: string; selector: string } | null;
  onClearSelectedElement: () => void;
  prompt: string;
  onPromptChange: (val: string) => void;
  onGenerate: () => void;
  loading: boolean;
  hasFiles: boolean;
  onReset: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentProject,
  onSaveProject,
  onImageUpload,
  image,
  selectedElement,
  onClearSelectedElement,
  prompt,
  onPromptChange,
  onGenerate,
  loading,
  hasFiles,
  onReset
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1 flex-grow">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Project Name</label>
            <input 
              type="text"
              value={currentProject?.name || "Untitled Project"}
              onChange={(e) => onSaveProject(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-sm font-bold text-white focus:text-orange-500 transition-colors"
            />
          </div>
          <button 
            onClick={() => onSaveProject()}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-500 hover:text-orange-500 transition-all"
            title="Save Project"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
        
        <div className="h-[1px] bg-white/5" />

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Input Image</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-orange-500/50 transition-all cursor-pointer overflow-hidden group",
              image ? "border-solid border-orange-500/30" : ""
            )}
          >
            {image ? (
              <>
                <img src={image} alt="Upload" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-white" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2">
                <ImageIcon className="w-8 h-8" />
                <span className="text-xs">Upload design</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={onImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {selectedElement && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
                <MousePointer2 className="w-3 h-3" />
                Selected: {selectedElement.tag}
              </span>
              <button 
                onClick={onClearSelectedElement}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="text-[10px] text-gray-400 font-mono truncate bg-black/40 p-1.5 rounded border border-white/5">
              {selectedElement.selector}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Prompt</label>
          <textarea 
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Describe changes or new features..."
            className="w-full h-24 bg-black/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
          />
        </div>

        <button 
          onClick={onGenerate}
          disabled={loading || (!prompt && !image)}
          className={cn(
            "w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
            loading || (!prompt && !image) 
              ? "bg-white/5 text-gray-500 cursor-not-allowed" 
              : "bg-orange-500 text-black hover:bg-orange-400 active:scale-[0.98]"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {selectedElement ? "Updating Element..." : "Processing..."}
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {selectedElement ? "Update Element" : (hasFiles ? "Update Project" : "Generate UI")}
            </>
          )}
        </button>

        {hasFiles && (
          <button 
            onClick={onReset}
            className="w-full py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-red-400 border border-white/5 hover:border-red-400/20 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-3 h-3" />
            Reset Project
          </button>
        )}
      </section>
    </div>
  );
};
