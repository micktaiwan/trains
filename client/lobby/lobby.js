/**
 * Created by mfaivremacon on 08/09/2015.
 */

Template.lobby.onRendered(function() {
});

Template.lobby.helpers({

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

Template.gameItem.helpers({

  // TODO: if we use these helpers we must publish all tiles and train... find another way
  railsCount: function() {
    return Tiles.find({game_id: this._id}).count();
  },

  trainPos: function() {
    return Trains.findOne({game_id: this._id}).pos;
  }

});


Template.lobby.events({

  'submit .newgame': function(e) {
    e.preventDefault();
    var name = $('#gameName').val();
    Meteor.call('gameCreate', name, function(err, rv) {
      Router.go('/game/' + rv);
    });
  },

  'submit .chatmsg': function(e) {
    e.preventDefault();
    var msg = $('#chatMsg').val();
    Meteor.call('chatPost', msg, 'lobby', function(err, rv) {
      $('#chatMsg').val('');
    });
  }

});
