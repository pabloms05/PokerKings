import { Achievement } from '../models/index.js';

export const getMyAchievements = async (req, res) => {
  try {
    const userId = req.userId;
    const achievements = await Achievement.findAll({
      where: { userId },
      order: [['unlockedAt', 'DESC']]
    });

    res.json(achievements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
