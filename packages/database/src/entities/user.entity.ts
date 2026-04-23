

import { OneToMany, Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserPolygon } from './user-polygon.entity';

@Entity('users')

export class User {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    email!: string;

    @Column()
    passwordHash!: string;

    @Column({ nullable: true })
    firstName?: string;

    @Column({ nullable: true })
    lastName?: string;

    // Last map view state
    @Column('double precision', { nullable: true })
    lastLng?: number;

    @Column('double precision', { nullable: true })
    lastLat?: number;

    @Column('double precision', { nullable: true })
    lastZoom?: number;

    @Column('jsonb', { nullable: true })
    lastFilters?: Record<string, any>;

    @Column('varchar', { array: true, nullable: true })
    lastActiveLayers?: string[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

  /*  @OneToMany(() => UserPolygon, polygon => polygon.user)
    polygons?: UserPolygon[];*/
}