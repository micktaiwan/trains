var mapObject;

Template.map.onRendered(function() {

  mapObject = new Map('canvas');
  mapObject.draw();

});

Template.map.helpers({});

Template.map.events({

  'click .reset': function() {
    mapObject.resetMap();
  },

  'click .start': function() {
    mapObject.putTrain();
  }

});
