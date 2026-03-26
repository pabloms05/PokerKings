// Mission and achievement service

const missions = [
  {
    id: 1,
    name: 'First Win',
    description: 'Win your first game',
    reward: 500,
    requirement: { type: 'wins', count: 1 }
  },
  {
    id: 2,
    name: 'High Roller',
    description: 'Win 10 games',
    reward: 2000,
    requirement: { type: 'wins', count: 10 }
  },
  {
    id: 3,
    name: 'Chip Collector',
    description: 'Accumulate 10,000 chips',
    reward: 1000,
    requirement: { type: 'chips', count: 10000 }
  }
];

export class MissionService {
  getMissions() {
    return missions;
  }

  checkMissionProgress(user, missionId) {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return false;

    switch (mission.requirement.type) {
      case 'wins':
        return user.stats.gamesWon >= mission.requirement.count;
      case 'chips':
        return user.chips >= mission.requirement.count;
      default:
        return false;
    }
  }

  async completeMission(user, missionId) {
    const mission = missions.find(m => m.id === missionId);
    if (mission && this.checkMissionProgress(user, missionId)) {
      user.chips += mission.reward;
      await user.save();
      return { completed: true, reward: mission.reward };
    }
    return { completed: false };
  }
}

export default new MissionService();
