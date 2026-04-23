import { InputType, Field, Float } from '@nestjs/graphql';
import { IsNumber, IsOptional, IsObject, IsArray, IsString } from 'class-validator';

@InputType()
export class MapFiltersInput {
    @Field({ nullable: true })
    @IsOptional()
    regionCode?: string;

    @Field({ nullable: true })
    @IsOptional()
    departementCode?: string;

    @Field({ nullable: true })
    @IsOptional()
    communeCode?: string;

    @Field({ nullable: true })
    @IsOptional()
    lieuDit?: string;
}

@InputType()
export class MapStateInput {
    @Field(() => Float)
    @IsNumber()
    lng!: number;

    @Field(() => Float)
    @IsNumber()
    lat!: number;

    @Field(() => Float)
    @IsNumber()
    zoom!: number;

    @Field(() => MapFiltersInput, { nullable: true })
    @IsObject()
    @IsOptional()
    filters?: MapFiltersInput;

    @Field(() => [String], { nullable: true })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    activeLayers?: string[];
}