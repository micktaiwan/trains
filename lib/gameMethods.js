/**
 * Created by mfaivremacon on 03/09/2015.
 */

Meteor.methods({

  gameCreate: function() {
    console.log('gameCreate');
    var obj = {
      name: "Game"
    };
    return Games.insert(obj);
  }

});

