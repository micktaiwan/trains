/**
 * Admin publications - Protected publications for admin users
 */

import { Helpers } from '/classes/helpers.js';

// Publish all users for admin panel
Meteor.publish('admin_all_users', async function() {
  if (!await Helpers.isAdmin(this.userId)) {
    return this.ready();
  }

  return Meteor.users.find({}, {
    fields: {
      username: 1,
      emails: 1,
      roles: 1,
      createdAt: 1,
      'status.online': 1,
      'status.lastLogin': 1,
      'status.idle': 1
    }
  });
});

// Publish all games for admin panel
Meteor.publish('admin_all_games', async function() {
  if (!await Helpers.isAdmin(this.userId)) {
    return this.ready();
  }

  return Games.find({});
});

// Publish all chats for admin panel
Meteor.publish('admin_all_chats', async function(limit = 100) {
  if (!await Helpers.isAdmin(this.userId)) {
    return this.ready();
  }

  return Chats.find({}, {
    limit: limit,
    sort: { time: -1 }
  });
});

// Publish admin logs
Meteor.publish('admin_logs', async function(limit = 50) {
  if (!await Helpers.isAdmin(this.userId)) {
    return this.ready();
  }

  return AdminLogs.find({}, {
    limit: limit,
    sort: { timestamp: -1 }
  });
});

// Publish all teams for admin panel
Meteor.publish('admin_all_teams', async function() {
  if (!await Helpers.isAdmin(this.userId)) {
    return this.ready();
  }

  return Teams.find({});
});

// Publish all map objects count by game for admin panel
Meteor.publish('admin_map_objects_count', async function() {
  if (!await Helpers.isAdmin(this.userId)) {
    return this.ready();
  }

  // This is a more complex aggregation, so we'll compute it on-demand via methods
  // Just return empty for now
  return this.ready();
});
