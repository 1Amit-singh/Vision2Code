import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { History, Plus, X, Folder, FileCode, Trash2 } from "lucide-react";
import { Project } from "../types";
import { cn } from "../lib/utils";

interface ProjectListModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  currentProjectId: string | null;
  onLoadProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onCreateNewProject: () => void;
}

export const ProjectListModal: React.FC<ProjectListModalProps> = ({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  onLoadProject,
  onDeleteProject,
  onCreateNewProject
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
            className="relative w-full max-w-2xl bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <History className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Your Projects</h2>
                  <p className="text-xs text-gray-500">Manage and continue your saved work</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={onCreateNewProject}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-xs font-bold text-black transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {projects.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                    <Folder className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-500 text-sm">No projects saved yet.</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div 
                    key={project.id}
                    className={cn(
                      "group relative bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 transition-all flex items-center justify-between",
                      currentProjectId === project.id ? "border-orange-500/30 bg-orange-500/5" : ""
                    )}
                  >
                    <div className="flex items-center gap-4 flex-grow cursor-pointer" onClick={() => onLoadProject(project)}>
                      <div className="w-12 h-12 bg-black/40 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center">
                        {project.image ? (
                          <img src={project.image} alt={project.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <FileCode className="w-6 h-6 text-gray-600" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-white group-hover:text-orange-500 transition-colors">{project.name}</h3>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                          <span className="flex items-center gap-1">
                            <FileCode className="w-3 h-3" />
                            {project.files.length} files
                          </span>
                          <span>•</span>
                          <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onDeleteProject(project.id)}
                        className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded-lg transition-all"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onLoadProject(project)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white transition-all"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
