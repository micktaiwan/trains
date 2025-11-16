/**
 * Admin chat moderation
 */

const chatsVar = new ReactiveVar([]);
const loadingChatsVar = new ReactiveVar(false);
const chatLimitVar = new ReactiveVar(100);
let currentChatId = null;

Template.adminChat.onCreated(function() {
  this.loadChats = () => {
    loadingChatsVar.set(true);
    const limit = chatLimitVar.get();
    Meteor.call('adminGetAllChats', limit, (err, result) => {
      loadingChatsVar.set(false);
      if (err) {
        console.error('Error loading chats:', err);
      } else {
        chatsVar.set(result);
      }
    });
  };

  // Load chats on creation
  this.loadChats();

  // Auto-refresh every 30 seconds
  this.chatsInterval = Meteor.setInterval(() => {
    this.loadChats();
  }, 30000);
});

Template.adminChat.onDestroyed(function() {
  if (this.chatsInterval) {
    Meteor.clearInterval(this.chatsInterval);
  }
});

Template.adminChat.onRendered(function() {
  // Initialize dropdown
  $('.ui.dropdown').dropdown();

  // Initialize modal
  $('.ui.modal.delete-chat-modal').modal({
    onApprove: function() {
      return false; // Prevent auto-close
    }
  });
});

Template.adminChat.helpers({
  chats: function() {
    return chatsVar.get();
  },

  loadingChats: function() {
    return loadingChatsVar.get();
  },

  currentLimit: function() {
    return chatLimitVar.get();
  },

  formatDate: function(date) {
    if (!date) return 'N/A';
    return moment(date).format('HH:mm:ss DD/MM/YY');
  },

  eq: function(a, b) {
    return a === b;
  }
});

Template.adminChat.events({
  'click .refresh-chats': function(e, template) {
    e.preventDefault();
    template.loadChats();
  },

  'click .set-limit': function(e, template) {
    e.preventDefault();
    const limit = parseInt($(e.currentTarget).data('limit'));
    chatLimitVar.set(limit);
    template.loadChats();
  },

  'click .delete-chat': function(e) {
    e.preventDefault();
    currentChatId = $(e.currentTarget).data('chat-id');
    $('.ui.modal.delete-chat-modal').modal('show');
  },

  'click .confirm-delete-chat': function(e, template) {
    e.preventDefault();

    Meteor.call('adminDeleteChat', currentChatId, (err) => {
      if (err) {
        alert('Error: ' + err.message);
      } else {
        $('.ui.modal.delete-chat-modal').modal('hide');
        template.loadChats();
      }
    });
  }
});
