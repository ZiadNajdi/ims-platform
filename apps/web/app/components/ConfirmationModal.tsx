"use client";

import { Modal } from "./Modal";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info' | 'warning';
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false
}: ConfirmationModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} variant={variant === 'warning' ? 'danger' : variant}>
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 bg-surface-hover/30 border border-border">
          <div className={`mt-0.5 p-2 rounded-full ${
            variant === 'danger' ? 'bg-danger/10 text-danger' : 
            variant === 'info' ? 'bg-primary/10 text-primary' : 
            'bg-warning/10 text-warning'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-mono text-foreground leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        
        <div className="pt-2 flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-border font-mono text-xs uppercase tracking-wider hover:bg-surface-hover transition-colors text-muted hover:text-foreground disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-6 py-2 font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 ${
              variant === 'danger' ? 'bg-danger text-danger-foreground hover:bg-danger/90' : 
              variant === 'info' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 
              'bg-warning text-warning-foreground hover:bg-warning/90'
            }`}
          >
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
