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
  }

});

Template.lobby.events({

  'click .newGame': function() {
    var name = $('#gameName').val();
    Meteor.call('gameCreate', name, function(err, rv) {
      console.log(err, rv);
      Router.go('/game/' + rv);
    });
  }

});
