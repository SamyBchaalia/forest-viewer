'use client';

import { X, MapPin, Trees, Building2, Home, Landmark, FileType, MapPinned } from 'lucide-react';
import { FeatureInfoResponse } from '@/services/wmsFeatureInfo';

interface FeatureQueryPopupProps {
    lng: number;
    lat: number;
    data: {
        region: FeatureInfoResponse | null;
        department: FeatureInfoResponse | null;
        commune: FeatureInfoResponse | null;
        forest: FeatureInfoResponse | null;
    };
    onClose: () => void;
    onSelectRegion?: (code: string) => void;
    onSelectDepartment?: (code: string) => void;
    onSelectCommune?: (code: string) => void;
}

export function FeatureQueryPopup({
                                      lng,
                                      lat,
                                      data,
                                      onClose,
                                      onSelectRegion,
                                      onSelectDepartment,
                                      onSelectCommune,
                                  }: FeatureQueryPopupProps) {
    const hasAnyData = data.region || data.department || data.commune || data.forest;

    // Helper to safely get properties
    const getProps = (feature: FeatureInfoResponse | null) => {
        return feature?.features?.[0]?.properties || {};
    };

    // Helper to format property keys for display
    const formatKey = (key: string) => {
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    // Helper to format values
    const formatValue = (value: any) => {
        if (value === null || value === undefined) return '-';
        if (typeof value === 'number') {
            // Format large numbers with separators
            if (value > 1000) return value.toLocaleString();
            return value.toString();
        }
        if (typeof value === 'string' && !isNaN(Date.parse(value))) {
            // Format dates
            return new Date(value).toLocaleDateString();
        }
        return String(value);
    };

    // ==================== FOREST DATA (Keep as is) ====================
    const forestProps = getProps(data.forest);
    const forestId = forestProps.ID || forestProps.id || null;
    const forestCode = forestProps.CODE_TFV || forestProps.code_tfv || null;
    const forestType = forestProps.TFV || forestProps.tfv || forestProps.type_foret || null;
    const forestCategory = forestProps.TFV_G11 || forestProps.tfv_g11 || null;
    const forestSpecies = forestProps.ESSENCE || forestProps.essence || forestProps.essences || null;
    const forestName = forestProps.name || forestProps.nom || null;
    const forestLayer = forestProps.layer || null;
    const hasForestData = forestId || forestType || forestSpecies;

    // Get display name for each layer
    const regionProps = getProps(data.region);
    const regionName = regionProps.nom_officiel || regionProps.nom || regionProps.name || regionProps.libelle || 'Region';

    const deptProps = getProps(data.department);
    const deptName = deptProps.nom_officiel || deptProps.nom || deptProps.name || deptProps.libelle || 'Department';

    const communeProps = getProps(data.commune);
    const communeName = communeProps.nom_officiel || communeProps.nom || communeProps.name || communeProps.libelle || 'Commune';

    // Filter out internal/technical properties for cleaner display
    const excludeKeys = ['geom', 'geometry', 'the_geom', 'wkb_geometry', 'id', 'ID'];

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-96 max-h-[80vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <MapPinned size={18} />
                    <span className="font-semibold text-sm">Location Details</span>
                </div>
                <button
                    onClick={onClose}
                    className="hover:bg-white/20 rounded p-1.5 transition-colors"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {!hasAnyData ? (
                    <div className="text-center py-8">
                        <MapPin size={40} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-500 font-medium">No data available</p>
                        <p className="text-xs text-gray-400 mt-1">
                            {lat.toFixed(5)}, {lng.toFixed(5)}
                        </p>
                    </div>
                ) : (
                    <>
                        {hasForestData && (
                            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-3 pb-2 border-b border-emerald-200">
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                        <Trees size={22} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Forest Parcel</p>
                                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                            {forestName || 'Forest Area'}
                                        </h3>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    {forestId && (
                                        <div className="flex justify-between items-start">
                                            <span className="text-emerald-600 font-medium shrink-0">ID:</span>
                                            <span className="font-mono text-xs text-gray-700 bg-white px-2 py-1 rounded border border-emerald-100 break-all text-right max-w-[200px]">
                                                {forestId}
                                            </span>
                                        </div>
                                    )}
                                    {forestType && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-emerald-600 font-medium">Type:</span>
                                            <span className="text-gray-800 font-medium bg-emerald-100/50 px-2 py-1 rounded">
                                                {forestType}
                                            </span>
                                        </div>
                                    )}
                                    {forestCategory && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-emerald-600 font-medium">Category:</span>
                                            <span className="text-gray-700">{forestCategory}</span>
                                        </div>
                                    )}
                                    {forestSpecies && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-emerald-600 font-medium">Species:</span>
                                            <span className="text-gray-800 font-medium">{forestSpecies}</span>
                                        </div>
                                    )}
                                    {forestCode && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-emerald-600 font-medium">Code TFV:</span>
                                            <span className="font-mono text-xs text-gray-600">{forestCode}</span>
                                        </div>
                                    )}
                                </div>

                                {forestLayer && (
                                    <div className="mt-3 pt-2 border-t border-emerald-200 flex items-center gap-2 text-xs text-emerald-600">
                                        <FileType size={12} />
                                        <span className="font-medium">Source: {forestLayer}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ==================== REGION SECTION (Dynamic) ==================== */}
                        {Object.keys(regionProps).length > 0 && (
                            <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-3 pb-2 border-b border-red-200">
                                    <div className="p-2 bg-red-100 rounded-lg">
                                        <Landmark size={22} className="text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Region</p>
                                        <h3 className="text-lg font-bold text-gray-900 leading-tight">{regionName}</h3>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    {Object.entries(regionProps)
                                        .filter(([key]) => !excludeKeys.includes(key))
                                        .map(([key, value]) => (
                                            <div key={key} className="flex justify-between items-start gap-2">
                                                <span className="text-red-600 font-medium shrink-0">{formatKey(key)}:</span>
                                                <span className="text-gray-700 text-right break-all max-w-[200px]">
                                                    {formatValue(value)}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* ==================== DEPARTMENT SECTION (Dynamic) ==================== */}
                        {Object.keys(deptProps).length > 0 && (
                            <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-3 pb-2 border-b border-orange-200">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <Building2 size={22} className="text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Department</p>
                                        <h3 className="text-lg font-bold text-gray-900 leading-tight">{deptName}</h3>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    {Object.entries(deptProps)
                                        .filter(([key]) => !excludeKeys.includes(key))
                                        .map(([key, value]) => (
                                            <div key={key} className="flex justify-between items-start gap-2">
                                                <span className="text-orange-600 font-medium shrink-0">{formatKey(key)}:</span>
                                                <span className="text-gray-700 text-right break-all max-w-[200px]">
                                                    {formatValue(value)}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* ==================== COMMUNE SECTION (Dynamic) ==================== */}
                        {Object.keys(communeProps).length > 0 && (
                            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-3 pb-2 border-b border-blue-200">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Home size={22} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Commune</p>
                                        <h3 className="text-lg font-bold text-gray-900 leading-tight">{communeName}</h3>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    {Object.entries(communeProps)
                                        .filter(([key]) => !excludeKeys.includes(key))
                                        .map(([key, value]) => (
                                            <div key={key} className="flex justify-between items-start gap-2">
                                                <span className="text-blue-600 font-medium shrink-0">{formatKey(key)}:</span>
                                                <span className="text-gray-700 text-right break-all max-w-[200px]">
                                                    {formatValue(value)}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* ==================== FOREST SECTION (Keep as is) ==================== */}


                         {/*Debug Info (Development Only)*/}
                      {/*  {process.env.NODE_ENV === 'development' && (
                            <details className="border rounded-lg overflow-hidden">
                                <summary className="bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-200">
                                    Debug: Raw Response Data
                                </summary>
                                <div className="p-3 bg-gray-50 text-[10px] overflow-x-auto max-h-40">
                                    <pre>{JSON.stringify(data, null, 2)}</pre>
                                </div>
                            </details>
                        )}*/}
                    </>
                )}
            </div>

            {/* Footer - Fixed at bottom */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 shrink-0">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-mono">Lat: {lat.toFixed(6)}</span>
                    <span className="font-mono">Lng: {lng.toFixed(6)}</span>
                </div>
            </div>
        </div>
    );
}