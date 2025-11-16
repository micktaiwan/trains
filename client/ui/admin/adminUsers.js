/**
 * Admin users management
 */

let currentUserId = null;

Template.adminUsers.onRendered(function() {
  // Initialize modals with detachable: false to keep them in Blaze template DOM
  $('.ui.modal.reset-password-modal').modal({
    detachable: false,
    onApprove: function() {
      return false; // Prevent auto-close, we'll handle it in the button click
    }
  });

  $('.ui.modal.delete-user-modal').modal({
    detachable: false,
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
  'click .toggle-admin': async function(e) {
    e.preventDefault();
    const userId = $(e.currentTarget).data('user-id');

    try {
      const result = await Meteor.callAsync('adminToggleAdmin', userId);
      console.log('Admin status toggled:', result);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  },

  'click .reset-password': function(e) {
    e.preventDefault();
    currentUserId = $(e.currentTarget).data('user-id');
    $('.ui.modal.reset-password-modal').modal('show');
  },

  'click .confirm-reset-password': async function(e) {
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

    try {
      await Meteor.callAsync('adminResetPassword', currentUserId, newPassword);
      $('.ui.modal.reset-password-modal').modal('hide');
      $('.reset-password-modal form')[0].reset();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  },

  'click .delete-user': function(e) {
    e.preventDefault();
    currentUserId = $(e.currentTarget).data('user-id');
    $('.ui.modal.delete-user-modal').modal('show');
  },

  'click .confirm-delete-user': async function(e) {
    e.preventDefault();

    try {
      await Meteor.callAsync('adminDeleteUser', currentUserId);
      $('.ui.modal.delete-user-modal').modal('hide');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }
});
