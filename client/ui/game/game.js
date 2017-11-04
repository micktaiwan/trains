import {MapGui} from '../../../classes/mapGui';
import {Game} from '../../../classes/game';
import {Helpers} from '../../../classes/helpers';

let game = null;
let map = null;
let handleSegments = null;
let handleTrains = null;

Template.game.onCreated(function() {

  // console.log('Template.game.onCreated data', this.data);
  map = new MapGui(this.data._id);
  game = new Game(map);

});

Template.game.onRendered(function() {

  // console.log('Template.game.onRendered data', this.data);
  $('.pup').popup({
    inline: true,
    hoverable: true,
    position: 'bottom left'
  });

  $('.dropdown').dropdown('restore default text');

  map.init('canvas', this.data._id);
  // subscribe to map (or "game") segments
  if(handleSegments) handleSegments.stop();
  handleSegments = Segments.find({game_id: this.data._id}).observeChanges({
    added: function(id, doc) {
      console.log('segments: added', id, doc);
      map.setSegmentWithId(id, doc);
    },
    changed: function(id, doc) {
      console.log('segments: changed', id, doc);
      map.updateSegmentWithId(id, doc);
    },
    removed: function(id) {
      console.log('segments: removed', id);
      map.removeSegment(id);
    }

  });

  if(handleTrains) handleTrains.stop();
  handleTrains = Trains.find({game_id: this.data._id}).observeChanges({
    added: function(id, doc) {
      // console.log('trains: added', id);
      map.addTrain(id, doc);
    },
    changed: function(id, doc) {
      // console.log('trains: changed', id, doc);
      map.updateTrain(id, doc);
    },
    removed: function(id) {
      let doc = Segments.findOne(id);
      // console.log('trains: removed', id);
      map.removeTrain(id);
    }
  });

});

Template.game.onDestroyed(function() {
  if(handleSegments) handleSegments.stop();
  if(handleTrains) handleTrains.stop();
});

Template.game.helpers({

  railsCount: function() {
    return Segments.find().count();
  },

  canvasWidth: function() {
    return window.innerWidth - 60;
  },

  canvasHeigth: function() {
    return window.innerHeight - 300;
  },

  displayGameButtons: function() {
    game._canModifyMapDep.depend();
    return game.canModifyMap();
  },

  gameStatus: function() {
    return game.gameStatus.get();
  },

  mapMessage: function() {
    return map.message.get();
  },

  trainSpeed() {
    // FIXME P0: the train speed is server side !
    const caseLengthInMeters = Helpers.caseRealMeters;
    const timeInSeconds = Helpers.moveInterval / 1000;
    return Math.round((caseLengthInMeters / 1000) / (timeInSeconds / 3600));
  }

});

Template.game.events({

  'click .reset': function() {
    map.resetMap();
  },

  'click .start': function() {
    map.createTrain();
  },

  'click .center': function() {
    map.resetPosition();
  },

  'click .open-join-modal': function() {
    $('.teams-modal').show();
  },

  'click .js-add-speed'() {
    // FIXME P0: the train speed is server side !
    console.log('test');
    Helpers.moveInterval = 400;
  },

  'click .js-remove-speed'() {
    Helpers.moveInterval = 1000;
  }


});

Template.toolsDropdown.onRendered(function() {

  //console.log('dropdown ok');
  $('.dropdown').dropdown('restore default text');

});

Template.toolsDropdown.helpers({

  segmentTypes: function() {
    return []; // FIXME P2: SegmentTypes.find();
  }

});

Template.toolsDropdown.events({

  'click .selectSegment': function() {
    console.log(this);
    map.setSegmentSelection(this.name);
  },

  'click .selectSkinCubes': function() {
    map.selectSkin('cube');
  },

  'click .selectSkinDefault': function() {
    map.selectSkin('default');
  },

  'click .selectSkinMine': function() {
    map.selectSkin('mine');
  }

});
