import { Resolver, Query, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { ForestPlotsFilterInput } from './dto/geospatial.input';
import { ForestPlotType } from './dto/geospatial.types';
import { GEOSPATIAL_SERVICE } from './geospatial.service.interface';
import { IGeospatialService } from './geospatial.service.interface';

@Resolver()
export class GeospatialResolver {
    constructor(
        @Inject(GEOSPATIAL_SERVICE) private readonly geoService: IGeospatialService,
    ) {}

    @Query(() => [String])
    async regions(): Promise<string[]> {
        return this.geoService.getRegions();
    }

    @Query(() => [String])
    async departements(
        @Args('regionCode') regionCode: string,
    ): Promise<string[]> {
        return this.geoService.getDepartements(regionCode);
    }

    @Query(() => [String])
    async communes(
        @Args('departementCode') departementCode: string,
    ): Promise<string[]> {
        return this.geoService.getCommunes(departementCode);
    }

    @Query(() => [String])
    async lieuxDits(
        @Args('communeCode') communeCode: string,
    ): Promise<string[]> {
        return this.geoService.getLieuxDits(communeCode);
    }

    @Query(() => [ForestPlotType])
    async forestPlots(
        @Args('filters', { nullable: true }) filters: ForestPlotsFilterInput,
    ): Promise<ForestPlotType[]> {
        return this.geoService.getForestPlots(filters || {}) as Promise<ForestPlotType[]>;
    }
}
