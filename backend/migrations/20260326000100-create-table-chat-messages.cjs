'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const allTables = await queryInterface.showAllTables();
    const tableNames = allTables.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry?.tableName) return entry.tableName;
      return '';
    });

    if (tableNames.includes('table_chat_messages')) {
      return;
    }

    await queryInterface.createTable('table_chat_messages', {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true
      },
      tableId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tables',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      message: {
        type: Sequelize.STRING(300),
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('table_chat_messages', ['tableId', 'createdAt'], {
      name: 'idx_table_chat_messages_table_created_at'
    });

    await queryInterface.addIndex('table_chat_messages', ['userId'], {
      name: 'idx_table_chat_messages_user_id'
    });
  },

  async down(queryInterface) {
    const allTables = await queryInterface.showAllTables();
    const tableNames = allTables.map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry?.tableName) return entry.tableName;
      return '';
    });

    if (!tableNames.includes('table_chat_messages')) {
      return;
    }

    await queryInterface.removeIndex('table_chat_messages', 'idx_table_chat_messages_user_id');
    await queryInterface.removeIndex('table_chat_messages', 'idx_table_chat_messages_table_created_at');
    await queryInterface.dropTable('table_chat_messages');
  }
};
