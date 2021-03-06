/**
 * Created by mfaivremacon on 08/09/2015.
 */

Template.lobby.onRendered(function() {});

Template.lobby.helpers({

  connected: function() {
    return Meteor.status().connected;
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

  'submit .newgame': function(e) { //FIXME P0: check if loggued
    e.preventDefault();
    const name = $('#gameName').val();
    Meteor.call('gameCreate', name, function(err, rv) {
      Router.go('/game/' + rv);
    });
  },

  'submit .chatmsg': function(e) {
    e.preventDefault();
    const msg = $('#chatMsg').val();
    Meteor.call('chatPost', msg, 'lobby', function(err, rv) {
      $('#chatMsg').val('');
    });
  }

});
