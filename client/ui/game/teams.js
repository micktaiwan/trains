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

  'submit': async function(e) {
    e.preventDefault();
    let name = $('#teamName').val();
    console.log('teamCreate: ', name);
    try {
      await Meteor.callAsync('teamCreate', this._id, name);
      $('#teamName').val('');
      $('.teams-modal').hide();
    } catch(err) {
      console.error('Error creating team:', err);
    }
  },

  'click .join': async function(e) {
    try {
      await Meteor.callAsync('teamJoin', this.game_id, e.target.getAttribute("data-teamId"));
      $('.teams-modal').hide();
    } catch(err) {
      console.error('Error joining team:', err);
    }
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
