import {updatePlayerEarnings} from '../clients/dbClient';
import { PlayerEarnings, PlayerRedisResponse } from '../models/types';
import { getPlayersInRange, getTotalPlayerCount, addPlayerData } from '../clients/redisClient';
import { prefillData } from './prefillData';

// 1. Reward Distribution Logic
async function distributeRewardsAndResetRedis() {
  try {
    // Step 1: Fetch ranked players from Redis
    const totalPlayers: number = await getTotalPlayerCount();
    if (totalPlayers === 0) { //If there are no players, we return.
      return;
    }
    const allPlayers: PlayerEarnings[] = await getPlayersInRange(0, totalPlayers);
    const rankedPlayers: PlayerRedisResponse[] = await getPlayersInRange(0, 100);
    
    

    // Step 2: Calculate the total earnings and reward pool
    const totalEarnings: number = allPlayers.reduce((sum, player) => sum + player.earnings, 0);
    const rewardPool: number = totalEarnings * 0.02;
    // Step 3: Define reward distribution percentages
    const topThreeRewardPercentages: number[] = [0.20, 0.15, 0.10];
    const topRewards: PlayerEarnings[] = rankedPlayers.slice(0, 3).map((player, index) => ({
      playerId: player.playerId,
      earnings: rewardPool * topThreeRewardPercentages[index],
    }));
    
    const remainingReward: number = rewardPool * 0.55 / (rankedPlayers.length - 3);
    const remainingRewards: PlayerEarnings[] = rankedPlayers.slice(3).map(player => ({
      playerId: player.playerId,
      earnings: remainingReward,
    }));

    // Step 4: Distribute rewards to ranked players
    allPlayers.forEach((player: PlayerEarnings, index: number) => {
        if(index<3){
            player.earnings = player.earnings + topRewards[index].earnings;
        }else if(index >= 3 && index<100){
            player.earnings = player.earnings + remainingRewards[index-3].earnings;
        }
    })
    
    await updatePlayerEarnings(allPlayers);
    

  // Step 5: Reset Redis
  await resetPlayerScores(); // Clear weekly scores in Redis
  // Prefill Redis with initial data for development environment
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'production'){
    await prefillData();    
  }
 }catch(error){
    console.error('Error during reward distribution and reset:', error);
 }


}

//Reset player scores to 0
const resetPlayerScores = async() => {
  const playerCount: number = await getTotalPlayerCount();
  const players: PlayerRedisResponse[] = await getPlayersInRange(0, playerCount); // Fetch current ranks

  //This logic is to keep player rank even when the data resets
  players.forEach((player: PlayerRedisResponse, index: number) => {
      addPlayerData(player.playerId, 0 - index * 0.00001)
  })
}
// Schedule the function to run every week
setInterval(distributeRewardsAndResetRedis, 7 * 24 * 3600 * 1000);
