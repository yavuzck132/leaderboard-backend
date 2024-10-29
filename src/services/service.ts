import { getMatchingNames, getPlayerDataById, getPlayerId } from '../clients/dbClient';
import { getPlayersInRange, getTotalPlayerCount, getPlayerRank, getPlayerEarning } from '../clients/redisClient'; // Import your Redis functions
import { PlayerRedisResponse, PlayerResponse } from '../models/types'; // Adjust the path as needed

//Service to get top ranked players
export const topRankedPlayersService = async (): Promise<PlayerResponse[]> => {
    const rankedPlayersData: PlayerResponse[] = await getPlayerData()
    return rankedPlayersData;
}

//Service to get top ranked players and rank them by country
export const topRankedPlayersByCountryService = async (): Promise<PlayerResponse[][]> => {
    const rankedPlayersData: PlayerResponse[] = await getPlayerData()
    //Sort data by country
    rankedPlayersData.sort((a, b) => a.country.localeCompare(b.country));
    //Seperate data by country into arrays
    let lastCountryIndex: number = 0;
    let lastCountry: string = "";
    let playersByCountry: PlayerResponse[] = [];
    const rankedPlayerByCountryData: PlayerResponse[][] = [];
    rankedPlayersData.map((player: PlayerResponse, index: number) => {
        if (lastCountry !== player.country) {
            lastCountry = player.country;
            lastCountryIndex = index;
            if (playersByCountry.length !== 0) {
                rankedPlayerByCountryData.push(playersByCountry);
            }
            playersByCountry = [];
        }
        player.rank = index - lastCountryIndex + 1;
        playersByCountry.push(player);
        if (index === rankedPlayersData.length - 1) {
            rankedPlayerByCountryData.push(playersByCountry);
        }
    })
    return rankedPlayerByCountryData;
}

//Service to get selected player and neighbours of that player 
export const selectedPlayerAndNeighboutsDataService = async (name: string): Promise<PlayerResponse[]> => {
    //Find player id by the provided name, and if id not exists, return empty array
    const playerId: string = await getPlayerId(name);
    if (playerId === "-1") {
        return [];
    }
    //Get total player count in data and player rank of the selected player
    const totalPlayerCount: number = await getTotalPlayerCount();
    const playerRank: number = await getPlayerRank(playerId);
    if (totalPlayerCount === 0 || playerRank === -1) {
        return []
    }

    // Calculate start and end positions of the neighbours
    const start: number = Math.max(0, playerRank - 3); // 3 players above
    const end: number = Math.min(totalPlayerCount - 1, playerRank + 2); // 2 players below

    //Get player and player's neighbours
    const selectedPlayerAndNeighbours: PlayerRedisResponse[] = await getPlayersInRange(start, end);

    //If we get an error and we have not found any player, can happen if there is only 1 player in data, then fetch player only
    if (!selectedPlayerAndNeighbours.some(p => p.playerId === playerId)) {
        //Get selected player earning, if earning not found, return empty array
        const selectedPlayerEarning: number = await getPlayerEarning(playerId);
        if (selectedPlayerEarning === -1) {
            return [];
        }
        selectedPlayerAndNeighbours.push({ playerId, earnings: selectedPlayerEarning, rank: playerRank + 1 });
    }

    //Get selected players' data
    const selectedPlayersAndNeighboursData: PlayerResponse[] = await getPlayersData(selectedPlayerAndNeighbours);
    return selectedPlayersAndNeighboursData;
}

//Function only to get player top ranked player data from Redis and database
const getPlayerData = async (): Promise<PlayerResponse[]> => {
    const rankedPlayersRedis: PlayerRedisResponse[] = await getPlayersInRange(0, 100);
    const rankedPlayersData: PlayerResponse[] = await getPlayersData(rankedPlayersRedis);
    return rankedPlayersData;
}

//Function to get player data from database
const getPlayersData = async (players: PlayerRedisResponse[]): Promise<PlayerResponse[]> => {
    const playerData: PlayerResponse[] = [];
    for (const player of players) {
        // Get player data from the database using playerId
        const dbRes = await getPlayerDataById(player.playerId);
        if (dbRes) {
            const totalMoney = parseFloat(dbRes.money) + player.earnings; // Add earnings from Redis to money from DB
            playerData.push({
                playerId: player.playerId,
                name: dbRes.name,
                country: dbRes.country,
                money: totalMoney,
                rank: player.rank
            });
        }
    }
    return playerData;
}

//Get matching names to the partial name
export const autocompleteNames = async (partialName: string): Promise<string[]> => {
    const matchingNames: string[] = await getMatchingNames(partialName);
    return matchingNames.splice(0, 5);
}
