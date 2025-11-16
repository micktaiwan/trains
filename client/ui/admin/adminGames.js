/**
 * Admin games management
 */

const gamesVar = new ReactiveVar([]);
const loadingGamesVar = new ReactiveVar(false);
let currentGameId = null;
let currentGameData = null;

Template.adminGames.onCreated(function() {
  this.loadGames = () => {
    loadingGamesVar.set(true);
    Meteor.call('adminGetAllGames', (err, result) => {
      loadingGamesVar.set(false);
      if (err) {
        console.error('Error loading games:', err);
      } else {
        gamesVar.set(result);
      }
    });
  };

  // Load games on creation
  this.loadGames();
});

Template.adminGames.onRendered(function() {
  // Initialize modals
  $('.ui.modal.edit-game-modal').modal({
    onApprove: function() {
      return false; // Prevent auto-close
    }
  });

  $('.ui.modal.delete-game-modal').modal({
    onApprove: function() {
      return false; // Prevent auto-close
    }
  });
});

Template.adminGames.helpers({
  games: function() {
    return gamesVar.get();
  },

  loadingGames: function() {
    return loadingGamesVar.get();
  },

  formatClock: function(clock) {
    if (!clock) return '00:00:00';
    const seconds = Math.floor(clock / 1000);
    return Helpers.toHHMMSS(seconds);
  }
});

Template.adminGames.events({
  'click .refresh-games': function(e, template) {
    e.preventDefault();
    template.loadGames();
  },

  'click .edit-game': function(e) {
    e.preventDefault();
    const gameId = $(e.currentTarget).data('game-id');
    const game = gamesVar.get().find(g => g._id === gameId);

    if (game) {
      currentGameId = gameId;
      currentGameData = game;

      // Populate form
      $('.edit-game-modal input[name="gameName"]').val(game.name);
      $('.edit-game-modal input[name="gameClock"]').val(game.clock ? Math.floor(game.clock / 1000) : 0);

      $('.ui.modal.edit-game-modal').modal('show');
    }
  },

  'click .confirm-edit-game': function(e, template) {
    e.preventDefault();

    const gameName = $('.edit-game-modal input[name="gameName"]').val();
    const gameClock = parseInt($('.edit-game-modal input[name="gameClock"]').val()) * 1000;

    if (!gameName) {
      alert('Please enter a game name');
      return;
    }

    const updates = {
      name: gameName,
      clock: gameClock
    };

    Meteor.call('adminUpdateGame', currentGameId, updates, (err) => {
      if (err) {
        alert('Error: ' + err.message);
      } else {
        alert('Game updated successfully');
        $('.ui.modal.edit-game-modal').modal('hide');
        template.loadGames();
      }
    });
  },

  'click .delete-game': function(e) {
    e.preventDefault();
    currentGameId = $(e.currentTarget).data('game-id');
    $('.ui.modal.delete-game-modal').modal('show');
  },

  'click .confirm-delete-game': function(e, template) {
    e.preventDefault();

    Meteor.call('adminDeleteGame', currentGameId, (err) => {
      if (err) {
        alert('Error: ' + err.message);
      } else {
        alert('Game deleted successfully');
        $('.ui.modal.delete-game-modal').modal('hide');
        template.loadGames();
      }
    });
  }
});
