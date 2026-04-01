import React, { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Editor } from "./components/Editor";
import { ProjectListModal } from "./components/ProjectListModal";
import { SettingsModal } from "./components/SettingsModal";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { Project, ActiveTab, PreviewMode } from "./types";
import { generateWebsiteCode, GeneratedFile } from "./services/geminiService";
import ReactMarkdown from "react-markdown";
import { motion } from "motion/react";

export default function App() {
  // Project State
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem("v2c_projects");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load projects from localStorage:", e);
      return [];
    }
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showProjectList, setShowProjectList] = useState(false);

  // UI State
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [modifiedFileNames, setModifiedFileNames] = useState<Set<string>>(new Set());
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("code");
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{ html: string; tag: string; selector: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  
  // Settings State
  const [customApiKey, setCustomApiKey] = useState("");
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-flash-latest");
  const [copied, setCopied] = useState(false);

  const previewRef = useRef<HTMLIFrameElement>(null);

  // Persistence
  useEffect(() => {
    const saveToLocalStorage = (data: Project[]) => {
      try {
        localStorage.setItem("v2c_projects", JSON.stringify(data));
      } catch (e: any) {
        // Check if it's a quota exceeded error
        if (
          e.name === 'QuotaExceededError' || 
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
          e.code === 22 || 
          e.number === -2147024882
        ) {
          console.warn("LocalStorage quota exceeded, attempting to prune oldest project...");
          if (data.length > 1) {
            // Sort by updatedAt to find the oldest
            const sorted = [...data].sort((a, b) => a.updatedAt - b.updatedAt);
            
            // Try to prune the oldest project that isn't the current one
            let projectToPrune = sorted[0];
            if (projectToPrune.id === currentProjectId && sorted.length > 1) {
              projectToPrune = sorted[1];
            }
            
            const pruned = data.filter(p => p.id !== projectToPrune.id);
            setProjects(pruned);
          } else {
            console.error("LocalStorage quota exceeded and only one project remains. Project may be too large to save.");
          }
        } else {
          console.error("Failed to save projects to localStorage:", e);
        }
      }
    };
    saveToLocalStorage(projects);
  }, [projects, currentProjectId]);

  useEffect(() => {
    try {
      if (currentProjectId) {
        localStorage.setItem("v2c_last_project_id", currentProjectId);
      } else {
        localStorage.removeItem("v2c_last_project_id");
      }
    } catch (e) {
      console.error("Failed to save last project ID to localStorage:", e);
    }
  }, [currentProjectId]);

  useEffect(() => {
    const lastProjectId = localStorage.getItem("v2c_last_project_id");
    if (lastProjectId) {
      const project = projects.find(p => p.id === lastProjectId);
      if (project) {
        loadProject(project);
      }
    }
  }, []);

  // Project Management
  const saveProject = (name?: string) => {
    if (files.length === 0 && !image && !prompt && name === undefined) return;

    const id = currentProjectId || Math.random().toString(36).substring(7);
    const projectName = name !== undefined ? name : (projects.find(p => p.id === id)?.name || `Project ${projects.length + 1}`);
    
    const newProject: Project = {
      id,
      name: projectName,
      files,
      image,
      prompt,
      explanation,
      createdAt: projects.find(p => p.id === id)?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    setProjects(prev => {
      const index = prev.findIndex(p => p.id === id);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = newProject;
        return updated;
      }
      return [newProject, ...prev];
    });
    if (!currentProjectId) setCurrentProjectId(id);
  };

  const loadProject = (project: Project) => {
    setCurrentProjectId(project.id);
    setFiles(project.files);
    setImage(project.image);
    setPrompt(project.prompt);
    setExplanation(project.explanation);
    setModifiedFileNames(new Set());
    setCurrentFileIndex(0);
    setActiveTab("code");
    setShowProjectList(false);
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProjectId === id) {
      createNewProject();
    }
  };

  const createNewProject = () => {
    setCurrentProjectId(null);
    setFiles([]);
    setImage(null);
    setPrompt("");
    setExplanation("");
    setModifiedFileNames(new Set());
    setCurrentFileIndex(0);
    setActiveTab("code");
    setShowProjectList(false);
  };

  // Visual Edit Message Listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "ELEMENT_SELECTED") {
        setSelectedElement(event.data.element);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Image Handling
  const compressImage = (base64: string, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(base64);

        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setImage(compressed);
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
        const segmentHeight = 1000;
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
      img.onerror = () => {
        console.error("Image load error in cropImage");
        resolve([base64]);
      };
      img.src = base64;
    });
  };

  // Generation Logic
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
        files
      );
      
      if (result.files.length > 0) {
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
        
        if (result.files.length > 0) {
          const firstModifiedIndex = newFiles.findIndex(f => f.name === result.files[0].name);
          if (firstModifiedIndex !== -1) {
            setCurrentFileIndex(firstModifiedIndex);
          }
        }
        
        setActiveTab("code");
        setTimeout(() => {
          try {
            saveProject();
          } catch (e) {
            console.error("Auto-save error:", e);
          }
        }, 100);
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "An error occurred during generation.");
    } finally {
      setLoading(false);
    }
  };

  // Real-time Editing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleFileChange = (content: string) => {
    const newFiles = [...files];
    newFiles[currentFileIndex] = { ...newFiles[currentFileIndex], content };
    setFiles(newFiles);
    
    // Debounce saveProject
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        saveProject();
      } catch (e) {
        console.error("Debounced save error:", e);
      }
    }, 1000);
  };

  // Preview Logic
  const updatePreview = useCallback(() => {
    if (previewRef.current && files.length > 0) {
      const doc = previewRef.current.contentDocument;
      if (doc) {
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
          const appFile = files.find(f => f.name.toLowerCase().includes('app')) || files[0];
          const otherFiles = files.filter(f => f !== appFile);
          
          const otherFilesContent = otherFiles.map(f => {
            const content = f.content
              .replace(/import.*from.*;/g, '')
              .replace(/export default/g, "const " + f.name.split('.')[0] + " =")
              .replace(/export/g, '');
            return "// File: " + f.name + "\n" + content;
          }).join("\n\n");

          const appFileContent = appFile.content
            .replace(/import.*from.*;/g, '')
            .replace(/export default/g, 'const App =')
            .replace(/export/g, '');

          const html = [
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '<meta charset="UTF-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '<script src="https://cdn.tailwindcss.com"></script>',
            '<script src="https://unpkg.com/react@18/umd/react.development.js"></script>',
            '<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>',
            '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>',
            '<script src="https://unpkg.com/lucide-react@0.344.0/dist/umd/lucide-react.min.js"></script>',
            '<style>',
            'body { margin: 0; font-family: sans-serif; }',
            isEditMode ? "* { transition: outline 0.1s ease; }" : "",
            '</style>',
            '</head>',
            '<body>',
            '<div id="root"></div>',
            '<script id="preview-script" type="text/babel">',
            'const React = window.React;',
            'const ReactDOM = window.ReactDOM;',
            'const { useState, useEffect, useRef, useMemo, useCallback } = React;',
            'const Lucide = window.lucide || window.LucideReact || {};',
            '// Helper to safely use Lucide icons',
            'const Icon = ({ name, ...props }) => {',
            '  const IconComponent = Lucide[name] || Lucide[name.charAt(0).toUpperCase() + name.slice(1)];',
            '  return IconComponent ? React.createElement(IconComponent, props) : null;',
            '};',
            otherFilesContent,
            appFileContent,
            'try {',
            '  const root = ReactDOM.createRoot(document.getElementById("root"));',
            '  root.render(<App />);',
            '} catch (err) {',
            '  console.error("Render Error:", err);',
            '  document.getElementById("root").innerHTML = `<div style="padding: 20px; color: red;">Render Error: ${err.message}</div>`;',
            '}',
            '</script>',
            selectionScript,
            '</body>',
            '</html>'
          ].join('\n');
          doc.write(html);
        } else {
          const htmlFile = files.find(f => f.name.endsWith('.html')) || { content: '<div class="p-8">No HTML file found.</div>' };
          const cssFile = files.find(f => f.name.endsWith('.css')) || { content: '' };
          const jsFile = files.find(f => f.name.endsWith('.js')) || { content: '' };

          const html = [
            '<!DOCTYPE html>',
            '<html>',
            '<head>',
            '<meta charset="UTF-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            '<script src="https://cdn.tailwindcss.com"></script>',
            '<style>' + cssFile.content + '</style>',
            '</head>',
            '<body>',
            htmlFile.content,
            '<script>' + jsFile.content + '</script>',
            selectionScript,
            '</body>',
            '</html>'
          ].join('\n');
          doc.write(html);
        }
        doc.close();
      }
    }
  }, [files, isEditMode]);

  useEffect(() => {
    if (activeTab === "preview") {
      updatePreview();
    }
  }, [activeTab, updatePreview]);

  const handleFullScreen = () => {
    const isReact = files.some(f => f.name.endsWith('.jsx') || f.name.endsWith('.tsx'));
    const win = window.open("", "_blank");
    if (!win) return;

    if (isReact) {
      const appFile = files.find(f => f.name.toLowerCase().includes('app')) || files[0];
      const otherFiles = files.filter(f => f !== appFile);
      
      const otherFilesContent = otherFiles.map(f => {
        const content = f.content
          .replace(/import.*from.*;/g, '')
          .replace(/export default/g, "const " + f.name.split('.')[0] + " =")
          .replace(/export/g, '');
        return "// File: " + f.name + "\n" + content;
      }).join("\n\n");

      const appFileContent = appFile.content
        .replace(/import.*from.*;/g, '')
        .replace(/export default/g, 'const App =')
        .replace(/export/g, '');

      win.document.write([
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<script src="https://cdn.tailwindcss.com"></script>',
        '<script src="https://unpkg.com/react@18/umd/react.development.js"></script>',
        '<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>',
        '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>',
        '<script src="https://unpkg.com/lucide-react@0.344.0/dist/umd/lucide-react.min.js"></script>',
        '<style>body { margin: 0; font-family: sans-serif; }</style>',
        '</head>',
        '<body>',
        '<div id="root"></div>',
        '<script type="text/babel">',
        'const { useState, useEffect, useRef, useMemo } = React;',
        'const Lucide = window.LucideReact || {};',
        otherFilesContent,
        appFileContent,
        'const root = ReactDOM.createRoot(document.getElementById("root"));',
        'root.render(<App />);',
        '</script>',
        '</body>',
        '</html>'
      ].join('\n'));
    } else {
      const htmlFile = files.find(f => f.name.endsWith('.html')) || { content: '' };
      const cssFile = files.find(f => f.name.endsWith('.css')) || { content: '' };
      const jsFile = files.find(f => f.name.endsWith('.js')) || { content: '' };

      win.document.write([
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '<script src="https://cdn.tailwindcss.com"></script>',
        '<style>' + cssFile.content + '</style>',
        '</head>',
        '<body>',
        htmlFile.content,
        '<script>' + jsFile.content + '</script>',
        '</body>',
        '</html>'
      ].join('\n'));
    }
    win.document.close();
  };

  const handleCopy = () => {
    if (files[currentFileIndex]) {
      navigator.clipboard.writeText(files[currentFileIndex].content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-orange-500/30">
      <Header 
        onShowProjects={() => setShowProjectList(true)}
        onShowSettings={() => setShowSettings(true)}
        useCustomKey={useCustomKey}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          <Sidebar 
            currentProject={projects.find(p => p.id === currentProjectId) || null}
            onSaveProject={saveProject}
            onImageUpload={handleImageUpload}
            image={image}
            selectedElement={selectedElement}
            onClearSelectedElement={() => setSelectedElement(null)}
            prompt={prompt}
            onPromptChange={setPrompt}
            onGenerate={handleGenerate}
            loading={loading}
            hasFiles={files.length > 0}
            onReset={createNewProject}
          />

          <div className="space-y-8">
            <Editor 
              activeTab={activeTab}
              onTabChange={setActiveTab}
              files={files}
              currentFileIndex={currentFileIndex}
              onFileSelect={setCurrentFileIndex}
              onFileChange={handleFileChange}
              modifiedFileNames={modifiedFileNames}
              isEditMode={isEditMode}
              onToggleEditMode={() => {
                setIsEditMode(!isEditMode);
                if (isEditMode) setSelectedElement(null);
              }}
              previewMode={previewMode}
              onPreviewModeChange={setPreviewMode}
              onFullScreen={handleFullScreen}
              previewRef={previewRef}
              copied={copied}
              onCopy={handleCopy}
            />

            {explanation && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6"
              >
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                  AI Explanation
                </h2>
                <div className="prose prose-invert prose-sm max-w-none prose-orange">
                  <ReactMarkdown>{explanation}</ReactMarkdown>
                </div>
              </motion.section>
            )}
          </div>
        </div>
      </main>

      <ProjectListModal 
        isOpen={showProjectList}
        onClose={() => setShowProjectList(false)}
        projects={projects}
        currentProjectId={currentProjectId}
        onLoadProject={loadProject}
        onDeleteProject={deleteProject}
        onCreateNewProject={createNewProject}
      />

      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        customApiKey={customApiKey}
        onCustomApiKeyChange={setCustomApiKey}
        useCustomKey={useCustomKey}
        onUseCustomKeyChange={setUseCustomKey}
        selectedModel={selectedModel}
        onSelectedModelChange={setSelectedModel}
      />

      <LoadingOverlay 
        isLoading={loading}
        isUpdatingElement={!!selectedElement}
      />

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
