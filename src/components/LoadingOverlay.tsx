import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isLoading: boolean;
  isUpdatingElement: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isLoading, isUpdatingElement }) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8"
        >
          <div className="relative mb-8">
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
            <div className="absolute inset-0 blur-xl bg-orange-500/20 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-bold text-white">
              {isUpdatingElement ? "Updating Element" : "Generating Project"}
            </p>
            <p className="text-sm text-gray-400">
              {isUpdatingElement ? "Applying changes to selected element..." : "Analyzing segments and writing files..."}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
