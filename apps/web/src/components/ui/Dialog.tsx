'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
}

export function Dialog({ open, onClose, children, maxWidth = 'max-w-md' }: DialogProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(5, 20, 28, 0.6)', backdropFilter: 'blur(4px)' }}
            onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
            <div
                className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl overflow-hidden
                    animate-[dialog-in_0.18s_ease-out]`}
                style={{ animationFillMode: 'both' }}
            >
                {children}
            </div>
            <style>{`
                @keyframes dialog-in {
                    from { opacity: 0; transform: scale(0.96) translateY(6px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0); }
                }
            `}</style>
        </div>
    );
}

interface DialogHeaderProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    onClose: () => void;
    variant?: 'default' | 'danger';
}

export function DialogHeader({ title, description, icon, onClose, variant = 'default' }: DialogHeaderProps) {
    const bg = variant === 'danger' ? 'bg-red-600' : 'bg-[#0b4a59]';
    return (
        <div className={`${bg} px-5 py-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="text-base font-semibold text-white leading-tight">{title}</h3>
                    {description && <p className="text-xs text-white/60 mt-0.5">{description}</p>}
                </div>
            </div>
            <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
}

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    loading?: boolean;
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    loading = false,
}: ConfirmDialogProps) {
    const isDanger = variant === 'danger';

    return (
        <Dialog open={open} onClose={onClose} maxWidth="max-w-sm">
            <div className="p-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    isDanger ? 'bg-red-50' : 'bg-[#0b4a59]/10'
                }`}>
                    {isDanger ? (
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-[#0b4a59]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>

                <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{message}</p>

                <div className="flex gap-2.5 mt-6">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                            isDanger
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-[#0b4a59] hover:bg-[#083845]'
                        }`}
                    >
                        {loading && (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
