import { Op } from 'sequelize';
import { sequelize, User, Mission, Achievement } from '../models/index.js';

const MISSION_DEFINITIONS = [
  {
    title: 'First Victory',
    description: 'Gana 1 mano para arrancar tu racha.',
    requirement: { type: 'wins', count: 1, rewardExperience: 120 },
    reward: 500,
    type: 'permanent'
  },
  {
    title: 'Chip Collector',
    description: 'Alcanza 10,000 fichas en tu balance.',
    requirement: { type: 'chips', count: 10000, rewardExperience: 220 },
    reward: 1000,
    type: 'permanent'
  },
  {
    title: 'Daily Player',
    description: 'Juega 5 manos hoy para mantener actividad.',
    requirement: { type: 'games', count: 5, rewardExperience: 80 },
    reward: 250,
    type: 'daily'
  },
  {
    title: 'High roller',
    description: 'Consigue 10 victorias en total.',
    requirement: { type: 'wins', count: 10, rewardExperience: 450 },
    reward: 2000,
    type: 'permanent'
  }
];

const ACHIEVEMENT_DEFINITIONS = [
  {
    name: 'Primera victoria',
    description: 'Gana tu primera mano.',
    icon: 'trophy-first-win',
    condition: (user) => (user.gamesWon || 0) >= 1
  },
  {
    name: 'Racha de 10',
    description: 'Gana 10 manos en total.',
    icon: 'trophy-10-wins',
    condition: (user) => (user.gamesWon || 0) >= 10
  },
  {
    name: 'Jugador constante',
    description: 'Juega 50 manos.',
    icon: 'trophy-50-games',
    condition: (user) => (user.gamesPlayed || 0) >= 50
  },
  {
    name: 'Golpe grande',
    description: 'Gana una mano de 5,000 fichas o mas.',
    icon: 'trophy-big-pot',
    condition: (user) => (user.highestWinning || 0) >= 5000
  },
  {
    name: 'Magnate de fichas',
    description: 'Acumula 100,000 fichas de ganancias totales.',
    icon: 'trophy-magnate',
    condition: (user) => (user.totalWinnings || 0) >= 100000
  }
];

const getUserMetricByType = (user, requirementType) => {
  if (requirementType === 'wins') {
    return Number(user.gamesWon) || 0;
  }
  if (requirementType === 'chips') {
    return Number(user.chips) || 0;
  }
  if (requirementType === 'games') {
    return Number(user.gamesPlayed) || 0;
  }
  return 0;
};

