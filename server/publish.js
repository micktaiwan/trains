/**
 * Created by mfaivremacon on 02/09/2015.
 */

// publish it to every client without needing a subscription
Meteor.publish(null, function() {
  return Tiles.find({});
});
