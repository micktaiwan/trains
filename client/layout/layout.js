Template.lobby.onRendered(function() {


});

Template.lobby.helpers({

  games: function() {
    return Games.find();
  }

});

Template.lobby.events({

  'click .newGame': function() {
    Meteor.call('gameCreate', function(err, rv) {
      console.log(err, rv);
      Router.go('/game/' + rv);
    });
  }

});
