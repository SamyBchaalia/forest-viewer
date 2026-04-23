import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPolygon } from '@forest/database';
import { PolygonsService } from './polygons.service';
import { PolygonsResolver } from './polygons.resolver';
import { JSONObjectScalar } from './dto/polygon.types';

@Module({
    imports: [TypeOrmModule.forFeature([UserPolygon])],
    providers: [JSONObjectScalar, PolygonsService, PolygonsResolver],
})
export class PolygonsModule {}
