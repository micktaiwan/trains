/**
 * Created by mfaivremacon on 05/09/2015.
 */

// user online status monitoring
// TODO: Re-enable when compatible user-status package is found for Meteor 3
// Options: ostrio:user-status or custom implementation
/*
Tracker.autorun(function() {
  try {
    if(Meteor.userId()) {
      UserStatus.startMonitor({
        threshold: 30000,
        interval: 1000,
        idleOnBlur: true
      });
    }
    else {
      UserStatus.stopMonitor();
    }
  }
  catch(err) {
    // console.log(err); // Seems that if(UserStatus.isMonitoring) does not work so catching every error
  }
});
*/

Meteor.startup(function() {
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_AND_EMAIL"
  });
});
