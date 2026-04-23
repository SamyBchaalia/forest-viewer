'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { useMapStore, MapFilters } from '@/store/mapStore';
import { apolloClient } from '@/lib/apollo-client';
import { useAuthStore } from '@/store/authStore';
import { UPDATE_MAP_STATE } from '@/graphql/auth';
import { GET_MY_POLYGONS, SAVE_POLYGON_MUTATION } from '@/graphql/polygons';
import { GET_FOREST_PLOTS } from '@/graphql/geospatial';
import type {
    UpdateMapStateResponse, UpdateMapStateVariables,
    SavePolygonResponse, SavePolygonVariables,
    MyPolygonsResponse,
    ForestPlotsResponse, ForestPlotsVariables,
} from '@/graphql/types';
import { queryAllLayers } from '@/services/wmsFeatureInfo';
import { WMS_LAYERS, getWMSTileUrl, WMSLayerConfig } from '@/services/wmsLayers';

import { FilterPanel } from './FilterPanel';
import { SavePolygonModal } from './SavePolygonModal';
import { PolygonResultsPanel } from './PolygonResultsPanel';
import { SavedPolygonsList } from './SavedPolygonsList';
import { LayerControlPanel } from './LayerControlPanel';
import { FeatureQueryPopup } from './FeatureQueryPopup';

import { Layers, LogOut, Map as MapIcon, Satellite, Mountain, Sun, Moon, Pencil, TreePine, MapPin } from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Base layer configurations
const BASE_LAYERS = {
    satellite: {
        url: 'mapbox://styles/mapbox/satellite-v9',
        label: 'Satellite',
        icon: Satellite
    },
    streets: {
        url: 'mapbox://styles/mapbox/streets-v12',
        label: 'Streets',
        icon: MapIcon
    },
    terrain: {
        url: 'mapbox://styles/mapbox/outdoors-v12',
        label: 'Terrain',
        icon: Mountain
    },
    light: {
        url: 'mapbox://styles/mapbox/light-v11',
        label: 'Light',
        icon: Sun
    },
    dark: {
        url: 'mapbox://styles/mapbox/dark-v11',
        label: 'Dark',
        icon: Moon
    }
};

// Hardcoded regions for navigation
const REGIONS = [
    { code: 'NORMANDIE',            name: 'Normandie',             lat: 49.1829, lng:  0.3700,  zoom: 7 },
    { code: 'PAYS_DE_LA_LOIRE',     name: 'Pays de la Loire',      lat: 47.7633, lng: -0.3297,  zoom: 7 },
    { code: 'CENTRE_VAL_DE_LOIRE',  name: 'Centre-Val de Loire',   lat: 47.7516, lng:  1.6751,  zoom: 7 },
    { code: 'AUVERGNE_RHONE_ALPES', name: 'Auvergne-Rhône-Alpes', lat: 45.7597, lng:  4.8422,  zoom: 7 },
];

