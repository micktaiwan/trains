/**
 * Created by mfaivremacon on 03/09/2015.
 */

Meteor.methods({

  gameCreate: function(name) {
    console.log('gameCreate');
    var obj = {
      name: name
    };
    return Games.insert(obj);
  }

});

