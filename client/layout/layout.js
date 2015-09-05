Template.layout.helpers({

  connected: function() {
    return Meteor.status().connected;
  }

});

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
  }

});

Template.onlineUser.helpers({

  onlineClass: function() {
    if(!this.status) return "offline";
    if(this.status.idle) return "";
    if(this.status.online) return "blue";
    return "offline";
  }

});

Template.lobby.events({

  'submit': function(e) {
    console.log(e);
    e.preventDefault();
    var name = $('#gameName').val();
    Meteor.call('gameCreate', name, function(err, rv) {
      console.log(err, rv);
      Router.go('/game/' + rv);
    });
  }

});
