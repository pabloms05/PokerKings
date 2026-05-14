'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('games').catch(() => null);
    if (!tableDescription) return;

    if (!tableDescription.pendingPlayers) {
      await queryInterface.addColumn('games', 'pendingPlayers', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: []
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('games').catch(() => null);
    if (!tableDescription || !tableDescription.pendingPlayers) return;

    await queryInterface.removeColumn('games', 'pendingPlayers');
  }
};
