"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationContextType {
  notify: (type: NotificationType, title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((type: NotificationType, title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const remove = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 w-full max-w-sm">
        <AnimatePresence mode="popLayout">
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 border shadow-2xl flex gap-3 items-start relative overflow-hidden bg-surface ${
                n.type === 'success' ? 'border-success/30' : 
                n.type === 'error' ? 'border-danger/30' : 
                'border-primary/30'
              }`}
            >
              {/* Progress Bar */}
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-[2px] ${
                  n.type === 'success' ? 'bg-success' : 
                  n.type === 'error' ? 'bg-danger' : 
                  'bg-primary'
                }`}
              />

              <div className="mt-0.5">
                {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success" />}
                {n.type === 'error' && <AlertCircle className="w-5 h-5 text-danger" />}
                {n.type === 'info' && <Info className="w-5 h-5 text-primary" />}
                {n.type === 'warning' && <AlertCircle className="w-5 h-5 text-warning" />}
              </div>

              <div className="flex-1">
                <h3 className={`font-heading text-xs font-bold uppercase tracking-wider ${
                  n.type === 'success' ? 'text-success' : 
                  n.type === 'error' ? 'text-danger' : 
                  'text-foreground'
                }`}>
                  {n.title}
                </h3>
                <p className="text-xs text-muted mt-1 font-mono leading-relaxed">
                  {n.message}
                </p>
              </div>

              <button 
                onClick={() => remove(n.id)}
                className="text-muted hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
