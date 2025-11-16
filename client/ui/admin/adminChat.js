/**
 * Admin chat moderation
 */

const chatsVar = new ReactiveVar([]);
const loadingChatsVar = new ReactiveVar(false);
const chatLimitVar = new ReactiveVar(100);
let currentChatId = null;

Template.adminChat.onCreated(function() {
  this.loadChats = async () => {
    loadingChatsVar.set(true);
    const limit = chatLimitVar.get();
    try {
      const result = await Meteor.callAsync('adminGetAllChats', limit);
      chatsVar.set(result);
    } catch (err) {
      console.error('Error loading chats:', err);
    } finally {
      loadingChatsVar.set(false);
    }
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

  // Initialize modal with detachable: false to keep it in Blaze template DOM
  $('.ui.modal.delete-chat-modal').modal({
    detachable: false,
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

  'click .confirm-delete-chat': async function(e, template) {
    e.preventDefault();

    try {
      await Meteor.callAsync('adminDeleteChat', currentChatId);
      $('.ui.modal.delete-chat-modal').modal('hide');
      template.loadChats();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }
});
