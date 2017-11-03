/**
 * Created by mfaivremacon on 02/09/2015.
 */

Games = new Meteor.Collection('games');
Segments = new Meteor.Collection('segments');
Trains = new Meteor.Collection('trains');
// SegmentTypes = new Meteor.Collection('segmenttypes');
Chats = new Meteor.Collection('chats');
Teams = new Meteor.Collection('teams');

Teams.helpers({

  game: function() {
    return Games.findOne(this.game_id);
  }

});
