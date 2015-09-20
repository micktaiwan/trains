Template.teams.helpers({

  teams: function() {
    return Teams.find({game_id: this._id});
  },

  isPlayer: function() {
    return this.players.find(function(p) {
      return p._id == Meteor.userId()
    });
  }

});

Template.teams.events({

  'submit': function(e) {
    e.preventDefault();
    let name = $('#teamName').val();
    console.log('teamCreate: ', name);
    Meteor.call('teamCreate', this._id, name);
    $('#teamName').val('');
    $('.teams-modal').hide();

  },

  'click .join': function(e) {
    Meteor.call('teamJoin', this.game_id, e.target.getAttribute("data-teamId"));
    $('.teams-modal').hide();
  },

  'click .cancel': function() {
    $('.teams-modal').hide();
  }

});

Template.team.helpers({

  members: function() {
    return this.members;
  },

  isPlayer: function() {
    return this.game().players.find(function(p) {
      return p._id == Meteor.userId()
    });
  }

});

