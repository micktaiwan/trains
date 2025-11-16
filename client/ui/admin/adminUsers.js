/**
 * Admin users management
 */

let currentUserId = null;

Template.adminUsers.onRendered(function() {
  // Initialize modals
  $('.ui.modal.reset-password-modal').modal({
    onApprove: function() {
      return false; // Prevent auto-close, we'll handle it in the button click
    }
  });

  $('.ui.modal.delete-user-modal').modal({
    onApprove: function() {
      return false; // Prevent auto-close
    }
  });
});

Template.adminUsers.helpers({
  users: function() {
    return Meteor.users.find({}, { sort: { username: 1 } });
  },

  noUsers: function() {
    return Meteor.users.find().count() === 0;
  },

  isCurrentUser: function(userId) {
    return userId === Meteor.userId();
  },

  isAdmin: function(user) {
    return user.roles && user.roles.includes('admin');
  },

  isOnline: function(user) {
    return user.status && user.status.online;
  },

  getUserEmail: function(user) {
    if (user.emails && user.emails.length > 0) {
      return user.emails[0].address;
    }
    return 'N/A';
  },

  formatLastLogin: function(user) {
    if (user.status && user.status.lastLogin && user.status.lastLogin.date) {
      return moment(user.status.lastLogin.date).fromNow();
    }
    return 'Never';
  }
});

Template.adminUsers.events({
  'click .toggle-admin': function(e) {
    e.preventDefault();
    const userId = $(e.currentTarget).data('user-id');

    Meteor.call('adminToggleAdmin', userId, (err, result) => {
      if (err) {
        alert('Error: ' + err.message);
      } else {
        console.log('Admin status toggled:', result);
      }
    });
  },

  'click .reset-password': function(e) {
    e.preventDefault();
    currentUserId = $(e.currentTarget).data('user-id');
    $('.ui.modal.reset-password-modal').modal('show');
  },

  'click .confirm-reset-password': function(e) {
    e.preventDefault();

    const newPassword = $('.reset-password-modal input[name="newPassword"]').val();
    const confirmPassword = $('.reset-password-modal input[name="confirmPassword"]').val();

    if (!newPassword || !confirmPassword) {
      alert('Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    Meteor.call('adminResetPassword', currentUserId, newPassword, (err) => {
      if (err) {
        alert('Error: ' + err.message);
      } else {
        alert('Password reset successfully');
        $('.ui.modal.reset-password-modal').modal('hide');
        $('.reset-password-modal form')[0].reset();
      }
    });
  },

  'click .delete-user': function(e) {
    e.preventDefault();
    currentUserId = $(e.currentTarget).data('user-id');
    $('.ui.modal.delete-user-modal').modal('show');
  },

  'click .confirm-delete-user': function(e) {
    e.preventDefault();

    Meteor.call('adminDeleteUser', currentUserId, (err) => {
      if (err) {
        alert('Error: ' + err.message);
      } else {
        alert('User deleted successfully');
        $('.ui.modal.delete-user-modal').modal('hide');
      }
    });
  }
});
