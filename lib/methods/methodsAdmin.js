/**
 * Admin methods - Protected methods for admin users
 */

import { Helpers } from '../../classes/helpers.js';

Meteor.methods({

  // ============ USER MANAGEMENT ============

  adminGetUsers: async function() {
    await Helpers.requireAdmin(this.userId);

    const users = await Meteor.users.find({}, {
      fields: {
        username: 1,
        emails: 1,
        roles: 1,
        createdAt: 1,
        'status.online': 1,
        'status.lastLogin': 1
      }
    }).fetchAsync();

    return users;
  },

  adminDeleteUser: async function(targetUserId) {
    await Helpers.requireAdmin(this.userId);

    if (this.userId === targetUserId) {
      throw new Meteor.Error(400, 'Cannot delete yourself');
    }

    const targetUser = await Meteor.users.findOneAsync(targetUserId);
    if (!targetUser) {
      throw new Meteor.Error(404, 'User not found');
    }

    // Remove user from teams
    await Teams.updateAsync(
      { 'members._id': targetUserId },
      { $pull: { members: { _id: targetUserId } } },
      { multi: true }
    );

    // Remove user from games
    await Games.updateAsync(
      { 'players._id': targetUserId },
      { $pull: { players: { _id: targetUserId } } },
      { multi: true }
    );

    // Delete the user
    await Meteor.users.removeAsync(targetUserId);

    // Log the action
    await AdminLogs.insertAsync({
      action: 'delete_user',
      adminId: this.userId,
      targetUserId: targetUserId,
      targetUsername: targetUser.username,
      timestamp: new Date()
    });

    return { success: true };
  },

  adminToggleAdmin: async function(targetUserId) {
    await Helpers.requireAdmin(this.userId);

    if (this.userId === targetUserId) {
      throw new Meteor.Error(400, 'Cannot modify your own admin status');
    }

    const targetUser = await Meteor.users.findOneAsync(targetUserId);
    if (!targetUser) {
      throw new Meteor.Error(404, 'User not found');
    }

    const isCurrentlyAdmin = targetUser.roles && targetUser.roles.includes('admin');
    const newRoles = isCurrentlyAdmin ? ['user'] : ['admin'];

    await Meteor.users.updateAsync(targetUserId, {
      $set: { roles: newRoles }
    });

    // Log the action
    await AdminLogs.insertAsync({
      action: 'toggle_admin',
      adminId: this.userId,
      targetUserId: targetUserId,
      targetUsername: targetUser.username,
      newRoles: newRoles,
      timestamp: new Date()
    });

    return { success: true, isAdmin: !isCurrentlyAdmin };
  },

  adminResetPassword: async function(targetUserId, newPassword) {
    await Helpers.requireAdmin(this.userId);

    const targetUser = await Meteor.users.findOneAsync(targetUserId);
    if (!targetUser) {
      throw new Meteor.Error(404, 'User not found');
    }

    // Reset password
    await Accounts.setPasswordAsync(targetUserId, newPassword);

    // Log the action
    await AdminLogs.insertAsync({
      action: 'reset_password',
      adminId: this.userId,
      targetUserId: targetUserId,
      targetUsername: targetUser.username,
      timestamp: new Date()
    });

    return { success: true };
  },

  // ============ GAME MANAGEMENT ============

  adminGetAllGames: async function() {
    await Helpers.requireAdmin(this.userId);

    const games = await Games.find({}).fetchAsync();

    // Get object counts for each game
    const gamesWithStats = await Promise.all(games.map(async (game) => {
      const objectCount = await MapObjects.countDocuments({ game_id: game._id });
      const teamCount = await Teams.countDocuments({ game_id: game._id });

      return {
        ...game,
        objectCount,
        teamCount,
        playerCount: game.players ? game.players.length : 0
      };
    }));

    return gamesWithStats;
  },

  adminDeleteGame: async function(gameId) {
    await Helpers.requireAdmin(this.userId);

    const game = await Games.findOneAsync(gameId);
    if (!game) {
      throw new Meteor.Error(404, 'Game not found');
    }

    // Delete all map objects
    await MapObjects.removeAsync({ game_id: gameId });

    // Delete all teams
    await Teams.removeAsync({ game_id: gameId });

    // Delete game chats
    await Chats.removeAsync({ game_id: gameId });

    // Delete the game
    await Games.removeAsync(gameId);

    // Log the action
    await AdminLogs.insertAsync({
      action: 'delete_game',
      adminId: this.userId,
      gameId: gameId,
      gameName: game.name,
      timestamp: new Date()
    });

    return { success: true };
  },

  adminUpdateGame: async function(gameId, updates) {
    await Helpers.requireAdmin(this.userId);

    const game = await Games.findOneAsync(gameId);
    if (!game) {
      throw new Meteor.Error(404, 'Game not found');
    }

    // Only allow updating specific fields
    const allowedFields = ['name', 'clock'];
    const sanitizedUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = updates[key];
      }
    });

    await Games.updateAsync(gameId, { $set: sanitizedUpdates });

    // Log the action
    await AdminLogs.insertAsync({
      action: 'update_game',
      adminId: this.userId,
      gameId: gameId,
      gameName: game.name,
      updates: sanitizedUpdates,
      timestamp: new Date()
    });

    return { success: true };
  },

  // ============ CHAT MODERATION ============

  adminGetAllChats: async function(limit = 100) {
    await Helpers.requireAdmin(this.userId);

    const chats = await Chats.find({}, {
      limit: limit,
      sort: { time: -1 }
    }).fetchAsync();

    return chats;
  },

  adminDeleteChat: async function(chatId) {
    await Helpers.requireAdmin(this.userId);

    const chat = await Chats.findOneAsync(chatId);
    if (!chat) {
      throw new Meteor.Error(404, 'Chat message not found');
    }

    await Chats.removeAsync(chatId);

    // Log the action
    await AdminLogs.insertAsync({
      action: 'delete_chat',
      adminId: this.userId,
      chatId: chatId,
      chatUser: chat.user,
      chatMsg: chat.msg,
      timestamp: new Date()
    });

    return { success: true };
  },

  // ============ STATISTICS ============

  adminGetStats: async function() {
    await Helpers.requireAdmin(this.userId);

    // Count total users
    const totalUsers = await Meteor.users.countDocuments();

    // Count online users
    const onlineUsers = await Meteor.users.countDocuments({
      'status.online': true
    });

    // Count total games
    const totalGames = await Games.countDocuments();

    // Count active games (games with players)
    const activeGames = await Games.countDocuments({
      'players.0': { $exists: true }
    });

    // Count total map objects
    const totalMapObjects = await MapObjects.countDocuments();

    // Count total teams
    const totalTeams = await Teams.countDocuments();

    // Count total chat messages
    const totalChats = await Chats.countDocuments();

    // Get recent admin logs
    const recentLogs = await AdminLogs.find({}, {
      limit: 10,
      sort: { timestamp: -1 }
    }).fetchAsync();

    return {
      totalUsers,
      onlineUsers,
      totalGames,
      activeGames,
      totalMapObjects,
      totalTeams,
      totalChats,
      recentLogs
    };
  },

  // ============ ADMIN LOGS ============

  adminGetLogs: async function(limit = 50) {
    await Helpers.requireAdmin(this.userId);

    const logs = await AdminLogs.find({}, {
      limit: limit,
      sort: { timestamp: -1 }
    }).fetchAsync();

    return logs;
  }

});
