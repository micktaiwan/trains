/**
 * Created by mfaivremacon on 03/09/2015.
 */

Router.configure({
  // we use the  appBody template to define the layout for the entire app
  layoutTemplate: 'layout',

  // the appNotFound template is used for unknown routes
  //notFoundTemplate: 'appNotFound',

  // show the appLoading template whilst the subscriptions below load their data
  //loadingTemplate: 'appLoading',

  title: 'Trains',

  // wait on the following subscriptions before rendering the page to ensure
  // the data it's expecting is present
  /*
   waitOn: function() {
   return [
   Meteor.subscribe('projects-mine'), // for the Projects contexual menu
   Meteor.subscribe('users', Meteor.userId()),
   Meteor.subscribe('avatars')
   ];
   }
   */

});


Router.route('/', function() {
  this.render('Lobby', {
    //data: function () { return Items.findOne({_id: this.params._id}); }
  });
});

Router.route('/game/:_id', function() {
  this.render('Game', {
    onBeforeAction: function() {
      console.log('route:', this.params._id);
      Meteor.subscribe('tiles', this.params._id);
      Session.set('game_id', this.params._id);
      this.next();
    },
    data: function () { return Games.findOne({_id: this.params._id}); }
  });
});
