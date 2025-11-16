/**
 * Created by mfaivremacon on 08/09/2015.
 */

Template.lobby.onRendered(function() {});

Template.lobby.helpers({

  connected: function() {
    return Meteor.status().connected;
  },

  currentUser: function() {
    return Meteor.user();
  },

  isAdmin: function() {
    const user = Meteor.user();
    return user && user.roles && user.roles.includes('admin');
  },

  games: function() {
    return Games.find();
  },

  usersOnline: function() {
    return Meteor.users.find({"status.online": true}, {
      sort: {
        "status.online": -1,
        "status.lastLogin.date": -1
      }
    });
  },

  usersOffline: function() {
    return Meteor.users.find({"status.online": false}, {
      sort: {
        "status.online": -1,
        "status.lastLogin.date": -1
      }
    });
  },

  chats: function() {
    return Chats.find({}, {sort: {time: 1}});
  }

});

Template.onlineUser.helpers({

  onlineClass: function() {
    if(!this.status) return "offline";
    if(this.status.idle) return "grey";
    if(this.status.online) return "blue";
    return "offline";
  }

});

Template.gameItem.helpers({});


Template.lobby.events({

  'submit .newgame': async function(e) {
    e.preventDefault();

    // Check if user is logged in
    if (!Meteor.userId()) {
      alert('You must be logged in to create a game. Please log in or register.');
      return;
    }

    const name = $('#gameName').val();

    // Validate game name
    if (!name || name.trim() === '') {
      alert('Please enter a game name.');
      return;
    }

    try {
      const gameId = await Meteor.callAsync('gameCreate', name);
      Router.go('/game/' + gameId);
    } catch(err) {
      console.error('Error creating game:', err);
      alert('Error creating game: ' + err.message);
    }
  },

  'submit .chatmsg': async function(e) {
    e.preventDefault();
    const msg = $('#chatMsg').val();
    try {
      await Meteor.callAsync('chatPost', msg, 'lobby');
      $('#chatMsg').val('');
    } catch(err) {
      console.error('Error posting chat:', err);
    }
  }

});
