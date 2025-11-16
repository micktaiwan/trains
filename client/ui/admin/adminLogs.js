/**
 * Admin logs viewer
 */

Template.adminLogs.helpers({
  logs: function() {
    return AdminLogs.find({}, { sort: { timestamp: -1 } });
  },

  formatDate: function(date) {
    if (!date) return 'N/A';
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
  },

  formatAction: function(action) {
    return action.replace(/_/g, ' ').toUpperCase();
  },

  getActionIcon: function(action) {
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
        return `User "${log.targetUsername}" (${log.targetUserId}) was deleted`;
      case 'toggle_admin':
        const role = log.newRoles && log.newRoles.includes('admin') ? 'admin' : 'user';
        return `User "${log.targetUsername}" role changed to ${role}`;
      case 'reset_password':
        return `Password reset for user "${log.targetUsername}"`;
      case 'delete_game':
        return `Game "${log.gameName}" (${log.gameId}) was deleted`;
      case 'update_game':
        return `Game "${log.gameName}" was updated`;
      case 'delete_chat':
        return `Chat message from "${log.chatUser.name}" was deleted: "${log.chatMsg}"`;
      case 'auto_admin_assignment':
        return log.details || `Admin role automatically assigned to first user: ${log.username}`;
      default:
        return log.details || 'No details available';
    }
  }
});

Template.adminLogs.events({
  'click .refresh-logs': function(e) {
    e.preventDefault();
    // Logs are reactive via subscription, but we can trigger a manual refresh if needed
    Meteor.call('adminGetLogs', 50, (err, result) => {
      if (err) {
        console.error('Error loading logs:', err);
      }
    });
  }
});
