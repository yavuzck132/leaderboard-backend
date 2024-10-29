// api.ts
import express from 'express';
import { PlayerResponse } from '../models/types'; // Adjust the path as needed
import { topRankedPlayersService, topRankedPlayersByCountryService, selectedPlayerAndNeighboutsDataService, autocompleteNames } from "../services/service";

const router = express.Router();

// GET all ranked players
router.get('/ranked', async (req, res) => {
    try {
        const playersResponseData: PlayerResponse[] = await topRankedPlayersService();
        res.json(playersResponseData);
    } catch (error) {
        console.error('Error fetching ranked players:', error);
        res.status(500).send('Server error');
    }
});

// GET all ranked players and sort them by country
router.get('/rankedByCountry', async (req, res) => {
    try {
        const playersResponseData: PlayerResponse[][] = await topRankedPlayersByCountryService();
        res.json(playersResponseData);
    } catch (error) {
        console.error('Error fetching ranked players:', error);
        res.status(500).send('Server error');
    }
});

// GET selected player data and its neighbours
router.get('/player', async (req, res) => {
    const name = req.query.name as string
    try {
        const playersResponseData: PlayerResponse[] = await selectedPlayerAndNeighboutsDataService(name);
        res.json(playersResponseData);
    } catch (error) {
        console.error('Error fetching ranked players:', error);
        res.status(500).send('Server error');
    }
});

// GET possible names from given partial name
router.get('/autocomplete', async (req, res) => {
    const name = req.query.name as string;
    try {
        const matchingNames = await autocompleteNames(name);
        res.json(matchingNames);
    } catch (error) {
        console.error('Error fetching ranked players:', error);
        res.status(500).send('Server error');
    }
});

export default router;
