import express from 'express';
import * as gameController from '../controllers/game.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * Rutas de juego
 */

// Iniciar un juego
router.post('/start', authMiddleware, gameController.startGame);

// Obtener estado del juego
router.get('/:gameId', authMiddleware, gameController.getGame);

// Realizar acción en el juego
router.post('/:gameId/action', authMiddleware, gameController.playerAction);

// Obtener juegos activos del jugador
router.get('/player/:userId', authMiddleware, gameController.getPlayerGames);

// Obtener historial de juegos de una mesa
router.get('/table/:tableId/history', authMiddleware, gameController.getGameHistory);

// Obtener detalles de una mano
router.get('/:gameId/hands/:handId', authMiddleware, gameController.getHandDetails);

// Abandonar un juego
router.post('/:gameId/leave', authMiddleware, gameController.leaveGame);

// Invitar amigos a una partida
router.post('/:gameId/invite', authMiddleware, gameController.inviteFriendsToGame);

export default router;
