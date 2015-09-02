var mapObject;

Template.map.onRendered(function() {

  mapObject = new MapGui('canvas');
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
