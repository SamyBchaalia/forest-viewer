'use client';

import { useEffect } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import { useMapStore } from '@/store/mapStore';
import {
    GET_REGIONS,
    GET_DEPARTEMENTS,
    GET_COMMUNES,
    GET_LIEUX_DITS
} from '@/graphql/geospatial';
import type {
    RegionsResponse,
    DepartementsResponse, DepartementsVariables,
    CommunesResponse, CommunesVariables,
    LieuxDitsResponse, LieuxDitsVariables,
} from '@/graphql/types';
import { TreePine, RotateCcw, ChevronDown, Loader2 } from 'lucide-react';

const REGIONS = [
    { code: 'NORMANDIE',         name: 'Normandie',          lat: 49.1829, lng: 0.3700,  zoom: 7 },
    { code: 'PAYS_DE_LA_LOIRE',  name: 'Pays de la Loire',   lat: 47.7633, lng: -0.3297, zoom: 7 },
    { code: 'CENTRE_VAL_DE_LOIRE', name: 'Centre-Val de Loire', lat: 47.7516, lng: 1.6751, zoom: 7 },
];

interface FilterPanelProps {
    onRegionSelect?: (lat: number, lng: number, zoom: number) => void;
}

function SelectField({
    label,
    value,
    onChange,
    disabled,
    loading: isLoading,
    placeholder,
    children,
}: {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    disabled?: boolean;
    loading?: boolean;
    placeholder: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5 animate-fade-up">
            <label className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span>{label}</span>
                {isLoading && <Loader2 size={11} className="animate-spin text-[#0b4a59]" />}
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={onChange}
                    disabled={disabled || isLoading}
                    className="select-field pr-8"
                >
                    <option value="">{placeholder}</option>
                    {children}
                </select>
                <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
            </div>
        </div>
    );
}

export function FilterPanel({ onRegionSelect }: FilterPanelProps) {
    const { filters, setFilters, resetFilters } = useMapStore();

    const { data: regionsData, loading: loadingRegions } = useQuery<RegionsResponse>(GET_REGIONS);
    const [getDepartements, { data: deptData, loading: loadingDepts }] = useLazyQuery<DepartementsResponse, DepartementsVariables>(GET_DEPARTEMENTS);
    const [getCommunes, { data: communeData, loading: loadingCommunes }] = useLazyQuery<CommunesResponse, CommunesVariables>(GET_COMMUNES);
    const [getLieuxDits, { data: lieuxDitsData, loading: loadingLieuxDits }] = useLazyQuery<LieuxDitsResponse, LieuxDitsVariables>(GET_LIEUX_DITS);

    useEffect(() => {
        if (filters.regionCode) getDepartements({ variables: { regionCode: filters.regionCode } });
    }, [filters.regionCode, getDepartements]);

    useEffect(() => {
        if (filters.departementCode) getCommunes({ variables: { departementCode: filters.departementCode } });
    }, [filters.departementCode, getCommunes]);

    useEffect(() => {
        if (filters.communeCode) getLieuxDits({ variables: { communeCode: filters.communeCode } });
    }, [filters.communeCode, getLieuxDits]);

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const match = REGIONS.find(r => r.code === value);
        if (match && onRegionSelect) onRegionSelect(match.lat, match.lng, match.zoom);
        setFilters({ regionCode: value || undefined, departementCode: undefined, communeCode: undefined, lieuDit: undefined });
    };

    const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setFilters({ departementCode: value || undefined, communeCode: undefined, lieuDit: undefined });
    };

    const handleCommuneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setFilters({ communeCode: value || undefined, lieuDit: undefined });
    };

    const handleLieuDitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters({ lieuDit: e.target.value || undefined });
    };

    const hasFilters = !!(filters.regionCode || filters.departementCode || filters.communeCode);
    const activeCount = [filters.regionCode, filters.departementCode, filters.communeCode, filters.lieuDit].filter(Boolean).length;

    return (
        <div className="w-full overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#0b4a59]/10 flex items-center justify-center">
                        <TreePine size={14} className="text-[#0b4a59]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Forest Explorer</h3>
                        <p className="text-[11px] text-gray-400 leading-none mt-0.5">Filter by area</p>
                    </div>
                </div>
                {activeCount > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0b4a59]/10 text-[#0b4a59]">
                        {activeCount} active
                    </span>
                )}
            </div>

            <div className="p-4 space-y-3.5">
                <SelectField
                    label="Region"
                    value={filters.regionCode || ''}
                    onChange={handleRegionChange}
                    loading={loadingRegions}
                    placeholder="Select a region…"
                >
                    <optgroup label="Regions">
                        {REGIONS.map((r) => (
                            <option key={r.code} value={r.code}>{r.name}</option>
                        ))}
                    </optgroup>
                    {regionsData?.regions && regionsData.regions.length > 0 && (
                        <optgroup label="Other regions">
                            {regionsData.regions.map((code: string) => (
                                <option key={code} value={code}>Region {code}</option>
                            ))}
                        </optgroup>
                    )}
                </SelectField>

                {filters.regionCode && !REGIONS.find(r => r.code === filters.regionCode) && (
                    <SelectField
                        label="Department"
                        value={filters.departementCode || ''}
                        onChange={handleDeptChange}
                        loading={loadingDepts}
                        placeholder="Select a department…"
                    >
                        {deptData?.departements.map((code: string) => (
                            <option key={code} value={code}>Department {code}</option>
                        ))}
                    </SelectField>
                )}

                {filters.departementCode && (
                    <SelectField
                        label="Commune"
                        value={filters.communeCode || ''}
                        onChange={handleCommuneChange}
                        loading={loadingCommunes}
                        placeholder="Select a commune…"
                    >
                        {communeData?.communes.map((code: string) => (
                            <option key={code} value={code}>Commune {code}</option>
                        ))}
                    </SelectField>
                )}

                {filters.communeCode && (
                    <SelectField
                        label="Lieu-dit"
                        value={filters.lieuDit || ''}
                        onChange={handleLieuDitChange}
                        loading={loadingLieuxDits}
                        placeholder="Select a lieu-dit…"
                    >
                        {lieuxDitsData?.lieuxDits.map((name: string) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </SelectField>
                )}

                {hasFilters && (
                    <button
                        onClick={resetFilters}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
                    >
                        <RotateCcw size={12} />
                        Clear filters
                    </button>
                )}
            </div>
        </div>
    );
}
