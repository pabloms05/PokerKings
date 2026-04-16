import { Mission, User, Transaction } from '../models/index.js';
import { sequelize } from '../models/index.js';
import { Op } from 'sequelize';
import { ensureUserMissions, refreshUserMissionProgress } from '../services/progression.service.js';

const buildMissionRewardTag = (mission) => {
  const missionPeriodKey = (mission.type === 'daily' || mission.type === 'weekly')
    ? (mission.requirement?.periodKey || 'period-unknown')
    : 'permanent';
  return `mission:${mission.id}:${missionPeriodKey}`;
};

const getMissionExperienceReward = (mission) => {
  return Number(mission?.requirement?.rewardExperience) || 0;
};

const applyExperienceReward = (user, experienceReward) => {
  const gainedExp = Math.max(0, Number(experienceReward) || 0);
  if (gainedExp === 0) {
    return { gainedExp: 0, levelBefore: user.level, levelAfter: user.level };
  }

  const levelBefore = Number(user.level) || 1;
  let levelAfter = levelBefore;
  user.experience = (Number(user.experience) || 0) + gainedExp;

  // Regla simple de nivelado: cada nivel requiere level * 1000 de experiencia total.
  while ((Number(user.experience) || 0) >= levelAfter * 1000) {
    levelAfter += 1;
  }

  user.level = levelAfter;
  return { gainedExp, levelBefore, levelAfter };
};

const enrichMissionsWithClaimStatus = async (userId, missions) => {
  if (!Array.isArray(missions) || missions.length === 0) return [];

  const tags = missions.map((mission) => buildMissionRewardTag(mission));
  const claims = await Transaction.findAll({
    where: {
      userId,
      type: 'bonus',
      description: { [Op.in]: tags }
    },
    attributes: ['description']
  });
  const claimedTags = new Set(claims.map((claim) => claim.description));

  return missions.map((mission) => {
    const missionJson = typeof mission.toJSON === 'function' ? mission.toJSON() : mission;
    const claimTag = buildMissionRewardTag(missionJson);
    const claimed = claimedTags.has(claimTag);
      const rewardExperience = getMissionExperienceReward(missionJson);
    return {
      ...missionJson,
      claimTag,
        rewardExperience,
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

    const result = await sequelize.transaction(async (transaction) => {
      const mission = await Mission.findByPk(missionId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!mission || mission.userId !== userId) {
        return { status: 404, body: { message: 'Mission not found' } };
      }

      if (!mission.completed) {
        return { status: 400, body: { message: 'Mission not completed' } };
      }

      const missionRewardTag = buildMissionRewardTag(mission);
      const existingClaim = await Transaction.findOne({
        where: {
          userId,
          type: 'bonus',
          description: missionRewardTag
        },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (existingClaim) {
        return { status: 400, body: { message: 'Mission reward already claimed' } };
      }

      const user = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      const balanceBefore = Number(user.chips) || 0;
      const experienceBefore = Number(user.experience) || 0;
      const rewardExperience = getMissionExperienceReward(mission);

      user.chips = balanceBefore + (Number(mission.reward) || 0);
      const expResult = applyExperienceReward(user, rewardExperience);
      await user.save({ transaction });

      await Transaction.create({
        userId,
        type: 'bonus',
        amount: mission.reward,
        description: missionRewardTag,
        balanceBefore,
        balanceAfter: user.chips
      }, { transaction });

      return {
        status: 200,
        body: {
          message: 'Reward claimed',
          user,
          reward: {
            chips: Number(mission.reward) || 0,
            experience: rewardExperience,
            experienceBefore,
            experienceAfter: Number(user.experience) || 0,
            levelBefore: expResult.levelBefore,
            levelAfter: expResult.levelAfter
          }
        }
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
