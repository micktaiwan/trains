/**
 * Admin panel main controller
 */

// Global helpers for all admin templates
Template.registerHelper('getActionIcon', function(action) {
  const icons = {
    'delete_user': 'user delete',
    'toggle_admin': 'shield',
    'reset_password': 'key',
    'delete_game': 'gamepad',
    'update_game': 'edit',
    'delete_chat': 'comment',
    'auto_admin_assignment': 'star'
  };
  return icons[action] || 'info circle';
});

Template.registerHelper('getActionColor', function(action) {
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
});

Template.registerHelper('formatLogAction', function(action) {
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
});

Template.Admin.onRendered(function() {
  const self = this;

  // Get active tab from route parameter or default to 'dashboard'
  const activeTab = this.data && this.data.activeTab ? this.data.activeTab : 'dashboard';

  // Initialize Semantic UI tabs
  $('.menu .item').tab();

  // Activate the correct tab based on route
  $('.menu .item[data-tab="' + activeTab + '"]').addClass('active');
  $('.tab[data-tab="' + activeTab + '"]').addClass('active');

  // Handle tab changes and update URL
  $('.menu .item').on('click', function() {
    const tab = $(this).data('tab');
    Router.go('/admin/' + tab);
  });
});

Template.Admin.helpers({
  isAdmin: function() {
    const user = Meteor.user();
    return user && user.roles && user.roles.includes('admin');
  },

  isActiveTab: function(tab) {
    const currentData = Template.currentData();
    const activeTab = currentData && currentData.activeTab ? currentData.activeTab : 'dashboard';
    return activeTab === tab;
  }
});

// Dashboard template
const statsVar = new ReactiveVar(null);
const statsLoadingVar = new ReactiveVar(false);

Template.adminDashboard.onCreated(function() {
  // Load stats on creation
  this.autorun(() => {
    statsLoadingVar.set(true);
    Meteor.callAsync('adminGetStats').then(result => {
      statsVar.set(result);
      statsLoadingVar.set(false);
    }).catch(err => {
      console.error('Error loading stats:', err);
      statsLoadingVar.set(false);
    });
  });

  // Refresh stats every 30 seconds
  this.statsInterval = Meteor.setInterval(() => {
    Meteor.callAsync('adminGetStats').then(result => {
      statsVar.set(result);
    }).catch(err => {
      console.error('Error refreshing stats:', err);
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
