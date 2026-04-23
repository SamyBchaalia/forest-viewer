'use client';

import { useState } from 'react';
import { Layers, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { WMSLayerConfig } from '@/services/wmsLayers';

interface LayerControlPanelProps {
    layers: WMSLayerConfig[];
    onToggleLayer: (layerId: string) => void;
    currentZoom: number;
}

export function LayerControlPanel({ layers, onToggleLayer, currentZoom }: LayerControlPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const isActive = (layer: WMSLayerConfig) =>
        layer.visible && currentZoom >= layer.minZoom && currentZoom <= layer.maxZoom;

    const visibleCount = layers.filter(isActive).length;
    const enabledCount = layers.filter(l => l.visible).length;

    return (
        <div className="relative">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border text-sm font-medium transition-all ${
                    isExpanded
                        ? 'bg-[#0b4a59] text-white border-[#0b4a59] shadow-[#0b4a59]/20'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
            >
                <Layers size={15} />
                <span>Layers</span>
                {enabledCount > 0 && (
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                        isExpanded ? 'bg-white/20 text-white' : 'bg-[#0b4a59]/10 text-[#0b4a59]'
                    }`}>
                        {visibleCount}/{layers.length}
                    </span>
                )}
                <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {isExpanded && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-up">
                    <div className="px-3.5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">WMS Layers</span>
                        <span className="text-[11px] text-gray-400 font-medium tabular-nums">
                            zoom {currentZoom.toFixed(1)}
                        </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                        {layers.map((layer) => {
                            const active = isActive(layer);
                            const inRange = currentZoom >= layer.minZoom && currentZoom <= layer.maxZoom;

                            return (
                                <div key={layer.id} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-gray-50 transition-colors">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-black/10 transition-opacity"
                                        style={{
                                            backgroundColor: layer.color,
                                            opacity: active ? 1 : 0.25,
                                        }}
                                    />

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-medium truncate ${active ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {layer.name}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                                            {inRange
                                                ? <span className="text-emerald-600">In range</span>
                                                : `Zoom ${layer.minZoom}–${layer.maxZoom}`
                                            }
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => onToggleLayer(layer.id)}
                                        title={layer.visible ? 'Hide layer' : 'Show layer'}
                                        className={`shrink-0 p-1.5 rounded-lg transition-all ${
                                            layer.visible
                                                ? 'text-[#0b4a59] bg-[#0b4a59]/8 hover:bg-[#0b4a59]/15'
                                                : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                                        }`}
                                    >
                                        {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
