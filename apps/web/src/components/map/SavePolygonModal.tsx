'use client';

import { useState } from 'react';
import { Trees, Ruler, Loader2 } from 'lucide-react';
import { Dialog, DialogHeader } from '@/components/ui/Dialog';

interface SavePolygonModalProps {
    geometry: any;
    onClose: () => void;
    onSaved: (name: string) => void;
}

export function SavePolygonModal({ onClose, onSaved }: SavePolygonModalProps) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        await onSaved(name.trim());
        setSaving(false);
    };

    return (
        <Dialog open onClose={onClose}>
            <DialogHeader
                title="Save Forest Analysis"
                description="Name this zone to track it later"
                icon={<Trees size={16} />}
                onClose={onClose}
            />

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
                    <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <Ruler size={14} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-emerald-800">Polygon drawn successfully</p>
                        <p className="text-xs text-emerald-600 mt-0.5 leading-relaxed">
                            Forest cover, hectares and composition will be computed automatically.
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Zone name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Forest North, Zone A…"
                        className="input-field"
                        required
                        autoFocus
                    />
                </div>

                <div className="flex gap-2.5 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !name.trim()}
                        className="flex-1 btn-primary flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 size={15} className="animate-spin" />
                                Analyzing…
                            </>
                        ) : (
                            <>
                                <Trees size={15} />
                                Analyze & Save
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Dialog>
    );
}
