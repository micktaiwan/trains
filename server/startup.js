/**
 * Created by mfaivremacon on 03/09/2015.
 */

import {GameServer} from "../classes/gameServer";

Meteor.startup(function() {

  // server observe for new games
  Games.find().observeChanges({
    added: function(id, doc) {
      // console.log('startup: server added', id, doc);
      new GameServer(_.extend({_id: id}, doc));
    }
  });

});
