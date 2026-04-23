import type { ForestPlotsFilterInput } from './dto/geospatial.input';

/**
 * Abstract class acts as both the structural contract and the injection token
 * for the geospatial service boundary.  Using an abstract class (rather than
 * an interface) gives the type a runtime presence, which NestJS emitDecoratorMetadata
 * requires when reflecting constructor parameter types.
 */
export abstract class IGeospatialService {
    abstract getRegions(): Promise<string[]>;
    abstract getDepartements(regionCode: string): Promise<string[]>;
    abstract getCommunes(departementCode: string): Promise<string[]>;
    abstract getLieuxDits(communeCode: string): Promise<string[]>;
    abstract getForestPlots(filters: ForestPlotsFilterInput): Promise<unknown[]>;
}

export const GEOSPATIAL_SERVICE = Symbol('GEOSPATIAL_SERVICE');
