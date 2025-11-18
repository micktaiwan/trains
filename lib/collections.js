/**
 * Created by mfaivremacon on 02/09/2015.
 */

Games = new Meteor.Collection('games');
MapObjects = new Meteor.Collection('map_objects');
Chats = new Meteor.Collection('chats');
Teams = new Meteor.Collection('teams');
AdminLogs = new Meteor.Collection('admin_logs');
GameLogs = new Meteor.Collection('game_logs');

Teams.helpers({

  game: function() {
    return Games.findOne(this.game_id);
  }

});
