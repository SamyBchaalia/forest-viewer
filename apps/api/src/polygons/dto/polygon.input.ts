import { InputType, Field } from '@nestjs/graphql';
import { IsString } from 'class-validator';
import { JSONObjectScalar } from './polygon.types';

@InputType()
export class SavePolygonInput {
    @Field()
    @IsString()
    name!: string;

    @Field(() => JSONObjectScalar)
    geometry!: any;
}
