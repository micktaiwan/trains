/**
 * Created by mfaivremacon on 02/09/2015.
 */


Template.registerHelper('formatTime', function(date) {
  return moment(date).format('DD-MMM HH:mm');
});
