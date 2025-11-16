/**
 * Created by mfaivremacon on 03/09/2015.
 */

import {GameServer} from "../classes/gameServer";

Meteor.startup(async function() {

  // server observe for new games
  await Games.find().observeChangesAsync({
    added: function(id, doc) {
      // console.log('startup: server added', id, doc);
      new GameServer(_.extend({_id: id}, doc));
    }
  });

});
