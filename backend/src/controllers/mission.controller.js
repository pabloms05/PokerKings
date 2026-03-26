import { Mission, User, Transaction } from '../models/index.js';

const MISSIONS = [
  {
    title: 'First Victory',
    description: 'Win your first game',
    requirement: { type: 'wins', count: 1 },
    reward: 500,
    type: 'permanent'
  },
  {
    title: 'Chip Collector',
    description: 'Accumulate 10,000 chips',
    requirement: { type: 'chips', count: 10000 },
    reward: 1000,
    type: 'permanent'
  },
  {
    title: 'Daily Player',
    description: 'Play 5 games today',
    requirement: { type: 'games', count: 5 },
    reward: 250,
    type: 'daily'
  },
  {
    title: 'High Roller',
    description: 'Win 10 games',
    requirement: { type: 'wins', count: 10 },
    reward: 2000,
    type: 'permanent'
  }
];

export const getMissions = async (req, res) => {
  try {
    const userId = req.params.userId;

    const missions = await Mission.findAll({
      where: { userId }
    });

    if (missions.length === 0) {
      // Create default missions for new user
      for (const mission of MISSIONS) {
        await Mission.create({
          userId,
          ...mission
        });
      }
      const newMissions = await Mission.findAll({ where: { userId } });
      return res.json(newMissions);
    }

    res.json(missions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkMissionProgress = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findByPk(userId);

    const missions = await Mission.findAll({
      where: { userId, completed: false }
    });

    for (const mission of missions) {
      let progress = 0;
      const req_type = mission.requirement.type;
      const req_count = mission.requirement.count;

      if (req_type === 'wins') {
        progress = user.gamesWon;
      } else if (req_type === 'chips') {
        progress = user.chips;
      } else if (req_type === 'games') {
        progress = user.gamesPlayed;
      }

      mission.progress = Math.min(progress, req_count);

      if (progress >= req_count) {
        mission.completed = true;
        mission.completedAt = new Date();
        await mission.save();
      } else {
        await mission.save();
      }
    }

    const updatedMissions = await Mission.findAll({
      where: { userId }
    });

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

    const user = await User.findByPk(userId);
    const balanceBefore = user.chips;

    user.chips += mission.reward;
    await user.save();

    await Transaction.create({
      userId,
      type: 'bonus',
      amount: mission.reward,
      description: `Mission reward: ${mission.title}`,
      balanceBefore,
      balanceAfter: user.chips
    });

    res.json({ message: 'Reward claimed', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
