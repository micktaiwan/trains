/**
 * Created by mfaivremacon on 08/09/2015.
 */

Meteor.methods({

  chatPost: function(msg, type) {
    console.log('chatPost');
    var user = {};
    if(Meteor.userId()) {
      user._id = Meteor.userId();
      user.name = Meteor.user().username
    }
    else {
      user._id = 'anon';
      user.name = 'Anonymous'
    }
    var obj = {
      msg: msg,
      time: new Date(),
      user: user,
      type: type
    };
    return Chats.insert(obj);
  }

});
