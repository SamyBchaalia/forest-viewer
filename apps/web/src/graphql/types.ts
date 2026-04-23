export interface GQLUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    lastLng?: number;
    lastLat?: number;
    lastZoom?: number;
    lastFilters?: Record<string, string>;
    lastActiveLayers?: string[];
}

export interface AuthPayload {
    token: string;
    user: GQLUser;
}

export interface LoginResponse { login: AuthPayload; }
export interface LoginVariables { input: { email: string; password: string }; }

export interface RegisterResponse { register: AuthPayload; }
export interface RegisterVariables { input: { email: string; password: string; firstName?: string; lastName?: string }; }

export interface MeResponse { me: GQLUser; }

export interface UpdateMapStateResponse { updateMapState: GQLUser; }
export interface UpdateMapStateVariables {
    input: {
        lng: number;
        lat: number;
        zoom: number;
        filters?: {
            regionCode?: string;
            departementCode?: string;
            communeCode?: string;
            lieuDit?: string;
        };
        activeLayers?: string[];
    };
}

export interface SpeciesDistribution {
    species: string;
    areaHectares: number;
    percentage: number;
}

export interface AnalysisResults {
    plotCount: number;
    totalForestArea: number;
    coveragePercentage: number;
    forestTypes: string[];
    speciesDistribution: SpeciesDistribution[];
}

export interface UserPolygon {
    id: string;
    name: string;
    areaHectares?: number;
    status?: string;
    createdAt?: string;
    geometry?: unknown;
    analysisResults?: AnalysisResults;
}

export interface SavePolygonResponse { savePolygon: UserPolygon; }
export interface SavePolygonVariables { input: { name: string; geometry: unknown }; }

export interface MyPolygonsResponse { myPolygons: UserPolygon[]; }

export interface RegionsResponse { regions: string[]; }

export interface DepartementsResponse { departements: string[]; }
export interface DepartementsVariables { regionCode: string; }

export interface CommunesResponse { communes: string[]; }
export interface CommunesVariables { departementCode: string; }

export interface LieuxDitsResponse { lieuxDits: string[]; }
export interface LieuxDitsVariables { communeCode: string; }

export interface ForestPlot {
    id: string;
    codeRegion?: string;
    codeDepartement?: string;
    codeCommune?: string;
    lieuDit?: string;
    geometry?: unknown;
    essences?: string[];
    surfaceHectares?: number;
    typeForet?: string;
}

export interface ForestPlotsResponse { forestPlots: ForestPlot[]; }
export interface ForestPlotsVariables {
    filters?: {
        regionCode?: string;
        departementCode?: string;
        communeCode?: string;
        lieuDit?: string;
        bounds?: { minLng: number; minLat: number; maxLng: number; maxLat: number };
    };
}
