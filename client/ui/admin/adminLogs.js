/**
 * Admin logs viewer
 */

Template.adminLogs.onCreated(function() {
  // Subscribe to admin logs
  this.subscribe('admin_logs', 50);
});

Template.adminLogs.helpers({
  logs: function() {
    return AdminLogs.find({}, { sort: { timestamp: -1 } });
  },

  logsCount: function() {
    return AdminLogs.find().count();
  },

  formatDate: function(date) {
    if (!date) return 'N/A';
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
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
