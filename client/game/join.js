Template.join.helpers({

  teams: function() {
    console.log(Teams.find({game_id: this._id}).count());
    return Teams.find({game_id: this._id});
  }

});

Template.join.events({

  'submit': function(e) {
    e.preventDefault();
    let name = $('#teamName').val();
    console.log('teamCreate: ', name);
    Meteor.call('teamCreate', this._id, name);
    $('#teamName').val('');
    $('.join-modal').hide();

  },

  'click .join': function(e) {
    console.log(e.target.getAttribute("data-teamId"));
    //$('.join-modal').hide();
  },

  'click .cancel': function() {
    $('.join-modal').hide();
  }

});

