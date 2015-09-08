/**
 * Created by mfaivremacon on 02/09/2015.
 */

Meteor.publish('tiles', function(game_id) {
  //console.log('publishing tiles for', game_id);
  return Tiles.find({game_id: game_id});
});

Meteor.publish('trains', function(game_id) {
  //console.log('publishing trains for', game_id);
  return Trains.find({game_id: game_id});
});

// publications to every client without needing a subscription
Meteor.publish(null, function() {
  return [
    Games.find({}),
    Meteor.users.find({}),
    TileTypes.find({}),
    Chats.find({type: 'lobby'},{limit:10, sort: {time: -1}})
  ]
});
