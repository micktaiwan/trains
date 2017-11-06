/**
 * Created by mfaivremacon on 01/09/2015.
 */

export class Game {

  constructor(map) {
    this.map = map;
    map.setGame(this);
    this._canStart = new ReactiveVar(false);
    this._canModifyMap = false;
    this._canModifyMapDep = new Tracker.Dependency();
    this.gameStatus = new ReactiveVar('');
    this.setStatus();
    // launch clock // TODO
    // const self = this;
    // this.clock = new Date().getTime();
    // this.clockHandle = Meteor.setInterval(function() {
    //   self.onTime();
    // }, 1000);

    this.sounds = {
      station: new Howl({src: ['/snd/station.wav'], volume: 0.2}),
      remove: new Howl({src: ['/snd/remove.wav'], volume: 0.5}),
      drag: new Howl({src: ['/snd/drag.wav'], volume: 0.1}),
      success: new Howl({src: ['/snd/success.wav'], volume: 0.2})
    };
  }

  sound(name, stereo) {
    if(typeof(stereo) === 'undefined') stereo = -1 + this.map.mousePos.x / this.map.canvas.width * 2;
    // console.log(this.map.mousePos.x, stereo);
    this.sounds[name].stereo(stereo).rate(1.0 + Math.random() / 3).play();
  }

  stop() {
    const self = this;
    _.each(this.sounds, function(s) {
      s.unload();
    });
  }

  onTime() {
    console.log('game on time');
    // this.map.addRandomStation();
    // this.map.addRandomPassenger();
  }

  canTrainStart() {
    this._canStart.set(Meteor.user() && this.map.stations.length > 0);
    return this._canStart.get();
  }

  canModifyMap() {
    const uid = Meteor.userId();
    let rv = false;
    if(uid && this.map && this.map._id) {
      const game = Games.findOne(this.map._id);
      rv = game && game.players && game.players.some(function(m) {
        return m._id === uid
      });
      if(typeof(rv) === "undefined") rv = false;
    }

    if(this._canModifyMap !== rv) {
      console.log('canModifyMap changed to', rv);
      this._canModifyMap = rv;
      this._canModifyMapDep.changed();
    }
    return rv;
  }

  setStatus() {
    let status = 'Ready<br/>';
    if(!Meteor.user()) status = 'You must be loggued to play<br/>';
    else {
      if(!this.canModifyMap()) status = 'You can not modify this map. Are you a team member ?';
      else if(this.map.stations.length === 0) status = 'You should place your first station<br/>';
      else if(this.map.stations.length < 3) status = 'You should build more rails<br/>';
    }
    this.gameStatus.set(status);
  }

}
