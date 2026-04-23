const GEOSERVER_URL = '/geoserver';
const WORKSPACE = 'prod';

export interface FeatureInfoResponse {
    type: string;
    features: Array<{
        type: string;
        id: string;
        geometry: any;
        properties: Record<string, any>;
    }>;
    totalFeatures: number;
    numberReturned: number;
    timeStamp: string;
    crs: any;
}

function lngLatTo3857(lng: number, lat: number): [number, number] {
    const x = (lng * 20037508.34) / 180;
    let y =
        Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) /
        (Math.PI / 180);
    y = (y * 20037508.34) / 180;
    return [x, y];
}

export const getFeatureInfo = async (
    layerName: string,
    lng: number,
    lat: number,
    map: mapboxgl.Map
): Promise<FeatureInfoResponse | null> => {
    const point = map.project([lng, lat]);
    const bounds = map.getBounds();
    if (!bounds) return null;

    // Convert bounds to EPSG:3857
    const [minx, miny] = lngLatTo3857(bounds.getWest(), bounds.getSouth());
    const [maxx, maxy] = lngLatTo3857(bounds.getEast(), bounds.getNorth());


    const params = new URLSearchParams({
        service: 'WMS',
        version: '1.1.1',
        request: 'GetFeatureInfo',
        layers: `${WORKSPACE}:${layerName}`,
        query_layers: `${WORKSPACE}:${layerName}`,
        styles: '',
        format: 'image/png',
        transparent: 'true',
        srs: 'EPSG:3857',
        bbox: `${minx},${miny},${maxx},${maxy}`,
        width: map.getCanvas().width.toString(),   // correct
        height: map.getCanvas().height.toString(), // correct
        x: Math.floor(point.x).toString(),
        y: Math.floor(point.y).toString(),
        info_format: 'application/json',
        feature_count: '1',
    });

    const url = `${GEOSERVER_URL}/${WORKSPACE}/wms?${params.toString()}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${layerName}:`, error);
        return null;
    }
};

// Query all layers in hierarchy: Region → Department → Commune → Forest
export const queryAllLayers = async (
    lng: number,
    lat: number,
    map: mapboxgl.Map
): Promise<{
    region: FeatureInfoResponse | null;
    department: FeatureInfoResponse | null;
    commune: FeatureInfoResponse | null;
    forest: FeatureInfoResponse | null;
}> => {
    const [region, department, commune, forest] = await Promise.all([
        getFeatureInfo('region', lng, lat, map),
        getFeatureInfo('department', lng, lat, map),
        getFeatureInfo('cummune', lng, lat, map),
        getFeatureInfo('forest', lng, lat, map),
    ]);

    return { region, department, commune, forest };
};