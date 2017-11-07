import {GameMapGui} from '../../../classes/mapGui';
import {GameGui} from '../../../classes/gameGui';
import {Helpers} from '../../../classes/helpers';
import {Radio} from "../../../classes/radio";

let radio = null;
let game = null;
let map = null;
let handleStations = null;
let handleTrains = null;

Template.game.onCreated(function() {

  // console.log('Template.game.onCreated data', this.data);
  map = new GameMapGui(this.data._id);
  game = new GameGui(map);

});

Template.game.onRendered(function() {

  // console.log('Template.game.onRendered data', this.data);
  $('.pup').popup({
    inline: true,
    hoverable: true,
    position: 'bottom left'
  });

  $('.dropdown').dropdown('restore default text');

  radio = new Radio();
  // if(!radio.playing()) radio.play(2000);

  map.init('canvas', this.data._id);

  // subscribe to map (or "game") stations
  if(handleStations) handleStations.stop();
  handleStations = Stations.find({game_id: this.data._id}).observeChanges({
    added: function(id, doc) {
      // console.log('Stations: added', id, doc);
      map.addStation(id, doc);
    },
    changed: function(id, doc) {
      // console.log('Stations: changed', id, doc);
      map.updateStation(id, doc);
    },
    removed: function(id) {
      // console.log('Stations: removed', id);
      map.removeStationById(id);
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
      let doc = Stations.findOne(id);
      // console.log('trains: removed', id);
      map.removeTrain(id);
    }
  });

});

Template.game.onDestroyed(function() {
  radio.stop();
  game.stop();
  if(handleStations) handleStations.stop();
  if(handleTrains) handleTrains.stop();
});

Template.game.helpers({

  railsCount: function() {
    return Stations.find().count();
  },

  canvasWidth: function() {
    return window.innerWidth - 40;
  },

  canvasHeigth: function() {
    return window.innerHeight - 110;
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

  'click .js-reset': function() {
    map.resetMap();
  },

  // 'click .start': function() {
  //   map.createTrain();
  // },

  'click .center': function() {
    map.resetPosition();
  },

  'click .open-join-modal': function() {
    $('.teams-modal').show();
  },

  'click .js-radio-toggle-volume'() {
    const s = radio.backgroundSound;
    if(!s) {
      radio.play();
      return;
    }
    // console.log(s.state());
    const el = $('.js-radio-toggle-volume');
    el.html('<i class="pause icon"></i>');
    if(s.state() === "unloaded") {
      s.load().once('load', function() {
        s.play();
        s.fade(0, 0.2, 1000);
        el.html('<i class="stop icon"></i>');
      });
    }
    else {
      s.fade(0.2, 0, 1000).once('fade', function() {
        s.unload();
        el.html('<i class="play icon"></i>');
      });
    }
  },

  'click .js-radio-next-station'() {
    radio.next();
  },

  'click .js-radio-previous-station'() {
    radio.previous();
  }

});
