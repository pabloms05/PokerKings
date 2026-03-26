import { Hand, HandAction, Game, Table, User } from '../models/index.js';
import { Op } from 'sequelize';

export const getHandHistory = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { limit = 20, offset = 0 } = req.query;

    const hands = await Hand.findAll({
      where: { userId },
      include: [
        {
          model: Game,
          include: [{ model: Table }]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Hand.count({ where: { userId } });

    res.json({ hands, total, limit, offset });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHandDetail = async (req, res) => {
  try {
    const { handId } = req.params;

    const hand = await Hand.findByPk(handId, {
      include: [
        {
          model: HandAction,
          order: [['sequenceNumber', 'ASC']]
        },
        {
          model: Game,
          include: [{ model: Table }]
        },
        {
          model: User,
          as: 'player',
          attributes: { exclude: ['password'] }
        }
      ]
    });

    if (!hand) {
      return res.status(404).json({ message: 'Hand not found' });
    }

    res.json(hand);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const saveHand = async (req, res) => {
  try {
    const { gameId, userId, cards, finalCards, result, profit, position } = req.body;

    const hand = await Hand.create({
      gameId,
      userId,
      cards,
      finalCards,
      result,
      profit,
      position
    });

    res.status(201).json(hand);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const saveHandAction = async (req, res) => {
  try {
    const { handId, action, amount, phase, sequenceNumber } = req.body;

    const handAction = await HandAction.create({
      handId,
      action,
      amount,
      phase,
      sequenceNumber
    });

    res.status(201).json(handAction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHandStatistics = async (req, res) => {
  try {
    const userId = req.params.userId;

    const stats = await Hand.findAll({
      where: { userId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('*')), 'totalHands'],
        [sequelize.fn('SUM', sequelize.col('profit')), 'totalProfit'],
        [sequelize.fn('AVG', sequelize.col('profit')), 'avgProfit']
      ],
      raw: true
    });

    const winStats = await Hand.findAll({
      where: { userId, result: 'win' },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('*')), 'wins']
      ],
      raw: true
    });

    res.json({
      totalHands: stats[0].totalHands,
      totalProfit: stats[0].totalProfit,
      avgProfit: stats[0].avgProfit,
      wins: winStats[0].wins,
      winRate: (winStats[0].wins / stats[0].totalHands * 100).toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
