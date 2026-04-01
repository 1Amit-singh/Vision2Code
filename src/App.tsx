import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Code, 
  Eye, 
  Send, 
  Settings, 
  Key, 
  Image as ImageIcon, 
  Loader2, 
  Copy, 
  Check,
  RefreshCw,
  Layout,
  Terminal,
  FileCode,
  ChevronRight,
  Plus,
  Trash2,
  FileJson,
  MousePointer2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markup";

import { generateWebsiteCode, GeneratedFile } from "./services/geminiService";
import { cn } from "./lib/utils";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [modifiedFileNames, setModifiedFileNames] = useState<Set<string>>(new Set());
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{ html: string; tag: string; selector: string } | null>(null);
  const [customApiKey, setCustomApiKey] = useState("");
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-flash-latest");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    Prism.highlightAll();
  }, [files, currentFileIndex, activeTab]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "ELEMENT_SELECTED") {
        setSelectedElement(event.data.element);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const cropImage = async (base64: string): Promise<string[]> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve([base64]);

        const segments: string[] = [];
        const segmentHeight = 1000; // Max height per segment
        const totalHeight = img.height;
        const width = img.width;

        if (totalHeight <= segmentHeight) {
          return resolve([base64]);
        }

        for (let y = 0; y < totalHeight; y += segmentHeight) {
          const h = Math.min(segmentHeight, totalHeight - y);
          canvas.width = width;
          canvas.height = h;
          ctx.drawImage(img, 0, y, width, h, 0, 0, width, h);
          segments.push(canvas.toDataURL("image/jpeg", 0.8));
        }
        resolve(segments);
      };
      img.src = base64;
    });
  };

  const handleGenerate = async () => {
    if (!prompt && !image) return;
    
    setLoading(true);
    setModifiedFileNames(new Set());
    
    try {
      const apiKey = useCustomKey ? customApiKey : (process.env.GEMINI_API_KEY || "");
      if (!apiKey) {
        throw new Error("API Key is missing. Please provide one in settings.");
      }

      let imageSegments: string[] = [];
      if (image) {
        imageSegments = await cropImage(image);
      }

      let finalPrompt = prompt || "Generate a modern website UI based on this image.";
      if (selectedElement) {
        finalPrompt = `
TARGET ELEMENT TO MODIFY:
Tag: ${selectedElement.tag}
Selector: ${selectedElement.selector}
Current HTML:
${selectedElement.html}

USER REQUEST FOR THIS ELEMENT:
${prompt}

Please modify ONLY this element or its immediate context to satisfy the request. 
If you need to update multiple files to reflect this change, do so.
`;
      }

      const result = await generateWebsiteCode(
        finalPrompt,
        imageSegments,
        apiKey,
        selectedModel,
        files // Send existing files for context
      );
      
      if (result.files.length > 0) {
        // Merge or replace files
        const newFiles = [...files];
        const modified = new Set<string>();
        
        result.files.forEach(newFile => {
          modified.add(newFile.name);
          const existingIndex = newFiles.findIndex(f => f.name === newFile.name);
          if (existingIndex !== -1) {
            newFiles[existingIndex] = newFile;
          } else {
            newFiles.push(newFile);
          }
        });
        
        setFiles(newFiles);
        setModifiedFileNames(modified);
        setExplanation(result.explanation);
        setSelectedElement(null);
        setIsEditMode(false);
        
        // Switch to the first modified file if it exists
        if (result.files.length > 0) {
          const firstModifiedIndex = newFiles.findIndex(f => f.name === result.files[0].name);
          if (firstModifiedIndex !== -1) {
            setCurrentFileIndex(firstModifiedIndex);
          }
        }
        
        setActiveTab("code");
      }
    } catch (error: any) {
      console.error(error);
      setExplanation(`Error: ${error.message || "An unknown error occurred."}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (files[currentFileIndex]) {
      navigator.clipboard.writeText(files[currentFileIndex].content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const updatePreview = () => {
    if (previewRef.current && files.length > 0) {
      const doc = previewRef.current.contentDocument;
      if (doc) {
        // Check if it's a React project
        const isReact = files.some(f => f.name.endsWith('.jsx') || f.name.endsWith('.tsx'));
        
        const selectionScript = isEditMode ? `
          <script>
            (function() {
              let lastEl = null;
              document.addEventListener('mouseover', (e) => {
                if (lastEl) lastEl.style.outline = '';
                e.target.style.outline = '2px solid #f97316';
                e.target.style.cursor = 'pointer';
                lastEl = e.target;
              });
              document.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const el = e.target;
                const selector = el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : '');
                window.parent.postMessage({
                  type: 'ELEMENT_SELECTED',
                  element: {
                    html: el.outerHTML,
                    tag: el.tagName.toLowerCase(),
                    selector: selector
                  }
                }, '*');
              }, true);
            })();
          </script>
        ` : "";

        doc.open();
        if (isReact) {
          // React Preview using Babel Standalone
          const appFile = files.find(f => f.name.toLowerCase().includes('app')) || files[0];
          const otherFiles = files.filter(f => f !== appFile);
          
          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"></script>
                <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                <script src="https://unpkg.com/lucide-react@0.344.0/dist/umd/lucide-react.min.js"></script>
                <style>
                  body { margin: 0; font-family: sans-serif; }
                  ${isEditMode ? "* { transition: outline 0.1s ease; }" : ""}
                </style>
              </head>
              <body>
                <div id="root"></div>
                <script type="text/babel">
                  const { useState, useEffect, useRef, useMemo } = React;
                  
                  // Mock Lucide icons for preview
                  const Lucide = window.LucideReact || {};
                  
                  ${otherFiles.map(f => {
                    // Strip imports/exports for Babel standalone
                    const content = f.content
                      .replace(/import.*from.*;/g, '')
                      .replace(/export default/g, `const ${f.name.split('.')[0]} =`)
                      .replace(/export/g, '');
                    return `// File: ${f.name}\n${content}`;
                  }).join("\n\n")}

                  ${appFile.content
                    .replace(/import.*from.*;/g, '')
                    .replace(/export default/g, 'const App =')
                    .replace(/export/g, '')}

                  const root = ReactDOM.createRoot(document.getElementById('root'));
                  root.render(<App />);
                </script>
                ${selectionScript}
              </body>
            </html>
          `);
        } else {
          // Standard HTML/CSS/JS Preview
          const htmlFile = files.find(f => f.name.endsWith('.html')) || { content: '<div class="p-8">No HTML file found.</div>' };
          const cssFile = files.find(f => f.name.endsWith('.css')) || { content: '' };
          const jsFile = files.find(f => f.name.endsWith('.js')) || { content: '' };

          doc.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>${cssFile.content}</style>
              </head>
              <body>
                ${htmlFile.content}
                <script>${jsFile.content}</script>
                ${selectionScript}
              </body>
            </html>
          `);
        }
        doc.close();
      }
    }
  };

  useEffect(() => {
    if (activeTab === "preview") {
      updatePreview();
    }
  }, [activeTab, files, isEditMode]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Layout className="w-5 h-5 text-black" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Vision2Code <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-400 font-normal ml-2 uppercase tracking-widest">Pro</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowSettings(!showSettings)}
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          
          {/* Sidebar: Controls */}
          <div className="space-y-6">
            <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5">
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
                  onChange={handleImageUpload} 
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
                      onClick={() => setSelectedElement(null)}
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
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe changes or new features..."
                  className="w-full h-24 bg-black/50 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
                />
              </div>

              <button 
                onClick={handleGenerate}
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
                    {selectedElement ? "Update Element" : (files.length > 0 ? "Update Project" : "Generate UI")}
                  </>
                )}
              </button>

              {files.length > 0 && (
                <button 
                  onClick={() => {
                    setFiles([]);
                    setModifiedFileNames(new Set());
                    setExplanation("");
                    setImage(null);
                    setPrompt("");
                  }}
                  className="w-full py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-red-400 border border-white/5 hover:border-red-400/20 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Reset Project
                </button>
              )}
            </section>

            {/* File Explorer */}
            {files.length > 0 && (
              <section className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between">
                  Project Files
                  <span className="text-orange-500">{files.length}</span>
                </h4>
                <div className="space-y-1 max-h-[300px] overflow-auto custom-scrollbar">
                  {files.map((file, idx) => (
                    <button
                      key={file.name}
                      onClick={() => {
                        setCurrentFileIndex(idx);
                        setActiveTab("code");
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all",
                        currentFileIndex === idx 
                          ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" 
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <FileCode className="w-4 h-4" />
                      <span className="truncate">{file.name}</span>
                      {modifiedFileNames.has(file.name) && (
                        <span className="ml-auto text-[8px] bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded border border-blue-500/30 uppercase font-bold tracking-tighter">
                          Mod
                        </span>
                      )}
                      {currentFileIndex === idx && !modifiedFileNames.has(file.name) && <ChevronRight className="w-3 h-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Settings */}
            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold flex items-center gap-2">
                      <Key className="w-3 h-3 text-orange-500" />
                      Configuration
                    </h3>
                    <button onClick={() => setShowSettings(false)} className="text-[10px] text-gray-500 hover:text-white">Close</button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase">Model</label>
                      <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500/50 appearance-none"
                      >
                        <option value="gemini-flash-latest">Gemini Flash</option>
                        <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-lg bg-black/30 border border-white/5">
                      <input 
                        type="checkbox" 
                        id="useCustom" 
                        checked={useCustomKey}
                        onChange={(e) => setUseCustomKey(e.target.checked)}
                        className="w-3 h-3 rounded border-white/10 bg-black text-orange-500 focus:ring-orange-500"
                      />
                      <label htmlFor="useCustom" className="text-[10px] text-gray-300 cursor-pointer">Custom API Key</label>
                    </div>

                    {useCustomKey && (
                      <input 
                        type="password" 
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        placeholder="Enter Key"
                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-orange-500/50"
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main Content: Output */}
          <div className="flex flex-col h-[calc(100vh-160px)] min-h-[600px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button 
                  onClick={() => setActiveTab("code")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all",
                    activeTab === "code" ? "bg-white/10 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Code className="w-4 h-4" />
                  Code
                </button>
                <button 
                  onClick={() => setActiveTab("preview")}
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
                  {isEditMode && (
                    <span className="text-[10px] text-orange-400 font-medium animate-pulse">
                      Click an element in the preview to select it
                    </span>
                  )}
                  <button 
                    onClick={() => {
                      setIsEditMode(!isEditMode);
                      if (isEditMode) setSelectedElement(null);
                    }}
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
              )}

              {files.length > 0 && activeTab === "code" && (
                <div className="flex items-center gap-3">
                  <div className="text-[10px] text-gray-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                    {files[currentFileIndex]?.name}
                  </div>
                  <button 
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all flex items-center gap-2 text-xs"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative">
              {loading && (
                <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                    <div className="absolute inset-0 blur-xl bg-orange-500/20 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-lg font-bold text-white">
                      {selectedElement ? "Updating Element" : "Generating Project"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {selectedElement ? "Applying changes to selected element..." : "Analyzing segments and writing files..."}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "code" ? (
                <div className="h-full overflow-auto p-0 custom-scrollbar">
                  {files.length > 0 ? (
                    <div className="h-full flex flex-col">
                      {explanation && (
                        <div className="p-4 bg-orange-500/5 border-b border-white/5 text-xs text-orange-200/70 italic">
                          {explanation}
                        </div>
                      )}
                      <div className="flex-1 p-6">
                        <pre className="!bg-transparent !p-0 !m-0">
                          <code className={`language-${files[currentFileIndex]?.language}`}>
                            {files[currentFileIndex]?.content}
                          </code>
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4">
                      <FileJson className="w-12 h-12 opacity-20" />
                      <p className="text-sm">Generate a design to see the code</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full bg-white">
                  <iframe 
                    ref={previewRef}
                    title="Preview"
                    className="w-full h-full border-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        pre {
          background: transparent !important;
          padding: 0 !important;
        }
        code[class*="language-"],
        pre[class*="language-"] {
          text-shadow: none !important;
        }
      `}</style>
    </div>
  );
}
