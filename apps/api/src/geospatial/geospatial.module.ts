import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ForestPlot } from '@forest/database';
import { GeospatialService } from './geospatial.service';
import { GeospatialHttpClient } from './geospatial.http-client';
import { GeospatialResolver } from './geospatial.resolver';
import { GEOSPATIAL_SERVICE, IGeospatialService } from './geospatial.service.interface';

@Module({
    imports: [TypeOrmModule.forFeature([ForestPlot]), ConfigModule],
    providers: [
        GeospatialService,
        GeospatialHttpClient,
        {
            provide: GEOSPATIAL_SERVICE,
            useFactory: (
                config: ConfigService,
                local: GeospatialService,
                remote: GeospatialHttpClient,
            ): IGeospatialService =>
                config.get<string>('GEOSPATIAL_SERVICE_URL') ? remote : local,
            inject: [ConfigService, GeospatialService, GeospatialHttpClient],
        },
        GeospatialResolver,
    ],
    exports: [GEOSPATIAL_SERVICE],
})
export class GeospatialModule {}
