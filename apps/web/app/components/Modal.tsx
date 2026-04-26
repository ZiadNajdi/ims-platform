"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'info' | 'success';
}

export function Modal({ isOpen, onClose, title, children, variant = 'default' }: ModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-lg pointer-events-auto border border-border bg-surface shadow-2xl shadow-primary/10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className={`flex items-center justify-between border-b border-border px-6 py-4 relative overflow-hidden ${
                variant === 'danger' ? 'bg-danger/5' : 
                variant === 'info' ? 'bg-primary/5' : 
                variant === 'success' ? 'bg-success/5' : 'bg-surface-hover/50'
              }`}>
                {/* Accent Line */}
                <div className={`absolute top-0 left-0 w-full h-[2px] ${
                  variant === 'danger' ? 'bg-danger' : 
                  variant === 'info' ? 'bg-primary' : 
                  variant === 'success' ? 'bg-success' : 'bg-border'
                }`} />

                <h2 className={`font-heading text-lg font-bold uppercase tracking-wide flex items-center gap-2 ${
                  variant === 'danger' ? 'text-danger' : 
                  variant === 'info' ? 'text-primary' : 
                  variant === 'success' ? 'text-success' : 'text-foreground'
                }`}>
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 text-muted hover:text-foreground hover:bg-surface transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 overflow-y-auto">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
