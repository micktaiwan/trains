/**
 * Created by mfaivremacon on 02/09/2015.
 */

Template.registerHelper('formatDate', function(date) {
  return moment(date).format('DD-MMM-YYYY HH:mm');
});