const getISOWeekKey = (date) => {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const getCurrentPeriodKey = (missionType, now = new Date()) => {
  if (missionType === 'daily') {
    return now.toISOString().slice(0, 10);
  }
  if (missionType === 'weekly') {
    return getISOWeekKey(now);
  }
  return null;
};

const getMissionProgress = (mission, user) => {
  const requirementType = mission?.requirement?.type;
  const requirementCount = Number(mission?.requirement?.count) || 0;

  let baseProgress = getUserMetricByType(user, requirementType);

  if (mission?.type === 'daily' || mission?.type === 'weekly') {
    const baseline = Number(mission?.requirement?.periodBaseline) || 0;
    baseProgress = Math.max(0, baseProgress - baseline);
  }

  return {
    progress: Math.min(baseProgress, requirementCount),
    completed: baseProgress >= requirementCount
  };
};

export const ensureUserMissions = async (userId, transaction = null) => {
  const existingMissions = await Mission.findAll({
    where: { userId },
    attributes: ['id', 'title', 'description', 'reward', 'type', 'requirement'],
    transaction
  });

  if (existingMissions.length === 0) {
    await Mission.bulkCreate(
      MISSION_DEFINITIONS.map((mission) => ({ userId, ...mission })),
      { transaction }
    );
    return;
  }

  const existingTitles = new Set(existingMissions.map((mission) => mission.title));
  const missingMissions = MISSION_DEFINITIONS.filter((mission) => !existingTitles.has(mission.title));
  const existingByTitle = new Map(existingMissions.map((mission) => [mission.title, mission]));

  for (const missionDefinition of MISSION_DEFINITIONS) {
    const existingMission = existingByTitle.get(missionDefinition.title);
    if (!existingMission) continue;

    const requirement = {
      ...(missionDefinition.requirement || {}),
      ...(existingMission.requirement || {}),
      type: missionDefinition?.requirement?.type,
      count: Number(missionDefinition?.requirement?.count) || 0,
      rewardExperience: Number(existingMission?.requirement?.rewardExperience)
        || Number(missionDefinition?.requirement?.rewardExperience)
        || 0
    };

    let changed = false;
    if (existingMission.description !== missionDefinition.description) {
      existingMission.description = missionDefinition.description;
      changed = true;
    }
    if (Number(existingMission.reward) !== Number(missionDefinition.reward)) {
      existingMission.reward = missionDefinition.reward;
      changed = true;
    }
    if (JSON.stringify(existingMission.requirement || {}) !== JSON.stringify(requirement)) {
      existingMission.requirement = requirement;
      changed = true;
    }

    if (changed) {
      await existingMission.save({ transaction });
    }
  }

  if (missingMissions.length === 0) return;

  await Mission.bulkCreate(
    missingMissions.map((mission) => ({ userId, ...mission })),
    { transaction }
  );
};

export const refreshUserMissionProgressDetailed = async (userId, transaction = null) => {
  const user = await User.findByPk(userId, { transaction });
  if (!user) return { missions: [], newlyCompletedMissions: [] };

  await ensureUserMissions(userId, transaction);

  const missions = await Mission.findAll({ where: { userId }, transaction });
  const now = new Date();
  const newlyCompletedMissions = [];

  for (const mission of missions) {
    if (mission.type === 'daily' || mission.type === 'weekly') {
      const requirement = { ...(mission.requirement || {}) };
      const currentPeriodKey = getCurrentPeriodKey(mission.type, now);
      const periodChanged = requirement.periodKey !== currentPeriodKey;

      if (periodChanged) {
        requirement.periodKey = currentPeriodKey;
        requirement.periodBaseline = getUserMetricByType(user, requirement.type);
        mission.completed = false;
        mission.completedAt = null;
        mission.progress = 0;
      } else if (!Number.isFinite(Number(requirement.periodBaseline))) {
        requirement.periodBaseline = getUserMetricByType(user, requirement.type);
      }

      mission.requirement = requirement;
    }

    const { progress, completed } = getMissionProgress(mission, user);
    const requirementCount = Number(mission?.requirement?.count) || 0;
    mission.progress = mission.completed ? requirementCount : progress;
    const becameCompleted = completed && !mission.completed;
    if (becameCompleted) {
      mission.completed = true;
      mission.completedAt = new Date();
      mission.progress = requirementCount;
    }
    await mission.save({ transaction });

    if (becameCompleted) {
      newlyCompletedMissions.push({
        userId,
        missionId: mission.id,
        title: mission.title,
        reward: mission.reward,
        type: mission.type
      });
    }
  }

  return { missions, newlyCompletedMissions };
};

export const refreshUserMissionProgress = async (userId, transaction = null) => {
  const result = await refreshUserMissionProgressDetailed(userId, transaction);
  return result.missions;
};

const unlockAchievementsForUser = async (user, transaction) => {
  const achievementNames = ACHIEVEMENT_DEFINITIONS.map((achievement) => achievement.name);
  const alreadyUnlocked = await Achievement.findAll({
    where: {
      userId: user.id,
      name: { [Op.in]: achievementNames }
    },
    attributes: ['name'],
    transaction
  });

  const unlockedNames = new Set(alreadyUnlocked.map((achievement) => achievement.name));
  const toUnlock = ACHIEVEMENT_DEFINITIONS.filter((achievement) => {
    if (unlockedNames.has(achievement.name)) return false;
    return achievement.condition(user);
  });

  if (toUnlock.length === 0) return [];

  const created = await Achievement.bulkCreate(
    toUnlock.map((achievement) => ({
      userId: user.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      unlockedAt: new Date()
    })),
    { transaction }
  );

  return created;
};

export const processHandProgression = async ({ game, winners = [] }) => {
  const participants = (game?.players || []).filter((player) => {
    if (!player?.userId) return false;
    if (player?.isSittingOut) return false;

    // Solo cuentan jugadores que recibieron mano en esta ronda.
    const cards = Array.isArray(player?.hand) ? player.hand : [];
    return cards.length === 2;
  });
  if (participants.length === 0) {
    return { unlockedAchievements: [], completedMissions: [] };
  }

  const participantIds = [...new Set(participants.map((player) => player.userId))];
  const winnerMap = new Map(
    (winners || []).map((winner) => [winner.userId, Number(winner.chipsWon) || 0])
  );

  return sequelize.transaction(async (transaction) => {
    const users = await User.findAll({
      where: { id: participantIds },
      transaction
    });

    if (users.length === 0) {
      return { unlockedAchievements: [], completedMissions: [] };
    }

    const unlockedAchievements = [];
    const completedMissions = [];

    for (const user of users) {
      user.gamesPlayed = (Number(user.gamesPlayed) || 0) + 1;

      const chipsWon = winnerMap.get(user.id) || 0;
      if (chipsWon > 0) {
        user.gamesWon = (Number(user.gamesWon) || 0) + 1;
        user.totalWinnings = (Number(user.totalWinnings) || 0) + chipsWon;
        user.highestWinning = Math.max(Number(user.highestWinning) || 0, chipsWon);
      }

      await user.save({ transaction });
      const missionProgress = await refreshUserMissionProgressDetailed(user.id, transaction);
      if (missionProgress.newlyCompletedMissions.length > 0) {
        completedMissions.push(...missionProgress.newlyCompletedMissions);
      }

      const unlocked = await unlockAchievementsForUser(user, transaction);
      if (unlocked.length > 0) {
        unlockedAchievements.push(...unlocked.map((achievement) => ({
          userId: achievement.userId,
          name: achievement.name,
          icon: achievement.icon
        })));
      }
    }

    return { unlockedAchievements, completedMissions };
  });
};
