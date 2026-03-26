// Bot service for AI players

export class BotService {
  constructor() {
    this.bots = [];
  }

  createBot(name, difficulty = 'medium') {
    return {
      id: `bot_${Date.now()}`,
      name,
      difficulty,
      isBot: true
    };
  }

  makeDecision(gameState, botPlayer) {
    // Simple bot decision logic
    const { currentBet, botChips } = gameState;
    const random = Math.random();

    if (this.difficulty === 'easy') {
      if (random < 0.3) return { action: 'fold' };
      if (random < 0.7) return { action: 'call', amount: currentBet };
      return { action: 'raise', amount: currentBet * 2 };
    }

    // Implement more sophisticated bot logic here
    return { action: 'call', amount: currentBet };
  }

  addBotsToTable(table, numBots) {
    for (let i = 0; i < numBots; i++) {
      const bot = this.createBot(`Bot ${i + 1}`);
      this.bots.push(bot);
    }
    return this.bots;
  }
}

export default new BotService();
