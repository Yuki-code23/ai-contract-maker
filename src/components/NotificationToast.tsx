'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ToastMessage {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    duration?: number;
}

export const useToast = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (toast: Omit<ToastMessage, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { ...toast, id };
        setToasts((prev) => [...prev, newToast]);

        if (toast.duration !== 0) {
            setTimeout(() => {
                removeToast(id);
            }, toast.duration || 5000);
        }
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return { toasts, addToast, removeToast };
};

export default function NotificationToast({ toasts, removeToast }: { toasts: ToastMessage[], removeToast: (id: string) => void }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`min-w-[300px] max-w-md p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 transform translate-y-0 opacity-100 ${toast.type === 'warning' ? 'bg-white dark:bg-gray-800 border-yellow-500 text-gray-800 dark:text-gray-100' :
                            toast.type === 'error' ? 'bg-white dark:bg-gray-800 border-red-500 text-gray-800 dark:text-gray-100' :
                                toast.type === 'success' ? 'bg-white dark:bg-gray-800 border-green-500 text-gray-800 dark:text-gray-100' :
                                    'bg-white dark:bg-gray-800 border-blue-500 text-gray-800 dark:text-gray-100'
                        }`}
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-sm">{toast.title}</h3>
                            <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>,
        document.body
    );
}
