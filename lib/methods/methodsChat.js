/**
 * Created by mfaivremacon on 08/09/2015.
 */

Meteor.methods({

  chatPost: async function(msg, type) {
    console.log('chatPost');
    const user = {};
    if(Meteor.userId()) {
      user._id = Meteor.userId();
      const currentUser = await Meteor.userAsync();
      user.name = currentUser.username
    }
    else {
      user._id = 'anon';
      user.name = 'Anonymous'
    }
    const obj = {
      msg: msg,
      time: new Date(),
      user: user,
      type: type
    };
    return await Chats.insertAsync(obj);
  }

});
