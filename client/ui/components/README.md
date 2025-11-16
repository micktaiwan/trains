# Login Component

## Overview

Custom Semantic UI styled login component for Meteor 3, using the official `accounts-ui-unstyled` package.

## Files

- `login.html` - Blaze templates for login button and modal
- `login.js` - Client-side logic for authentication
- `login.less` - Semantic UI compatible styles (LESS preprocessor)

## Features

- ✅ Login with username/password
- ✅ Sign up with username, email, and password
- ✅ Logout functionality
- ✅ User-friendly error messages
- ✅ Semantic UI modal styling
- ✅ Meteor 3 async/await compatible

## Usage

Simply include the `{{> trainsLoginButtons}}` template in your page:

```handlebars
<div class="ui menu">
  <div class="right menu">
    {{> trainsLoginButtons}}
  </div>
</div>
```

**Note**: The template is named `trainsLoginButtons` (not `loginButtons`) to avoid conflicts with the `accounts-ui-unstyled` package which also defines a `loginButtons` template.

The `{{> loginModal}}` template should be included once on the page (typically at the root level).

## Implementation Details

- Uses `Meteor.loginWithPasswordAsync()` for login (Meteor 3)
- Uses `Accounts.createUserAsync()` for signup (Meteor 3)
- Uses `Meteor.logoutAsync()` for logout (Meteor 3)
- Reactive variables for modal state management
- Semantic UI dropdown and modal components

## Configuration

Configuration is in `/client/lib/config.js`:

```javascript
Meteor.startup(function() {
  Accounts.config({
    forbidClientAccountCreation: false
  });
});
```
