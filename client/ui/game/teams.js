Template.teams.helpers({

  teams: function() {
    return Teams.find({game_id: this._id});
  },

  display: function() {
    const uid = Meteor.userId();
    // console.log(uid);
    return uid && (!this.players || !this.players.some(function(p) {
      return p._id === uid;
    }));
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

  display: function() {
    return Meteor.userId() && (!this.game().players || !this.game().players.some(function(p) {
      return p._id === Meteor.userId()
    }));
  }

});
