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
      data: function() {
        return Games.findOne({_id: this.params._id});
      }
    });
  },
  {
    name: 'game',
    onBeforeAction: function() {
      Session.set('game_id', this.params._id);
      this.next();
    },
    waitOn: function() {
      return [
        Meteor.subscribe('map_objects', this.params._id),
        Meteor.subscribe('teams', this.params._id)
      ]
    }
  });

Router.route('/admin', {
  name: 'adminRedirect',
  action: function() {
    // Redirect to dashboard by default
    Router.go('/admin/dashboard');
  }
});

Router.route('/admin/:tab', function() {
    // Check if user is admin
    const user = Meteor.user();
    if (!user || !user.roles || !user.roles.includes('admin')) {
      this.render('AdminAccessDenied');
    } else {
      this.render('Admin', {
        data: function() {
          return {
            activeTab: this.params.tab
          };
        }
      });
    }
  },
  {
    name: 'admin',
    waitOn: function() {
      return [
        Meteor.subscribe('admin_all_users'),
        Meteor.subscribe('admin_all_games'),
        Meteor.subscribe('admin_all_chats', 100),
        Meteor.subscribe('admin_logs', 50),
        Meteor.subscribe('admin_all_teams')
      ]
    }
  });
