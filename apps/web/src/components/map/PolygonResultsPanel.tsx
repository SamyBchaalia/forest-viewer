// components/PolygonResultsPanel.tsx
'use client';

import { X, Trees, Ruler, PieChart, BarChart3, Leaf } from 'lucide-react';

interface SpeciesDistribution {
    species: string;
    areaHectares: number;
    percentage: number;
}

interface AnalysisResults {
    plotCount?: number;
    speciesDistribution?: SpeciesDistribution[];
    forestTypes?: string[];
    totalForestArea?: number;
    coveragePercentage?: number;
}

interface PolygonResult {
    id: string;
    name: string;
    areaHectares: number;
    analysisResults?: AnalysisResults | null;
    status: string;
    createdAt: string;
}

interface PolygonResultsPanelProps {
    result: PolygonResult;
    onClose: () => void;
}

export function PolygonResultsPanel({ result, onClose }: PolygonResultsPanelProps) {
    const { name, areaHectares, analysisResults, status } = result;

    const stats = analysisResults || {
        speciesDistribution: [],
        totalForestArea: 0,
        coveragePercentage: 0,
        plotCount: 0,
        forestTypes: []
    };

    // Sort species by area (largest first)
    const sortedSpecies = [...(stats.speciesDistribution || [])]
        .sort((a, b) => b.areaHectares - a.areaHectares);

    const totalForestArea = stats.totalForestArea || 0;
    const coveragePercentage = stats.coveragePercentage || 0;
    const hasData = sortedSpecies.length > 0 || (stats.plotCount ?? 0) > 0;

    return (
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="p-4 bg-[#0b4a59] text-white flex items-center justify-between shrink-0 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                        <PieChart size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">{name}</h3>
                        <p className="text-xs text-gray-300">
                            Analysis Status: <span className="capitalize font-medium">{status}</span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Total Area */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                            <Ruler size={16} />
                            <span className="text-xs font-bold uppercase tracking-wide">Total Area</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {areaHectares.toFixed(2)}
                            <span className="text-sm font-normal text-gray-600 ml-1">ha</span>
                        </p>
                    </div>

                    {/* Forest Area */}
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                        <div className="flex items-center gap-2 text-emerald-700 mb-2">
                            <Trees size={16} />
                            <span className="text-xs font-bold uppercase tracking-wide">Forest Cover</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {totalForestArea.toFixed(2)}
                            <span className="text-sm font-normal text-gray-600 ml-1">ha</span>
                        </p>
                        <p className="text-xs text-emerald-600 font-medium mt-1">
                            {coveragePercentage.toFixed(1)}% of polygon
                        </p>
                    </div>

                    {/* Species / Types Count */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-700 mb-2">
                            <Leaf size={16} />
                            <span className="text-xs font-bold uppercase tracking-wide">
                                {sortedSpecies.length > 0 ? 'Species' : 'Types'}
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {sortedSpecies.length > 0 ? sortedSpecies.length : (stats.forestTypes?.length ?? 0)}
                        </p>
                        <p className="text-xs text-amber-600 font-medium mt-1">
                            {stats.plotCount || 0} forest plots
                        </p>
                    </div>
                </div>

                {/* Forest Types */}
                {stats.forestTypes && stats.forestTypes.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Forest Types Found</h4>
                        <div className="flex flex-wrap gap-2">
                            {stats.forestTypes.map((type, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1.5 bg-[#0b4a59]/10 text-[#0b4a59] text-xs rounded-full font-medium border border-[#0b4a59]/20"
                                >
                                    {type}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Species Distribution */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={20} className="text-[#0b4a59]" />
                        <h4 className="font-semibold text-gray-900">Forest Composition</h4>
                    </div>

                    {!hasData ? (
                        <div className="text-center py-8">
                            <Trees size={40} className="mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500">No forest data found in this polygon</p>
                            {status === 'pending' && (
                                <p className="text-xs text-amber-600 mt-2">
                                    Forest data may still be loading. Try reanalyzing later.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedSpecies.map((species, index) => (
                                <div
                                    key={`${species.species}-${index}`}
                                    className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-[#0b4a59] text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h5 className="font-semibold text-gray-900">
                                                    {species.species}
                                                </h5>
                                                <p className="text-xs text-gray-500">
                                                    {species.percentage.toFixed(1)}% of forest area
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-emerald-600">
                                                {species.areaHectares.toFixed(2)}
                                                <span className="text-sm font-normal text-gray-500 ml-1">ha</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mt-3 ml-11">
                                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#0b4a59] to-emerald-500 rounded-full transition-all duration-500"
                                                style={{ width: `${species.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Summary Footer */}
                {hasData && (
                    <div className="bg-[#0b4a59]/5 rounded-xl p-4 border border-[#0b4a59]/20">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Forest Types:</span>
                                <span className="font-semibold text-[#0b4a59]">{stats.forestTypes?.length ?? sortedSpecies.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Forest Plots:</span>
                                <span className="font-semibold text-[#0b4a59]">{stats.plotCount || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Non-Forest Area:</span>
                                <span className="font-semibold text-gray-700">
                                    {(areaHectares - totalForestArea).toFixed(2)} ha
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Analysis Date:</span>
                                <span className="font-semibold text-gray-700">
                                    {new Date(result.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-xl">
                <button
                    onClick={onClose}
                    className="w-full px-4 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors font-medium"
                >
                    Close Analysis
                </button>
            </div>
        </div>
    );
}