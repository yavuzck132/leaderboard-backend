// prefillData.ts
import fs from 'fs';
import path from 'path';
import { addDataToDatabase, verifyDataPresence } from '../clients/dbClient';
import { addPlayerData } from '../clients/redisClient';
import { Player } from '../models/types';

// Prefill data - to be removed in production
export const prefillData = async () => {
  const filePath = path.join(__dirname, '..', 'data', 'playerData.json');

  // Read the JSON file
  const data = fs.readFileSync(filePath, 'utf-8');
  const players: Player[] = JSON.parse(data);

  await populateDatabase(players);
  await populateRedis(players);
}

//Add data to Redis
const populateRedis = async (players: Player[]) => {
  for (const player of players) {
    try {
      await addPlayerData(player.playerId, player.earnings);
    } catch (error) {
      console.error(`Error adding player ${player.name}:`, error);
    }
  }
}

//Add data to Database
const populateDatabase = async (players: Player[]) => {
  try {
    for (const player of players) {
      // Check if the player already exists
      const res = await verifyDataPresence(player.playerId);

      if (res === false) {
        // Insert the player if they do not exist
        await addDataToDatabase(player);
      }
    }
  } catch (error) {
    console.error('Error populating database:', error);
  }
}
