import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '@forest/database';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PolygonsService } from './polygons.service';
import { PolygonType } from './dto/polygon.types';
import { SavePolygonInput } from './dto/polygon.input';

@Resolver(() => PolygonType)
export class PolygonsResolver {
    constructor(private polygonsService: PolygonsService) {}

    @Query(() => [PolygonType])
    @UseGuards(GqlAuthGuard)
    async myPolygons(@CurrentUser() user: User): Promise<PolygonType[]> {
        return this.polygonsService.myPolygons(user.id);
    }

    @Mutation(() => PolygonType)
    @UseGuards(GqlAuthGuard)
    async savePolygon(
        @CurrentUser() user: User,
        @Args('input') input: SavePolygonInput,
    ): Promise<PolygonType> {
        return this.polygonsService.savePolygon(user.id, input.name, input.geometry);
    }

    @Mutation(() => Boolean)
    @UseGuards(GqlAuthGuard)
    async deletePolygon(
        @CurrentUser() user: User,
        @Args('polygonId') polygonId: string,
    ): Promise<boolean> {
        return this.polygonsService.deletePolygon(polygonId, user.id);
    }
}
