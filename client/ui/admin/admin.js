/**
 * Admin panel main controller
 */

Template.Admin.onRendered(function() {
  // Initialize Semantic UI tabs
  $('.menu .item').tab();
});

Template.Admin.helpers({
  isAdmin: function() {
    const user = Meteor.user();
    return user && user.roles && user.roles.includes('admin');
  }
});

// Dashboard template
const statsVar = new ReactiveVar(null);
const statsLoadingVar = new ReactiveVar(false);

Template.adminDashboard.onCreated(function() {
  // Load stats on creation
  this.autorun(() => {
    statsLoadingVar.set(true);
    Meteor.call('adminGetStats', (err, result) => {
      statsLoadingVar.set(false);
      if (err) {
        console.error('Error loading stats:', err);
      } else {
        statsVar.set(result);
      }
    });
  });

  // Refresh stats every 30 seconds
  this.statsInterval = Meteor.setInterval(() => {
    Meteor.call('adminGetStats', (err, result) => {
      if (!err) {
        statsVar.set(result);
      }
    });
  }, 30000);
});

Template.adminDashboard.onDestroyed(function() {
  if (this.statsInterval) {
    Meteor.clearInterval(this.statsInterval);
  }
});

Template.adminDashboard.helpers({
  stats: function() {
    return statsVar.get();
  },

  loading: function() {
    return statsLoadingVar.get();
  },

  formatDate: function(date) {
    if (!date) return 'N/A';
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
  },

  formatLogAction: function(action) {
    const actionLabels = {
      'auto_admin_assignment': 'First Admin',
      'delete_user': 'Delete User',
      'toggle_admin': 'Toggle Admin',
      'reset_password': 'Reset Password',
      'delete_game': 'Delete Game',
      'update_game': 'Update Game',
      'delete_chat': 'Delete Chat'
    };
    return actionLabels[action] || action.replace(/_/g, ' ').toUpperCase();
  },

  getActionColor: function(action) {
    const colors = {
      'delete_user': 'red',
      'toggle_admin': 'orange',
      'reset_password': 'yellow',
      'delete_game': 'red',
      'update_game': 'blue',
      'delete_chat': 'red',
      'auto_admin_assignment': 'green'
    };
    return colors[action] || 'grey';
  },

  getLogDetails: function(log) {
    switch(log.action) {
      case 'delete_user':
        return `Deleted user: ${log.targetUsername}`;
      case 'toggle_admin':
        return `Toggled admin for: ${log.targetUsername}`;
      case 'delete_game':
        return `Deleted game: ${log.gameName}`;
      case 'delete_chat':
        return `Deleted chat message from: ${log.chatUser.name}`;
      default:
        return log.details || 'No details available';
    }
  }
});
