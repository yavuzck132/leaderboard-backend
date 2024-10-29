// dbClient.ts
import { Client } from 'pg';
import { Player, PlayerEarnings } from '../models/types';
import dotenv from 'dotenv';

dotenv.config();

const dbClient = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT), // Ensure port is a number
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

dbClient.connect()
  .then(() => console.log('Connected to Database'))
  .catch(err => console.error('Connection error', err.stack));

//Get one player data from database by given player id
export const getPlayerDataById = async (playerId: string) => {
  const res = await dbClient.query('SELECT name, country, money FROM players WHERE player_id = $1', [playerId]);
  return res.rows[0];
}

//Get player id from database by the provided name
export const getPlayerId = async (name: string): Promise<string> => {
  try {
    const res = await dbClient.query('SELECT player_id FROM players WHERE name = $1', [name]);
    if (res.rowCount === 0) {
      return "-1"; // Return -1 if no player is found
    }
    return res.rows[0].player_id; // Return the first result
  } catch (error) {
    console.error('Error getting player id:', error);
    throw error;
  }
}

//Get names that match to provided partial name from database
export const getMatchingNames = async (partialName: string) => {
  try {
    const res = await dbClient.query(`SELECT name 
        FROM players 
        WHERE name ILIKE $1 
        ORDER BY 
          CASE 
            WHEN name ILIKE $2 THEN 0 
            ELSE 1 
          END, 
          name`,
      [`%${partialName}%`, `${partialName}%`]);
    return res.rows.map((row: { name: string }) => row.name); // Return an array of names
  } catch (error) {
    console.error('Error fetching matching names:', error);
    throw error;
  }
}

//Function that updates player money in database by getting player earnings
export const updatePlayerEarnings = async (updates: PlayerEarnings[]): Promise<void> => {
  try {
    // Begin a transaction for better performance and consistency
    await dbClient.query('BEGIN');

    for (const update of updates) {
      const { earnings, playerId } = update;

      // Update the money in the database
      await dbClient.query(
        'UPDATE players SET money = money + $1 WHERE player_id = $2',
        [earnings, playerId]
      );
    }

    // Commit the transaction
    await dbClient.query('COMMIT');
  } catch (error) {
    // Rollback in case of error
    await dbClient.query('ROLLBACK');
    console.error('Error updating player earnings:', error);
  }
}
//Verify if data exists inside database
export const verifyDataPresence = async (playerId: string): Promise<boolean> => {
  const res = await dbClient.query('SELECT COUNT(*) FROM players WHERE player_id = $1', [playerId]);
  if (parseInt(res.rows[0].count) === 0) {
    return false;
  }
  return true;
}
//Add data to database
export const addDataToDatabase = async (player: Player): Promise<void> => {
  await dbClient.query(
    'INSERT INTO players (playerId, name, country, money) VALUES ($1, $2, $3, $4)',
    [player.playerId, player.name, player.country, player.money]
  );
}

export default dbClient;
