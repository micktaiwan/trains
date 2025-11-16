/**
 * Login component with Semantic UI styling
 */

// State management for login modal
const isSignUpVar = new ReactiveVar(false);
const errorMessageVar = new ReactiveVar(null);

Template.trainsLoginButtons.events({
  'click .login-button': function(e) {
    e.preventDefault();
    errorMessageVar.set(null);
    $('.ui.modal.login-modal').modal('show');
  },

  'click .logout-button': async function(e) {
    e.preventDefault();
    try {
      await Meteor.logoutAsync();
    } catch(err) {
      console.error('Logout error:', err);
    }
  }
});

Template.loginModal.onCreated(function() {
  isSignUpVar.set(false);
  errorMessageVar.set(null);
});

Template.loginModal.onRendered(function() {
  // Initialize Semantic UI dropdown
  $('.ui.dropdown').dropdown();

  // Initialize modal
  $('.ui.modal.login-modal').modal({
    closable: true,
    onHidden: function() {
      errorMessageVar.set(null);
      isSignUpVar.set(false);
    },
    // Prevent the actions section from auto-closing the modal
    detachable: false,
    allowMultiple: true
  });
});

Template.loginModal.helpers({
  isSignUp: function() {
    return isSignUpVar.get();
  },

  errorMessage: function() {
    return errorMessageVar.get();
  }
});

Template.loginModal.events({
  'click .toggle-signup': function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggle signup clicked, current state:', isSignUpVar.get());
    isSignUpVar.set(!isSignUpVar.get());
    errorMessageVar.set(null);
    console.log('New state:', isSignUpVar.get());
  },

  'submit .login-form': async function(e) {
    e.preventDefault();

    const username = e.target.username.value.trim();
    const password = e.target.password.value;
    const isSignUp = isSignUpVar.get();

    errorMessageVar.set(null);

    try {
      if (isSignUp) {
        // Sign up
        const email = e.target.email.value.trim();

        await Accounts.createUserAsync({
          username: username,
          email: email,
          password: password
        });

        // User is automatically logged in after successful signup
        $('.ui.modal.login-modal').modal('hide');
        e.target.reset();
      } else {
        // Login
        await Meteor.loginWithPasswordAsync(username, password);

        $('.ui.modal.login-modal').modal('hide');
        e.target.reset();
      }
    } catch(err) {
      console.error('Auth error:', err);

      // Display user-friendly error messages
      let message = 'An error occurred. Please try again.';

      if (err.error === 403) {
        message = 'Incorrect username or password.';
      } else if (err.error === 'username-already-exists') {
        message = 'Username already exists.';
      } else if (err.error === 'email-already-exists') {
        message = 'Email already exists.';
      } else if (err.reason) {
        message = err.reason;
      }

      errorMessageVar.set(message);
    }
  }
});

// Initialize dropdown on current user dropdown
Template.trainsLoginButtons.onRendered(function() {
  this.autorun(() => {
    // Re-initialize dropdown when user logs in
    if (Meteor.userId()) {
      Meteor.defer(() => {
        $('.ui.dropdown').dropdown();
      });
    }
  });
});
