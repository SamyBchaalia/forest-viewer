'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_POLYGONS, DELETE_POLYGON_MUTATION } from '@/graphql/polygons';
import { MapPin, Trash2, Trees, Clock, AlertCircle, Eye, Hexagon } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/Dialog';

interface SavedPolygonsListProps {
    onSelectPolygon: (polygon: any) => void;
    onHighlightPolygon?: (polygon: any) => void;
    selectedPolygonId?: string | null;
}

const STATUS_CONFIG = {
    completed: { icon: Trees,        color: 'text-emerald-600', bg: 'bg-emerald-50',  label: 'Completed' },
    pending:   { icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50',    label: 'Pending'   },
    failed:    { icon: AlertCircle,  color: 'text-red-500',     bg: 'bg-red-50',      label: 'Failed'    },
} as const;

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>
            <Icon size={9} />
            {cfg.label}
        </span>
    );
}

export function SavedPolygonsList({ onSelectPolygon, onHighlightPolygon, selectedPolygonId }: SavedPolygonsListProps) {
    const { data, loading, refetch } = useQuery<{ myPolygons: any[] }>(GET_MY_POLYGONS);
    const [deletePolygon, { loading: deleting }] = useMutation(DELETE_POLYGON_MUTATION);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPendingDeleteId(id);
    };

    const handleDeleteConfirm = async () => {
        if (!pendingDeleteId) return;
        await deletePolygon({ variables: { polygonId: pendingDeleteId } });
        setPendingDeleteId(null);
        refetch();
    };

    const handleShow = (polygon: any, e: React.MouseEvent) => {
        e.stopPropagation();
        onHighlightPolygon?.(polygon);
    };

    if (loading) {
        return (
            <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse space-y-1.5">
                        <div className="h-3.5 bg-gray-100 rounded-lg w-2/3" />
                        <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    const polygons = data?.myPolygons || [];

    if (polygons.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3 ring-4 ring-gray-50">
                    <Hexagon size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No saved zones yet</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-[180px]">
                    Use <span className="font-medium text-[#0b4a59]">Draw Zone</span> on the map to create your first analysis area.
                </p>
            </div>
        );
    }

    const pendingPolygon = polygons.find((p: any) => p.id === pendingDeleteId);

    return (
        <>
            <div>
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Saved zones
                    </span>
                    <span className="text-xs font-bold text-[#0b4a59] bg-[#0b4a59]/8 px-2 py-0.5 rounded-full">
                        {polygons.length}
                    </span>
                </div>

                <div className="divide-y divide-gray-50">
                    {polygons.map((polygon: any) => {
                        const selected = selectedPolygonId === polygon.id;
                        return (
                            <div
                                key={polygon.id}
                                onClick={() => onSelectPolygon(polygon)}
                                className={`group relative px-4 py-3 cursor-pointer transition-colors ${
                                    selected ? 'bg-[#0b4a59]/5' : 'hover:bg-gray-50/80'
                                }`}
                            >
                                {selected && (
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#0b4a59] rounded-r" />
                                )}

                                <div className="flex items-start gap-3">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                        selected ? 'bg-[#0b4a59]/10' : 'bg-gray-100 group-hover:bg-[#0b4a59]/8'
                                    } transition-colors`}>
                                        <MapPin size={13} className={selected ? 'text-[#0b4a59]' : 'text-gray-400'} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${selected ? 'text-[#0b4a59]' : 'text-gray-800'}`}>
                                            {polygon.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-[11px] text-gray-400 tabular-nums">
                                                {polygon.areaHectares?.toFixed(2) ?? '—'} ha
                                            </span>
                                            <StatusBadge status={polygon.status} />
                                            {polygon.analysisResults?.totalForestArea != null && (
                                                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                                    {polygon.analysisResults.totalForestArea.toFixed(1)} ha forest
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <button
                                            onClick={(e) => handleShow(polygon, e)}
                                            title="Show on map"
                                            className="p-1.5 text-[#0b4a59] hover:bg-[#0b4a59]/10 rounded-lg transition-colors"
                                        >
                                            <Eye size={13} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteClick(polygon.id, e)}
                                            title="Delete"
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ConfirmDialog
                open={!!pendingDeleteId}
                onClose={() => setPendingDeleteId(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete zone?"
                message={`"${pendingPolygon?.name ?? 'This zone'}" and its analysis results will be permanently removed.`}
                confirmLabel="Delete"
                cancelLabel="Keep it"
                variant="danger"
                loading={deleting}
            />
        </>
    );
}
