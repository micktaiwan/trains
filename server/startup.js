/**
 * Created by mfaivremacon on 03/09/2015.
 */

import {GameServer} from "../classes/gameServer";
import {runCleanupMigration} from "./cleanupDatabase";

// Accounts configuration moved to /lib/accountsConfig.js (shared between client and server)

// Store active game server instances for lifecycle management
const activeGameServers = new Map();

Meteor.startup(async function() {

  // Run database cleanup migration (controlled by RUN_DB_CLEANUP env var)
  await runCleanupMigration();

  // server observe for new games
  await Games.find().observeChangesAsync({
    added: async function(id, doc) {
      console.log('startup: server added game', id, doc.name);
      const gameServer = await GameServer.create(_.extend({_id: id}, doc));
      activeGameServers.set(id, gameServer);
    },
    removed: function(id) {
      console.log('startup: server removed game', id);
      const gameServer = activeGameServers.get(id);
      if (gameServer) {
        gameServer.stop();
        activeGameServers.delete(id);
      }
    }
  });

});
