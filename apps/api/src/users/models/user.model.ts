import { Field, ID, ObjectType, Float } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class UserModel {
    @Field(() => ID)
    id: string;

    @Field()
    email: string;

    @Field({ nullable: true })
    firstName?: string;

    @Field({ nullable: true })
    lastName?: string;

    @Field(() => Float, { nullable: true })
    lastLng?: number;

    @Field(() => Float, { nullable: true })
    lastLat?: number;

    @Field(() => Float, { nullable: true })
    lastZoom?: number;

    @Field(() => GraphQLJSON, { nullable: true })
    lastFilters?: Record<string, any>;

    @Field(() => [String], { nullable: true })
    lastActiveLayers?: string[];
}