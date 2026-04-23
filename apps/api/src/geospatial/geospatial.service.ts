import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForestPlot } from '@forest/database';
import { ForestPlotsFilterInput } from './dto/geospatial.input';
import { IGeospatialService } from './geospatial.service.interface';

@Injectable()
export class GeospatialService implements IGeospatialService {
    constructor(
        @InjectRepository(ForestPlot)
        private forestRepo: Repository<ForestPlot>,
    ) {}

    async getRegions(): Promise<string[]> {
        const result = await this.forestRepo
            .createQueryBuilder('plot')
            .select('DISTINCT plot.codeRegion', 'code')
            .orderBy('code')
            .getRawMany();
        return result.map((r: any) => r.code);
    }

    async getDepartements(regionCode: string): Promise<string[]> {
        const result = await this.forestRepo
            .createQueryBuilder('plot')
            .select('DISTINCT plot.codeDepartement', 'code')
            .where('plot.codeRegion = :regionCode', { regionCode })
            .orderBy('code')
            .getRawMany();
        return result.map((r: any) => r.code);
    }

    async getCommunes(departementCode: string): Promise<string[]> {
        const result = await this.forestRepo
            .createQueryBuilder('plot')
            .select('DISTINCT plot.codeCommune', 'code')
            .where('plot.codeDepartement = :departementCode', { departementCode })
            .orderBy('code')
            .getRawMany();
        return result.map((r: any) => r.code);
    }

    async getLieuxDits(communeCode: string): Promise<string[]> {
        const result = await this.forestRepo
            .createQueryBuilder('plot')
            .select('DISTINCT plot.lieuDit', 'lieu')
            .where('plot.codeCommune = :communeCode', { communeCode })
            .andWhere('plot.lieuDit IS NOT NULL')
            .orderBy('lieu')
            .getRawMany();
        return result.map((r: any) => r.lieu).filter(Boolean);
    }

    async getForestPlots(filters: ForestPlotsFilterInput): Promise<unknown[]> {
        const query = this.forestRepo
            .createQueryBuilder('plot')
            .select('plot.id', 'id')
            .addSelect('plot.codeRegion', 'codeRegion')
            .addSelect('plot.codeDepartement', 'codeDepartement')
            .addSelect('plot.codeCommune', 'codeCommune')
            .addSelect('plot.lieuDit', 'lieuDit')
            .addSelect('plot.essences', 'essences')
            .addSelect('plot.surfaceHectares', 'surfaceHectares')
            .addSelect('plot.typeForet', 'typeForet')
            .addSelect('ST_AsGeoJSON(plot.geom)::json', 'geometry');

        if (filters.regionCode) {
            query.andWhere('plot.codeRegion = :regionCode', { regionCode: filters.regionCode });
        }
        if (filters.departementCode) {
            query.andWhere('plot.codeDepartement = :departementCode', { departementCode: filters.departementCode });
        }
        if (filters.communeCode) {
            query.andWhere('plot.codeCommune = :communeCode', { communeCode: filters.communeCode });
        }
        if (filters.lieuDit) {
            query.andWhere('plot.lieuDit = :lieuDit', { lieuDit: filters.lieuDit });
        }
        if (filters.bounds) {
            query.andWhere(
                `ST_Intersects(plot.geom, ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326))`,
                filters.bounds,
            );
        }

        query.limit(10000);
        return query.getRawMany();
    }
}