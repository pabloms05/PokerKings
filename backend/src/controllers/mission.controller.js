import { Mission, User, Transaction } from '../models/index.js';
import { ensureUserMissions, refreshUserMissionProgress } from '../services/progression.service.js';

const buildMissionRewardTag = (mission) => {
  const missionPeriodKey = (mission.type === 'daily' || mission.type === 'weekly')
    ? (mission.requirement?.periodKey || 'period-unknown')
    : 'permanent';
  return `mission:${mission.id}:${missionPeriodKey}`;
};

const enrichMissionsWithClaimStatus = async (userId, missions) => {
  if (!Array.isArray(missions) || missions.length === 0) return [];

  const tags = missions.map((mission) => buildMissionRewardTag(mission));
  const claims = await Transaction.findAll({
    where: {
      userId,
      type: 'bonus',
      description: tags
    },
    attributes: ['description']
  });
  const claimedTags = new Set(claims.map((claim) => claim.description));

  return missions.map((mission) => {
    const missionJson = typeof mission.toJSON === 'function' ? mission.toJSON() : mission;
    const claimTag = buildMissionRewardTag(missionJson);
    const claimed = claimedTags.has(claimTag);
    return {
      ...missionJson,
      claimTag,
      claimed,
      claimable: !!missionJson.completed && !claimed
    };
  });
};

export const getMissions = async (req, res) => {
  try {
    const userId = req.userId;
    await ensureUserMissions(userId);

    const missions = await Mission.findAll({ where: { userId } });
    const enrichedMissions = await enrichMissionsWithClaimStatus(userId, missions);

    res.json(enrichedMissions);
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
    const enrichedMissions = await enrichMissionsWithClaimStatus(userId, updatedMissions);

    res.json(enrichedMissions);
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

    const missionRewardTag = buildMissionRewardTag(mission);
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
