import {GameMapGui} from '../../../classes/mapGui';
import {GameGui} from '../../../classes/gameGui';
import {Helpers} from '../../../classes/helpers';
import {Radio} from "../../../classes/radio";

let radio = null;
let game = null;
let map = null;
let handleMapObjects = null;
let radioStationInfo = new ReactiveVar('Radio');

Template.game.onCreated(function() {

  // console.log('Template.game.onCreated data', this.data);
  if(!this.data) return console.error("game.onCreated: this game does not exists");
  map = new GameMapGui(this.data._id);
  game = new GameGui({_id: this.data._id, map: map});

});

Template.game.onRendered(function() {

  // console.log('Template.game.onRendered data', this.data);
  $('.pup').popup({
    inline: true,
    hoverable: true,
    position: 'bottom left',
  });

  $('.dropdown').dropdown('restore default text');

  radio = new Radio();
  if(!radio.playing()) radio.play(2000);

  // Update radio station info reactively
  const updateRadioInfo = () => {
    const station = radio.stations[radio.currentStation];
    if(station) {
      radioStationInfo.set(`${station.name} - ${station.descr}`);
    }
  };
  updateRadioInfo();

  // Update popup content when radio station changes
  Tracker.autorun(() => {
    const stationInfo = radioStationInfo.get();
    Meteor.defer(() => {
      $('.js-radio-toggle-volume').popup('destroy').popup({
        inline: true,
        hoverable: true,
        position: 'bottom left',
        content: stationInfo
      });
    });
  });

  map.init('canvas', this.data._id);
  /*
    map.addCity({
      name: 'Paris',
      map: map,
      ctx: map.ctx,
      pos: {x: 250, y: 50},
      size: 40,
      color: '#4c5548'
    });
    map.addCity({
      name: 'Falaise',
      map: map,
      ctx: map.ctx,
      pos: {x: 100, y: 40},
      size: 10,
      color: '#4c5548'
    });
    map.addCity({
      name: 'Toulouse',
      map: map,
      ctx: map.ctx,
      pos: {x: 150, y: 500},
      size: 20,
      color: '#4c5548'
    });
    map.addCity({
      name: 'Nice',
      map: map,
      ctx: map.ctx,
      pos: {x: 500, y: 500},
      size: 17,
      color: '#4c5548'
    });
    map.addCity({
      name: 'Tarbes',
      map: map,
      ctx: map.ctx,
      pos: {x: 50, y: 550},
      size: 10,
      color: '#4c5548'
    });
  */

  if(handleMapObjects) handleMapObjects.stop();
  handleMapObjects = Helpers.observeChanges({game_id: this.data._id, map: map});

});

Template.game.onDestroyed(function() {
  radio.stop();
  game.stop();
  if(handleMapObjects) handleMapObjects.stop();
});

Template.game.helpers({

  stationCount: function() {
    return MapObjects.find({type: 'stations'}).count();
  },

  canvasWidth: function() {
    return window.innerWidth - 40;
  },

  canvasHeight: function() {
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
    return Helpers.trainSpeed;
  },

  gameTime() {
    let clock = Math.floor(Games.findOne(game._id).clock * Helpers.timeFactor / 1000);
    clock = Math.floor(clock / 3600);
    const hours = clock % 24;
    const days = Math.floor(clock / 24);

    // let hrs;
    // if(hours < 10) hrs = "0" + hours;
    // else hrs = "" + hours;

    let txt = `${hours} hours`;
    if(days) txt = `${days} days, ` + txt;
    return txt;
  },

  clock() {
    map.draw();
    let clock = Math.floor(Games.findOne(game._id).clock / 1000);
    const seconds = clock % 60;
    clock = Math.floor(clock / 60);
    const minutes = clock % 60;
    clock = Math.floor(clock / 60);
    const hours = clock % 24;
    const days = Math.floor(clock / 24);

    let sec, min, hrs;
    if(seconds < 10) sec = "0" + seconds;
    else sec = "" + seconds;
    if(minutes < 10) min = "0" + minutes;
    else min = "" + minutes;
    if(hours < 10) hrs = "0" + hours;
    else hrs = "" + hours;

    return `${days} days, ${hrs}:${min}:${sec}`;
  },

  radioStation: function() {
    return radioStationInfo.get();
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
    // Update radio station info reactively
    const station = radio.stations[radio.currentStation];
    if(station) {
      radioStationInfo.set(`${station.name} - ${station.descr}`);
    }
  },

  'click .js-radio-previous-station'() {
    radio.previous();
    // Update radio station info reactively after fade completes
    setTimeout(() => {
      const station = radio.stations[radio.currentStation];
      if(station) {
        radioStationInfo.set(`${station.name} - ${station.descr}`);
      }
    }, 600); // Wait for fade to complete
  },

});
