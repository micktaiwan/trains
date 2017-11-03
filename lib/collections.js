/**
 * Created by mfaivremacon on 02/09/2015.
 */

Games = new Meteor.Collection('games');
Points = new Meteor.Collection('points');
Trains = new Meteor.Collection('trains');
PointTypes = new Meteor.Collection('tiletypes');
Chats = new Meteor.Collection('chats');
Teams = new Meteor.Collection('teams');

Teams.helpers({

  game: function() {
    return Games.findOne(this.game_id);
  }

});
