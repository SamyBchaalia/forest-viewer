import { ObjectType, Field, Float, Int, Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('JSONObject')
export class JSONObjectScalar implements CustomScalar<any, any> {
    description = 'Arbitrary JSON value';
    parseValue(value: unknown) { return value; }
    serialize(value: unknown) { return value; }
    parseLiteral(ast: ValueNode) {
        if (ast.kind === Kind.STRING) {
            try { return JSON.parse(ast.value); } catch { return ast.value; }
        }
        return null;
    }
}

@ObjectType()
export class SpeciesDistributionType {
    @Field()
    species!: string;

    @Field(() => Float)
    areaHectares!: number;

    @Field(() => Float)
    percentage!: number;
}

@ObjectType()
export class AnalysisResultsType {
    @Field(() => Int, { nullable: true })
    plotCount?: number;

    @Field(() => Float, { nullable: true })
    totalForestArea?: number;

    @Field(() => Float, { nullable: true })
    coveragePercentage?: number;

    @Field(() => [String], { nullable: true })
    forestTypes?: string[];

    @Field(() => [SpeciesDistributionType], { nullable: true })
    speciesDistribution?: SpeciesDistributionType[];
}

@ObjectType()
export class PolygonType {
    @Field()
    id!: string;

    @Field()
    name!: string;

    @Field(() => Float)
    areaHectares!: number;

    @Field()
    status!: string;

    @Field()
    createdAt!: Date;

    @Field(() => JSONObjectScalar, { nullable: true })
    geometry?: any;

    @Field(() => AnalysisResultsType, { nullable: true })
    analysisResults?: AnalysisResultsType;
}
