/**
 * Created by mfaivremacon on 02/09/2015.
 */

Meteor.publish('segments', function(game_id) {
  return Segments.find({game_id: game_id});
});

Meteor.publish('trains', function(game_id) {
  return Trains.find({game_id: game_id});
});

Meteor.publish('teams', function(game_id) {
  return Teams.find({game_id: game_id});
});


// publications to every client without needing a subscription
Meteor.publish(null, function() {
  return [
    Games.find({}),
    Meteor.users.find({}),
    // SegmentTypes.find({}),
    Chats.find({type: 'lobby'}, {limit: 10, sort: {time: -1}})
  ]
});
