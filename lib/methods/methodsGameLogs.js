/**
 * Game Logs - Track player actions with timestamps
 */

Meteor.methods({

  // Add a new game log entry
  gameLogAdd: async function(game_id, action, details = {}) {
    check(game_id, String);
    check(action, String);
    check(details, Object);

    const userId = Meteor.userId();
    const user = userId ? await Meteor.userAsync() : null;

    // Create log entry
    const logEntry = {
      game_id: game_id,
      action: action,
      details: details,
      user: user ? {
        _id: user._id,
        name: user.username
      } : {
        _id: 'system',
        name: 'System'
      },
      timestamp: new Date()
    };

    // Insert the log
    const logId = await GameLogs.insertAsync(logEntry);

    // Cleanup: keep only the 10 most recent logs for this game
    await Meteor.callAsync('gameLogCleanup', game_id);

    return logId;
  },

  // Cleanup old logs - keep only the 10 most recent for a game
  gameLogCleanup: async function(game_id) {
    check(game_id, String);

    // Find all logs for this game, sorted by timestamp (newest first)
    const logs = await GameLogs.find(
      {game_id: game_id},
      {sort: {timestamp: -1}}
    ).fetchAsync();

    // If more than 10, remove the oldest ones
    if (logs.length > 10) {
      const logsToRemove = logs.slice(10); // Get logs from index 10 onwards
      const idsToRemove = logsToRemove.map(log => log._id);

      const removeCount = await GameLogs.removeAsync({
        _id: {$in: idsToRemove}
      });

      console.log(`gameLogCleanup: removed ${removeCount} old logs from game ${game_id}`);
    }
  }

});
