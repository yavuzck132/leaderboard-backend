// src/redisClient.ts
import Redis from 'ioredis';
import { PlayerRedisResponse } from '../models/types';

const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL)
    : new Redis({
        host: process.env.REDIS_HOST || 'localhost', // Default to localhost
        port: parseInt(process.env.REDIS_PORT || '6380', 10), // Default port
    });

redis.on('connect', () => {
    console.log(`Connected to Redis`);
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

// Method to add player earnings to Redis
export const addPlayerData = async (playerId: string, earnings: number): Promise<void> => {
    // Add player to the sorted set with earnings as the score
    await redis.zadd('leaderboard', earnings, playerId);
}

// Method to get top-ranked players from Redis
export const getPlayersInRange = async (start: number, limit: number): Promise<PlayerRedisResponse[]> => {
    // Fetch top-ranked players (highest to lowest)
    const players = await redis.zrevrange('leaderboard', start, limit - 1, 'WITHSCORES');

    // Format result to return an array of { playerId, earnings }
    const result: PlayerRedisResponse[] = [];
    for (let i = 0; i < players.length; i += 2) {
        result.push({
            playerId: players[i],
            earnings: parseFloat(players[i + 1]),
            rank: (i / 2) + 1 + start
        });
    }
    return result;
}

//Get player rank from Redis by player id
export const getPlayerRank = async (playerId: string): Promise<number> => {
    const playerRank: number | null = await redis.zrevrank('leaderboard', playerId);

    if (playerRank === null) {
        return -1; // Player not found in the leaderboard
    }

    return playerRank;
}

//Get player earning from Redis by player id
export const getPlayerEarning = async (playerId: string): Promise<number> => {
    const playerEarnings = await redis.zscore('leaderboard', playerId);
    if (playerEarnings === null) {
        return -1;
    }
    return parseFloat(playerEarnings!);
}

//Get total player count in database
export const getTotalPlayerCount = async (): Promise<number> => {
    const totalPlayers: number = await redis.zcard('leaderboard');
    return totalPlayers;
}

export default redis;