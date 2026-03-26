import { User } from '../models/index.js';

export const getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { avatar, chips } = req.body;
    const user = await User.findByPk(req.params.id);
    
    if (avatar !== undefined) user.avatar = avatar;
    if (chips !== undefined) user.chips = Number(chips);
    await user.save();
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'level', 'experience', 'gamesPlayed', 'gamesWon', 'totalWinnings', 'highestWinning']
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
