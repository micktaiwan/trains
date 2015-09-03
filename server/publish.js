/**
 * Created by mfaivremacon on 02/09/2015.
 */

Meteor.publish('tiles', function(game_id) {
  console.log('publishing tiles for', game_id);
  return Tiles.find({game_id: game_id});
});

// publications to every client without needing a subscription
Meteor.publish(null, function() {
  return Trains.find({});
});

Meteor.publish(null, function() {
  return Games.find({});
});
