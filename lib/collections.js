/**
 * Created by mfaivremacon on 02/09/2015.
 */

Games = new Meteor.Collection('games');
Paths = new Meteor.Collection('paths');
Trains = new Meteor.Collection('trains');
// PathTypes = new Meteor.Collection('pathtypes');
Chats = new Meteor.Collection('chats');
Teams = new Meteor.Collection('teams');

Teams.helpers({

  game: function() {
    return Games.findOne(this.game_id);
  }

});