export function ForestMap() {
    const [drawnGeometry, setDrawnGeometry] = useState<any>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [showResults, setShowResults] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [currentZoom, setCurrentZoom] = useState(5);
    const [wmsLayers, setWmsLayers] = useState<WMSLayerConfig[]>(WMS_LAYERS);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isQuerying, setIsQuerying] = useState(false);
    const [baseLayer, setBaseLayer] = useState<keyof typeof BASE_LAYERS>('satellite');
    const [queryPopup, setQueryPopup] = useState<{
        visible: boolean;
        lng: number;
        lat: number;
        data: any;
    } | null>(null);

    const [viewportBounds, setViewportBounds] = useState<{
        minLng: number; minLat: number; maxLng: number; maxLat: number;
    } | null>(null);
    const [leftTab, setLeftTab] = useState<'explorer' | 'polygons'>('explorer');

    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const draw = useRef<MapboxDraw | null>(null);
    const boundsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Synchronous ref so handleMapClick never queries WMS while drawing is active.
    // React state updates are batched; this ref is updated immediately.
    const isDrawingRef = useRef(false);

    const { lng, lat, zoom, filters, showCadastre, setViewState, setShowCadastre, setFilters, resetAll } = useMapStore();
    const { user, logout, updateUser } = useAuthStore();

    // Refs keep the moveend handler in sync with the latest state without
    // requiring the map to reinitialise on every filter or layer change
    const filtersRef = useRef(filters);
    const wmsLayersRef = useRef(wmsLayers);
    useEffect(() => { filtersRef.current = filters; }, [filters]);
    useEffect(() => { wmsLayersRef.current = wmsLayers; }, [wmsLayers]);

    // Cancel drawing on Escape key
    useEffect(() => {
        if (!isDrawing) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            isDrawingRef.current = false;
            draw.current?.changeMode('simple_select');
            draw.current?.deleteAll();
            if (map.current) map.current.getCanvas().style.cursor = '';
            setIsDrawing(false);
            setDrawnGeometry(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isDrawing]);

    const { data: savedPolygonsData, refetch: refetchPolygons } = useQuery<MyPolygonsResponse>(GET_MY_POLYGONS);
    const [updateMapState] = useMutation<UpdateMapStateResponse, UpdateMapStateVariables>(UPDATE_MAP_STATE);
    const [savePolygon] = useMutation<SavePolygonResponse, SavePolygonVariables>(SAVE_POLYGON_MUTATION);
    const [getForestPlots, { data: forestPlotsData, loading: forestPlotsLoading }] = useLazyQuery<ForestPlotsResponse, ForestPlotsVariables>(GET_FOREST_PLOTS);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current) return;

        const initialLng = user?.lastLng ?? lng;
        const initialLat = user?.lastLat ?? lat;
        const initialZoom = user?.lastZoom ?? zoom;

        // Restore filters from last session
        if (user?.lastFilters && Object.keys(user.lastFilters).length > 0) {
            setFilters(user.lastFilters as MapFilters);
        }

        // Restore layer visibility from last session
        const restoredLayers = user?.lastActiveLayers
            ? WMS_LAYERS.map(l => ({ ...l, visible: user.lastActiveLayers!.includes(l.id) }))
            : WMS_LAYERS;
        setWmsLayers(restoredLayers);

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: BASE_LAYERS.satellite.url,
            center: [initialLng, initialLat],
            zoom: initialZoom,
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

        // Initialize Mapbox Draw — no built-in buttons (we drive it from our own toolbar)
        draw.current = new MapboxDraw({
            displayControlsDefault: false,
            controls: {},
            defaultMode: 'simple_select'
        });
        map.current.addControl(draw.current, 'top-right');

        // Push Mapbox native controls below the navbar (52px navbar + 8px gap)
        const ctrlTopRight = mapContainer.current!.querySelector('.mapboxgl-ctrl-top-right') as HTMLElement | null;
        if (ctrlTopRight) ctrlTopRight.style.top = '60px';

        // Track zoom for layer visibility
        const updateZoom = () => {
            const newZoom = map.current!.getZoom();
            setCurrentZoom(newZoom);
            updateWMSLayerVisibility(newZoom);
        };

        map.current.on('load', () => {
            setMapLoaded(true);
            addWMSLayers(map.current!, restoredLayers);
            updateZoom();
        });

        map.current.on('zoom', updateZoom);

        // Handle polygon creation — cast to any because MapboxDraw events are not
        // in the Mapbox GL TS type definitions
        map.current.on('draw.create', (e: any) => {
            const geometry = e.features[0].geometry;
            isDrawingRef.current = false;
            map.current!.getCanvas().style.cursor = '';
            setDrawnGeometry(geometry);
            setShowSaveModal(true);
            setIsDrawing(false);
        });

        // Handle draw mode changes
        map.current.on('draw.modechange', (e: any) => {
            const drawing = e.mode === 'draw_polygon';
            isDrawingRef.current = drawing;
            if (map.current) map.current.getCanvas().style.cursor = drawing ? 'crosshair' : '';
            setIsDrawing(drawing);
        });

        // Save map state on move and capture viewport bounds for vector query
        map.current.on('moveend', () => {
            const center = map.current!.getCenter();
            const newZoom = map.current!.getZoom();
            setViewState(center.lng, center.lat, newZoom);

            if (user) {
                updateMapState({
                    variables: {
                        input: {
                            lng: center.lng,
                            lat: center.lat,
                            zoom: newZoom,
                            filters: filtersRef.current,
                            activeLayers: wmsLayersRef.current.filter(l => l.visible).map(l => l.id),
                        },
                    },
                }).then((result) => {
                    if (result.data) updateUser(result.data.updateMapState);
                }).catch(console.error);
            }

            // Debounce viewport bounds update to avoid firing the plots query on every pixel
            if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
            boundsDebounceRef.current = setTimeout(() => {
                const b = map.current!.getBounds();
                if (!b) return;
                setViewportBounds({
                    minLng: b.getWest(),
                    minLat: b.getSouth(),
                    maxLng: b.getEast(),
                    maxLat: b.getNorth(),
                });
            }, 300);
        });

        // Feature query on click — skip entirely while drawing to avoid WMS interference
        const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
            if (isDrawingRef.current) return;

            const selected = draw.current?.getSelected();
            if ((selected?.features?.length ?? 0) > 0) return;

            setIsQuerying(true);
            const { lng, lat } = e.lngLat;
            const data = await queryAllLayers(lng, lat, map.current!);
            setIsQuerying(false);

            if (data?.region || data?.department || data?.commune || data?.forest) {
                setQueryPopup({ visible: true, lng, lat, data });
            }
        };

        map.current.on('click', handleMapClick);

        return () => {
            map.current?.remove();
        };
    }, [user?.id]);

    // Handle base layer change
    const handleBaseLayerChange = (layerKey: keyof typeof BASE_LAYERS) => {
        if (!map.current) return;

        setBaseLayer(layerKey);
        map.current.setStyle(BASE_LAYERS[layerKey].url);

        // Re-add all layers after style change
        map.current.once('style.load', () => {
            addWMSLayers(map.current!);
            if (savedPolygonsData?.myPolygons) {
                displaySavedPolygonsOnMap(map.current!, savedPolygonsData.myPolygons, false);
            }
            // Re-trigger forest plots render by briefly toggling mapLoaded
            setMapLoaded(false);
            setTimeout(() => setMapLoaded(true), 0);
        });
    };

    // Add WMS layers — accepts explicit layers to avoid stale closure reads
    const addWMSLayers = (mapInstance: mapboxgl.Map, layers: WMSLayerConfig[] = wmsLayers) => {
        layers.forEach((layer) => {
            const sourceId = `wms-${layer.id}`;
            const layerId = `wms-layer-${layer.id}`;
            if (mapInstance.getLayer(layerId)) mapInstance.removeLayer(layerId);
            if (mapInstance.getSource(sourceId)) mapInstance.removeSource(sourceId);
        });

        layers.forEach((layer) => {
            const sourceId = `wms-${layer.id}`;
            const layerId = `wms-layer-${layer.id}`;

            mapInstance.addSource(sourceId, {
                type: 'raster',
                tiles: [getWMSTileUrl(layer.layerName)],
                tileSize: 256,
                scheme: 'xyz',
            });

            mapInstance.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                paint: { 'raster-opacity': layer.visible ? layer.opacity : 0 },
                layout: { visibility: layer.visible ? 'visible' : 'none' },
            });
        });
        updateWMSLayerVisibility(mapInstance.getZoom());
    };

    const updateWMSLayerVisibility = (zoom: number) => {
        if (!map.current) return;
        wmsLayers.forEach((layer) => {
            const layerId = `wms-layer-${layer.id}`;
            if (!map.current!.getLayer(layerId)) return;
            const shouldBeVisible = layer.visible && zoom >= layer.minZoom && zoom <= layer.maxZoom;
            map.current!.setLayoutProperty(layerId, 'visibility', shouldBeVisible ? 'visible' : 'none');
        });
    };

    const handleToggleLayer = (layerId: string) => {
        const updatedLayers = wmsLayers.map((l) => l.id === layerId ? { ...l, visible: !l.visible } : l);
        setWmsLayers(updatedLayers);
        if (map.current) {
            const layer = updatedLayers.find(l => l.id === layerId);
            const mapLayerId = `wms-layer-${layerId}`;
            if (layer && map.current.getLayer(mapLayerId)) {
                const shouldBeVisible = layer.visible && currentZoom >= layer.minZoom && currentZoom <= layer.maxZoom;
                map.current.setLayoutProperty(mapLayerId, 'visibility', shouldBeVisible ? 'visible' : 'none');
            }
        }
    };

    // Start drawing mode
    const handleDrawStart = () => {
        if (!draw.current || !mapLoaded) return;
        isDrawingRef.current = true;
        draw.current.changeMode('draw_polygon');
        setIsDrawing(true);
        if (map.current) map.current.getCanvas().style.cursor = 'crosshair';
    };

    // Cancel drawing — revert to select mode and discard any partial polygon
    const handleDrawCancel = () => {
        if (!draw.current) return;
        isDrawingRef.current = false;
        draw.current.changeMode('simple_select');
        draw.current.deleteAll();
        setIsDrawing(false);
        setDrawnGeometry(null);
        if (map.current) map.current.getCanvas().style.cursor = '';
    };

    // Handle polygon save
    const handleSavePolygon = async (name: string) => {
        if (!drawnGeometry) return;

        try {
            const { data } = await savePolygon({
                variables: {
                    input: {
                        name: name.trim(),
                        geometry: drawnGeometry
                    }
                }
            });

            setAnalysisResult(data?.savePolygon);
            setShowResults(true);
            setShowSaveModal(false);

            draw.current?.deleteAll();
            setDrawnGeometry(null);
            refetchPolygons();
        } catch (error) {
            console.error('Error saving polygon:', error);
            alert('Failed to save polygon. Please try again.');
        }
    };

    // Handle region navigation
    const handleRegionNavigate = (lat: number, lng: number, zoom: number) => {
        if (!map.current) return;
        map.current.flyTo({
            center: [lng, lat],
            zoom: zoom,
            essential: true
        });
    };

    // Display saved polygons
    useEffect(() => {
        if (!map.current || !savedPolygonsData?.myPolygons || !mapLoaded) return;

        const timer = setTimeout(() => {
            displaySavedPolygonsOnMap(map.current!, savedPolygonsData.myPolygons, false);
        }, 500);

        return () => clearTimeout(timer);
    }, [savedPolygonsData, mapLoaded]);

    // Fire forest plots query when viewport or admin filters change — only at zoom >= 10
    useEffect(() => {
        if (!mapLoaded || currentZoom < 10 || !viewportBounds) return;
        getForestPlots({
            variables: { filters: { ...filters, bounds: viewportBounds } },
        });
    }, [viewportBounds, filters, mapLoaded, currentZoom]);

    // Render forest plot vector layer whenever query results arrive or zoom crosses the threshold
    useEffect(() => {
        if (!map.current || !mapLoaded) return;

        if (map.current.getLayer('forest-plots-fill')) map.current.removeLayer('forest-plots-fill');
        if (map.current.getLayer('forest-plots-outline')) map.current.removeLayer('forest-plots-outline');
        if (map.current.getSource('forest-plots')) map.current.removeSource('forest-plots');

        if (!forestPlotsData?.forestPlots || currentZoom < 10) return;

        const features = (forestPlotsData.forestPlots as any[])
            .filter((p) => p.geometry)
            .map((p) => ({
                type: 'Feature' as const,
                geometry: p.geometry,
                properties: {
                    id: p.id,
                    codeCommune: p.codeCommune,
                    lieuDit: p.lieuDit,
                    essences: Array.isArray(p.essences) ? p.essences.join(', ') : '',
                    surfaceHectares: p.surfaceHectares,
                    typeForet: p.typeForet,
                },
            }));

        if (features.length === 0) return;

        map.current.addSource('forest-plots', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features } as any,
        });
        map.current.addLayer({
            id: 'forest-plots-fill',
            type: 'fill',
            source: 'forest-plots',
            paint: { 'fill-color': '#228B22', 'fill-opacity': 0.25 },
        });
        map.current.addLayer({
            id: 'forest-plots-outline',
            type: 'line',
            source: 'forest-plots',
            paint: { 'line-color': '#006400', 'line-width': 1 },
        });

        // Show plot attributes on click
        map.current.on('click', 'forest-plots-fill', (e) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties!;
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="font-family:sans-serif;font-size:13px;line-height:1.6">
                        <strong>Forest Plot</strong><br/>
                        <b>Commune:</b> ${props.codeCommune ?? '—'}<br/>
                        <b>Lieu-dit:</b> ${props.lieuDit ?? '—'}<br/>
                        <b>Type:</b> ${props.typeForet ?? '—'}<br/>
                        <b>Essences:</b> ${props.essences || '—'}<br/>
                        <b>Surface:</b> ${props.surfaceHectares ? props.surfaceHectares.toFixed(2) + ' ha' : '—'}
                    </div>
                `)
                .addTo(map.current!);
        });

        map.current.on('mouseenter', 'forest-plots-fill', () => {
            map.current!.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'forest-plots-fill', () => {
            map.current!.getCanvas().style.cursor = '';
        });
    }, [forestPlotsData, mapLoaded, currentZoom]);

    const displaySavedPolygonsOnMap = (mapInstance: mapboxgl.Map, polygons: any[], fitBounds: boolean = false) => {
        if (!mapInstance.isStyleLoaded()) {
            setTimeout(() => displaySavedPolygonsOnMap(mapInstance, polygons, fitBounds), 200);
            return;
        }

        // Clean up existing
        if (mapInstance.getLayer('saved-polygons-fill')) mapInstance.removeLayer('saved-polygons-fill');
        if (mapInstance.getLayer('saved-polygons-outline')) mapInstance.removeLayer('saved-polygons-outline');
        if (mapInstance.getSource('saved-polygons')) mapInstance.removeSource('saved-polygons');

        if (polygons.length === 0) return;

        const validPolygons = polygons.map((p) => {
            let geometry = p.geometry;
            if (typeof geometry === 'string') {
                try { geometry = JSON.parse(geometry); } catch { return null; }
            }
            if (!geometry?.coordinates || !Array.isArray(geometry.coordinates)) return null;
            return { ...p, geometry };
        }).filter(Boolean);

        if (validPolygons.length === 0) return;

        const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: validPolygons.map((p) => ({
                type: 'Feature' as const,
                id: p.id,
                geometry: p.geometry,
                properties: { name: p.name, area: p.areaHectares, status: p.status },
            })),
        };

        try {
            mapInstance.addSource('saved-polygons', { type: 'geojson', data: geojson });
            mapInstance.addLayer({
                id: 'saved-polygons-fill',
                type: 'fill',
                source: 'saved-polygons',
                paint: { 'fill-color': '#0b4a59', 'fill-opacity': 0.2 },
            });
            mapInstance.addLayer({
                id: 'saved-polygons-outline',
                type: 'line',
                source: 'saved-polygons',
                paint: { 'line-color': '#0b4a59', 'line-width': 2, 'line-dasharray': [2, 2] },
            });
        } catch (error) {
            console.error('Error adding polygons:', error);
        }
    };

    const handleLogout = () => {
        resetAll();
        apolloClient.clearStore();
        logout();
        window.location.href = '/auth';
    };

    return (
        <div className="relative w-full h-screen bg-gray-900">
            {/* Full-screen map canvas */}
            <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100vh' }} />

            {/* ── Navbar ───────────────────────────────────────────── */}
            <nav className="absolute top-0 left-0 right-0 h-[52px] z-30 bg-white/96 backdrop-blur-md border-b border-gray-100 shadow-sm flex items-center px-4 gap-3">
                <div className="flex items-center gap-2 font-semibold text-[#0b4a59] shrink-0">
                    <TreePine size={20} />
                    <span className="hidden sm:block text-sm">Forest BD</span>
                </div>
                <div className="flex-1" />
                <button
                    onClick={() => setShowCadastre(!showCadastre)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        showCadastre
                            ? 'bg-[#0b4a59] text-white border-[#0b4a59]'
                            : 'text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                >
                    <Layers size={14} />
                    <span className="hidden sm:block">Cadastre</span>
                </button>
                {user?.email && (
                    <span className="hidden md:block text-xs text-gray-400 truncate max-w-[160px]">{user.email}</span>
                )}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-gray-200 transition-all shrink-0"
                >
                    <LogOut size={14} />
                    <span className="hidden sm:block">Logout</span>
                </button>
            </nav>

            {/* ── Left panel: Explorer / My Zones tabs ─────────────── */}
            <div className="absolute top-[60px] left-4 z-10 w-72 max-h-[calc(100vh-72px)] flex flex-col bg-white/96 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="flex shrink-0 p-1 m-2 bg-gray-100 rounded-xl gap-1">
                    <button
                        onClick={() => setLeftTab('explorer')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                            leftTab === 'explorer'
                                ? 'bg-white text-[#0b4a59] shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <TreePine size={13} />
                        Explorer
                    </button>
                    <button
                        onClick={() => setLeftTab('polygons')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                            leftTab === 'polygons'
                                ? 'bg-white text-[#0b4a59] shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <MapPin size={13} />
                        My Zones
                    </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {leftTab === 'explorer' ? (
                        <FilterPanel onRegionSelect={handleRegionNavigate} />
                    ) : (
                        <SavedPolygonsList
                            onSelectPolygon={(p) => {
                                setAnalysisResult(p);
                                setShowResults(true);
                            }}
                        />
                    )}
                </div>
            </div>

            {/* ── Right toolbar: Draw Zone + Layers — below Mapbox native nav (offset 56px + ~154px) ── */}
            <div className="absolute top-[215px] right-[66px] z-10 flex flex-col gap-2 items-end">
                <button
                    onClick={handleDrawStart}
                    title="Draw a forest zone to analyse species and surface area"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border text-sm font-medium transition-all ${
                        isDrawing
                            ? 'bg-[#0b4a59] text-white border-[#0b4a59]'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    <Pencil size={16} />
                    {isDrawing ? 'Drawing…' : 'Draw Zone'}
                </button>
                <LayerControlPanel
                    layers={wmsLayers}
                    onToggleLayer={handleToggleLayer}
                    currentZoom={currentZoom}
                />
            </div>

            {/* ── Drawing instruction banner ── */}
            {isDrawing && (
                <div className="absolute top-[60px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-none">
                    <div className="flex items-center gap-3 bg-[#0b4a59] text-white px-5 py-2.5 rounded-full text-sm shadow-xl whitespace-nowrap">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse shrink-0" />
                        Click to add points · Double-click to close the polygon
                    </div>
                    <button
                        onClick={handleDrawCancel}
                        className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 bg-white text-gray-700 rounded-full text-xs font-medium shadow-xl border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all whitespace-nowrap"
                    >
                        ✕ Cancel
                    </button>
                </div>
            )}

            {/* ── Base layer selector (bottom-right) ── */}
            <div className="absolute bottom-4 right-4 z-10">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1.5">Base Map</p>
                    <div className="flex flex-col gap-0.5">
                        {(Object.keys(BASE_LAYERS) as Array<keyof typeof BASE_LAYERS>).map((key) => {
                            const { label, icon: Icon } = BASE_LAYERS[key];
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleBaseLayerChange(key)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        baseLayer === key
                                            ? 'bg-[#0b4a59] text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon size={14} />
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            {showSaveModal && drawnGeometry && (
                <SavePolygonModal
                    geometry={drawnGeometry}
                    onClose={() => {
                        setShowSaveModal(false);
                        setDrawnGeometry(null);
                        draw.current?.deleteAll();
                    }}
                    onSaved={handleSavePolygon}
                />
            )}

            {showResults && analysisResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <PolygonResultsPanel
                        result={analysisResult}
                        onClose={() => setShowResults(false)}
                    />
                </div>
            )}

            {queryPopup?.visible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className="pointer-events-auto">
                        <FeatureQueryPopup
                            lng={queryPopup.lng}
                            lat={queryPopup.lat}
                            data={queryPopup.data}
                            onClose={() => setQueryPopup(null)}
                            onSelectRegion={(code) => {
                                setFilters({ regionCode: code });
                                setQueryPopup(null);
                            }}
                            onSelectDepartment={(code) => {
                                setFilters({ ...filters, departementCode: code });
                                setQueryPopup(null);
                            }}
                            onSelectCommune={(code) => {
                                setFilters({ ...filters, communeCode: code });
                                setQueryPopup(null);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ── Status indicators ── */}
            {isQuerying && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-white rounded-lg shadow-lg px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-4 h-4 border-2 border-[#0b4a59] border-t-transparent rounded-full animate-spin" />
                        Querying layers…
                    </div>
                </div>
            )}

            {forestPlotsLoading && currentZoom >= 10 && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-white rounded-full shadow-lg px-4 py-1.5 border border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-3 h-3 border-2 border-[#228B22] border-t-transparent rounded-full animate-spin" />
                        Loading forest plots…
                    </div>
                </div>
            )}

            {currentZoom < 10 && mapLoaded && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-black/60 text-white text-xs rounded-full px-4 py-1.5 pointer-events-none backdrop-blur-sm">
                    Zoom in past level 10 to load forest plot data
                </div>
            )}
        </div>
    );
}