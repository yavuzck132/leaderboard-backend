interface Base{
    playerId: string
}

export interface PlayerData extends Base{
    name: string,
    country: string,
    money: number
}

export interface PlayerEarnings extends Base{
    earnings: number
}

export interface PlayerRank{
    rank: number;
}

export interface PlayerRedisResponse extends PlayerEarnings, PlayerRank{}



export interface Player extends PlayerData, PlayerEarnings {}

export interface PlayerResponse extends PlayerData, PlayerRank {}