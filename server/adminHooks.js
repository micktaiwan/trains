/**
 * Admin hooks - Auto-assign admin role to first user
 */

// Hook when a new user is created
Accounts.onCreateUser(async (options, user) => {
  // Check if this is the first user
  const userCount = await Meteor.users.countDocuments();

  // If this is the first user, make them admin
  if (userCount === 0) {
    user.roles = ['admin'];
    console.log('First user created - automatically assigned admin role:', user.username);

    // Log this action
    await AdminLogs.insertAsync({
      action: 'auto_admin_assignment',
      userId: user._id,
      username: user.username || options.username,
      timestamp: new Date(),
      details: 'First user automatically assigned admin role'
    });
  } else {
    user.roles = ['user'];
  }

  // Keep the profile if provided
  if (options.profile) {
    user.profile = options.profile;
  }

  return user;
});
