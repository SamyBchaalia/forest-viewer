import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IGeospatialService } from './geospatial.service.interface';
import type { ForestPlotsFilterInput } from './dto/geospatial.input';

/**
 * Drop-in replacement for GeospatialService that delegates to a standalone
 * geospatial HTTP service instead of querying PostGIS directly.
 * Activated when GEOSPATIAL_SERVICE_URL is set in the environment.
 */
@Injectable()
export class GeospatialHttpClient implements IGeospatialService {
    private readonly logger = new Logger(GeospatialHttpClient.name);
    private readonly baseUrl: string;

    constructor(private readonly config: ConfigService) {
        this.baseUrl = config.get<string>('GEOSPATIAL_SERVICE_URL') ?? '';
    }

    getRegions(): Promise<string[]> {
        return this.get<string[]>('/regions');
    }

    getDepartements(regionCode: string): Promise<string[]> {
        return this.get<string[]>(`/departements?regionCode=${encodeURIComponent(regionCode)}`);
    }

    getCommunes(departementCode: string): Promise<string[]> {
        return this.get<string[]>(`/communes?departementCode=${encodeURIComponent(departementCode)}`);
    }

    getLieuxDits(communeCode: string): Promise<string[]> {
        return this.get<string[]>(`/lieux-dits?communeCode=${encodeURIComponent(communeCode)}`);
    }

    getForestPlots(filters: ForestPlotsFilterInput): Promise<unknown[]> {
        return this.post<unknown[]>('/forest-plots', filters);
    }

    private async get<T>(path: string): Promise<T> {
        this.logger.debug(`GET ${this.baseUrl}${path}`);
        const res = await fetch(`${this.baseUrl}${path}`);
        if (!res.ok) throw new Error(`Geospatial service GET ${path} returned ${res.status}`);
        return res.json() as Promise<T>;
    }

    private async post<T>(path: string, body: unknown): Promise<T> {
        this.logger.debug(`POST ${this.baseUrl}${path}`);
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Geospatial service POST ${path} returned ${res.status}`);
        return res.json() as Promise<T>;
    }
}
