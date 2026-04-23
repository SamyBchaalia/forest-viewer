import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserPolygon } from '@forest/database';

@Injectable()
export class PolygonsService {
    constructor(
        @InjectRepository(UserPolygon)
        private polygonRepo: Repository<UserPolygon>,
        private dataSource: DataSource,
    ) {}

    async savePolygon(userId: string, name: string, geometry: any): Promise<any> {
        const geometryJson = JSON.stringify(geometry);

        // Use ::geography cast for accurate equal-area calculation (avoids Web Mercator distortion)
        const [row] = await this.dataSource.query(
            `INSERT INTO user_polygons ("userId", name, geometry, "areaHectares", status)
             VALUES (
                 $1, $2,
                 ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON($3)), 4326),
                 ST_Area(ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON($3)), 4326)::geography) / 10000,
                 'pending'
             )
             RETURNING id, "userId", name, "areaHectares", status, "createdAt"`,
            [userId, name, geometryJson],
        );

        const analysisResults = await this.runAnalysis(row.id, row.areaHectares);

        await this.dataSource.query(
            `UPDATE user_polygons SET status = 'completed', "analysisResults" = $1 WHERE id = $2`,
            [JSON.stringify(analysisResults), row.id],
        );

        return { ...row, status: 'completed', analysisResults };
    }

    private async runAnalysis(polygonId: string, areaHectares: number): Promise<any> {
        try {
            // ST_Transform normalizes forest_plots.geom to SRID 4326 before comparison.
            // This handles data loaded in Lambert-93 (EPSG:2154) or any other SRID without
            // an explicit reprojection step at load time.
            const plots = await this.dataSource.query(
                `SELECT
                     COALESCE(surface_hectares, 0) AS "surfaceHectares",
                     type_foret                    AS "typeForet",
                     essences
                 FROM forest_plots
                 WHERE ST_Intersects(
                     ST_Transform(geom, 4326),
                     (SELECT geometry FROM user_polygons WHERE id = $1)
                 )
                 LIMIT 5000`,
                [polygonId],
            );

            const plotCount: number = plots.length;
            const totalForestArea: number = plots.reduce(
                (s: number, p: any) => s + (parseFloat(p.surfaceHectares) || 0),
                0,
            );
            const coveragePercentage =
                areaHectares > 0 ? Math.min((totalForestArea / areaHectares) * 100, 100) : 0;
            const forestTypes: string[] = [
                ...new Set<string>(plots.map((p: any) => p.typeForet).filter(Boolean)),
            ];

            // Distribute surface area evenly across all essences listed per plot
            const speciesMap = new Map<string, number>();
            for (const plot of plots) {
                const essences: string[] = Array.isArray(plot.essences) ? plot.essences : [];
                const share = (parseFloat(plot.surfaceHectares) || 0) / (essences.length || 1);
                for (const species of essences) {
                    if (species) speciesMap.set(species, (speciesMap.get(species) || 0) + share);
                }
            }

            const speciesDistribution = Array.from(speciesMap.entries())
                .map(([species, area]) => ({
                    species,
                    areaHectares: area,
                    percentage: totalForestArea > 0 ? (area / totalForestArea) * 100 : 0,
                }))
                .sort((a, b) => b.areaHectares - a.areaHectares)
                .slice(0, 20);

            return { plotCount, totalForestArea, coveragePercentage, forestTypes, speciesDistribution };
        } catch (err) {
            console.error('[runAnalysis] spatial query failed for polygon', polygonId, err);
            return { plotCount: 0, totalForestArea: 0, coveragePercentage: 0, forestTypes: [], speciesDistribution: [] };
        }
    }

    async myPolygons(userId: string): Promise<any[]> {
        const rows = await this.dataSource.query(
            `SELECT id, "userId", name, "areaHectares", status, "createdAt", "analysisResults",
                    ST_AsGeoJSON(geometry)::text AS geometry
             FROM user_polygons
             WHERE "userId" = $1
             ORDER BY "createdAt" DESC`,
            [userId],
        );

        return rows.map((row: any) => ({
            ...row,
            geometry: row.geometry ? JSON.parse(row.geometry) : null,
        }));
    }

    async deletePolygon(polygonId: string, userId: string): Promise<boolean> {
        const result = await this.polygonRepo.delete({ id: polygonId, userId });
        return (result.affected ?? 0) > 0;
    }
}
