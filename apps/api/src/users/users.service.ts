import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@forest/database';
import { MapStateInput } from './dto/map-state.input';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    async findById(id: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async updateMapState(userId: string, input: MapStateInput): Promise<User> {
        await this.userRepository.update(userId, {
            lastLng: input.lng,
            lastLat: input.lat,
            lastZoom: input.zoom,
            lastFilters: input.filters as Record<string, any>,
            lastActiveLayers: input.activeLayers,
        });

        const user = await this.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
}