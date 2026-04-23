import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface MapFilters {
    regionCode?: string;
    departementCode?: string;
    communeCode?: string;
    lieuDit?: string;
}

const DEFAULT_STATE = {
    lng: 2.2137,
    lat: 46.2276,
    zoom: 5,
    filters: {} as MapFilters,
    showCadastre: false,
};

interface MapState {
    lng: number;
    lat: number;
    zoom: number;
    filters: MapFilters;
    showCadastre: boolean;
    setViewState: (lng: number, lat: number, zoom: number) => void;
    setFilters: (filters: MapFilters) => void;
    setShowCadastre: (show: boolean) => void;
    resetFilters: () => void;
    resetAll: () => void;
}

export const useMapStore = create<MapState>()(
    persist(
        (set) => ({
            ...DEFAULT_STATE,

            setViewState: (lng, lat, zoom) => set({ lng, lat, zoom }),

            setFilters: (filters) => set((state) => ({
                filters: { ...state.filters, ...filters },
            })),

            setShowCadastre: (show) => set({ showCadastre: show }),

            // Clears only the filter selections — does not move the map
            resetFilters: () => set({ filters: {} }),

            // Full reset used on logout — wipes position, filters, and preferences
            resetAll: () => set({ ...DEFAULT_STATE }),
        }),
        {
            name: 'forest-bd-map-state',
            storage: createJSONStorage(() => localStorage),
            // Only persist data fields, not action functions
            partialize: (state) => ({
                lng: state.lng,
                lat: state.lat,
                zoom: state.zoom,
                filters: state.filters,
                showCadastre: state.showCadastre,
            }),
        }
    )
);
