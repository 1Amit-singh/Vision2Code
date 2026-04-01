import React, { useEffect, useRef } from "react";
import { 
  Code, 
  Eye, 
  Copy, 
  Check, 
  MousePointer2, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Maximize2 
} from "lucide-react";
import { cn } from "../lib/utils";
import { GeneratedFile } from "../services/geminiService";
import { ActiveTab, PreviewMode } from "../types";
import Prism from "prismjs";

interface EditorProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  files: GeneratedFile[];
  currentFileIndex: number;
  onFileSelect: (index: number) => void;
  onFileChange: (content: string) => void;
  modifiedFileNames: Set<string>;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
  onFullScreen: () => void;
  previewRef: React.RefObject<HTMLIFrameElement | null>;
  copied: boolean;
  onCopy: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  activeTab,
  onTabChange,
  files,
  currentFileIndex,
  onFileSelect,
  onFileChange,
  modifiedFileNames,
  isEditMode,
  onToggleEditMode,
  previewMode,
  onPreviewModeChange,
  onFullScreen,
  previewRef,
  copied,
  onCopy
}) => {
  const currentFile = files[currentFileIndex];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (activeTab === "code") {
      Prism.highlightAll();
    }
  }, [files, currentFileIndex, activeTab]);

  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const getPreviewWidth = () => {
    switch (previewMode) {
      case "mobile": return "375px";
      case "tablet": return "768px";
      default: return "100%";
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[700px] shadow-2xl">
      {/* Editor Header */}
      <div className="bg-black/40 border-b border-white/5 px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => onTabChange("code")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
              activeTab === "code" ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Code className="w-4 h-4" />
            Code
          </button>
          <button 
            onClick={() => onTabChange("preview")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
              activeTab === "preview" ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>

        {activeTab === "preview" && files.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
              <button 
                onClick={() => onPreviewModeChange("desktop")}
                className={cn("p-1.5 rounded-md transition-all", previewMode === "desktop" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300")}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onPreviewModeChange("tablet")}
                className={cn("p-1.5 rounded-md transition-all", previewMode === "tablet" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300")}
                title="Tablet View"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onPreviewModeChange("mobile")}
                className={cn("p-1.5 rounded-md transition-all", previewMode === "mobile" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300")}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            <button 
              onClick={onFullScreen}
              className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all"
              title="Open in New Tab"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-white/10" />

            <div className="flex items-center gap-2">
              {isEditMode && (
                <span className="text-[10px] text-orange-400 font-medium animate-pulse">
                  Click an element in the preview
                </span>
              )}
              <button 
                onClick={onToggleEditMode}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all",
                  isEditMode 
                    ? "bg-orange-500 border-orange-400 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]" 
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                )}
              >
                <MousePointer2 className="w-3 h-3" />
                {isEditMode ? "Exit Visual Edit" : "Visual Edit"}
              </button>
            </div>
          </div>
        )}

        {files.length > 0 && activeTab === "code" && (
          <div className="flex items-center gap-3">
            <button 
              onClick={onCopy}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all border border-white/5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>
        )}
      </div>

      {/* Main Area */}
      <div className="flex-grow flex overflow-hidden">
        {activeTab === "code" ? (
          <>
            {/* File Sidebar */}
            <div className="w-48 border-r border-white/5 bg-black/20 flex flex-col shrink-0">
              <div className="p-3 border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Files</div>
              <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {files.map((file, idx) => (
                  <button
                    key={file.name}
                    onClick={() => onFileSelect(idx)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between group",
                      currentFileIndex === idx ? "bg-orange-500/10 text-orange-500" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
                    )}
                  >
                    <span className="truncate">{file.name}</span>
                    {modifiedFileNames.has(file.name) && (
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Editor */}
            <div className="flex-grow relative overflow-hidden bg-[#0d0d0d]">
              <textarea
                ref={textareaRef}
                value={currentFile?.content || ""}
                onChange={(e) => onFileChange(e.target.value)}
                onScroll={handleScroll}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                className="absolute inset-0 w-full h-full p-6 bg-transparent text-gray-300 font-mono text-sm resize-none focus:outline-none z-10 caret-orange-500 whitespace-pre overflow-y-scroll overflow-x-auto custom-scrollbar"
                style={{ 
                  color: 'transparent', 
                  caretColor: 'white',
                  lineHeight: '1.5',
                  tabSize: 2,
                  scrollbarGutter: 'stable'
                }}
              />
              <pre 
                ref={preRef}
                className="absolute inset-0 w-full h-full p-6 m-0 pointer-events-none overflow-y-scroll overflow-x-auto custom-scrollbar"
                style={{ 
                  lineHeight: '1.5',
                  tabSize: 2,
                  scrollbarGutter: 'stable',
                  visibility: 'visible'
                }}
              >
                <code className={`language-${currentFile?.language || 'javascript'} font-mono text-sm`}>
                  {currentFile?.content || ""}
                </code>
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-grow bg-white flex items-center justify-center overflow-hidden p-4">
            <div 
              className="h-full bg-white shadow-2xl transition-all duration-300 overflow-hidden rounded-lg border border-gray-200"
              style={{ width: getPreviewWidth() }}
            >
              <iframe 
                ref={previewRef}
                className="w-full h-full border-none"
                title="Preview"
              />
            </div>
          </div>
        )}
      </div>
      <style>{`
        pre[class*="language-"]::-webkit-scrollbar {
          display: none !important;
        }
        pre[class*="language-"] {
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          scrollbar-width: none !important;
        }
        code[class*="language-"] {
          background: transparent !important;
          padding: 0 !important;
          font-family: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
        }
      `}</style>
    </div>
  );
};
