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
            // Detect the actual SRID the forest data was stored with. BD Forêt V2 is often
            // loaded from shapefiles without reprojection, leaving Lambert-93 (EPSG:2154)
            // coordinates in a column whose metadata says 4326. ST_Transform(geom, 4326)
            // is a no-op in that case because PostGIS trusts the metadata. The correct fix
            // is to transform the user's polygon (always 4326) into whatever SRID the
            // forest data actually uses, then let PostGIS intersect in that native space.
            const [meta] = await this.dataSource.query(
                `SELECT ST_SRID(geom) AS srid, COUNT(*)::int AS total
                 FROM forest_plots
                 WHERE geom IS NOT NULL
                 GROUP BY ST_SRID(geom)
                 ORDER BY COUNT(*) DESC
                 LIMIT 1`,
            );
            const forestSrid: number = meta?.srid ?? 4326;
            const totalPlots: number = meta?.total ?? 0;
            console.log(`[runAnalysis] forest_plots: ${totalPlots} rows, SRID=${forestSrid}`);

            // Log user polygon extent and forest plots extent so mismatches are visible
            const [extents] = await this.dataSource.query(
                `SELECT
                     ST_AsText(ST_Envelope((SELECT geometry FROM user_polygons WHERE id = $1))) AS user_bbox,
                     ST_AsText(ST_Extent(geom)) AS forest_bbox
                 FROM forest_plots`,
                [polygonId],
            );
            console.log(`[runAnalysis] user polygon bbox : ${extents?.user_bbox}`);
            console.log(`[runAnalysis] forest_plots bbox : ${extents?.forest_bbox}`);

            // Always tag the user polygon as 4326 before transforming, because the geometry
            // column can come back with SRID 0 from a subquery and ST_Transform refuses to
            // transform an SRID-0 geometry ("could not parse proj string '4326'").
            const userGeomExpr =
                forestSrid === 4326
                    ? `ST_SetSRID((SELECT geometry FROM user_polygons WHERE id = $1), 4326)`
                    : `ST_Transform(ST_SetSRID((SELECT geometry FROM user_polygons WHERE id = $1), 4326), ${forestSrid})`;

            const plots = await this.dataSource.query(
                `SELECT
                     COALESCE(surface_hectares, 0) AS "surfaceHectares",
                     type_foret                    AS "typeForet",
                     essences
                 FROM forest_plots
                 WHERE ST_Intersects(geom, ${userGeomExpr})
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

            // Distribute surface area across essences. BD Forêt V1 has no essences column,
            // so fall back to aggregating by forest type (type_foret) instead.
            const speciesMap = new Map<string, number>();
            let hasEssences = false;
            for (const plot of plots) {
                const essences: string[] = Array.isArray(plot.essences) ? plot.essences : [];
                if (essences.length > 0) hasEssences = true;
                const share = (parseFloat(plot.surfaceHectares) || 0) / (essences.length || 1);
                for (const species of essences) {
                    if (species) speciesMap.set(species, (speciesMap.get(species) || 0) + share);
                }
            }

            // V1 fallback: aggregate area by forest type
            if (!hasEssences) {
                for (const plot of plots) {
                    const key = plot.typeForet || 'Unknown';
                    speciesMap.set(key, (speciesMap.get(key) || 0) + (parseFloat(plot.surfaceHectares) || 0));
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
