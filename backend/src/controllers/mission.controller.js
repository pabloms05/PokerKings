import { Mission, User, Transaction } from '../models/index.js';
import { ensureUserMissions, refreshUserMissionProgress } from '../services/progression.service.js';

export const getMissions = async (req, res) => {
  try {
    const userId = req.userId;
    await ensureUserMissions(userId);

    const missions = await Mission.findAll({ where: { userId } });

    res.json(missions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkMissionProgress = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedMissions = await refreshUserMissionProgress(userId);

    res.json(updatedMissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const claimMissionReward = async (req, res) => {
  try {
    const { missionId } = req.params;
    const userId = req.userId;

    const mission = await Mission.findByPk(missionId);

    if (!mission || mission.userId !== userId) {
      return res.status(404).json({ message: 'Mission not found' });
    }

    if (!mission.completed) {
      return res.status(400).json({ message: 'Mission not completed' });
    }

    const missionPeriodKey = (mission.type === 'daily' || mission.type === 'weekly')
      ? (mission.requirement?.periodKey || 'period-unknown')
      : 'permanent';
    const missionRewardTag = `mission:${mission.id}:${missionPeriodKey}`;
    const existingClaim = await Transaction.findOne({
      where: {
        userId,
        type: 'bonus',
        description: missionRewardTag
      }
    });

    if (existingClaim) {
      return res.status(400).json({ message: 'Mission reward already claimed' });
    }

    const user = await User.findByPk(userId);
    const balanceBefore = user.chips;

    user.chips += mission.reward;
    await user.save();

    await Transaction.create({
      userId,
      type: 'bonus',
      amount: mission.reward,
      description: missionRewardTag,
      balanceBefore,
      balanceAfter: user.chips
    });

    res.json({ message: 'Reward claimed', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
