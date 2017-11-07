/**
 * Created by mfaivremacon on 03/09/2015.
 */

import {GameServer} from "../classes/server";

Meteor.startup(function() {

  // server observe for new games
  Games.find().observeChanges({
    added: function(id, doc) {
      console.log('server added', id, doc);
      new GameServer(id, doc);
    }
  });

});
