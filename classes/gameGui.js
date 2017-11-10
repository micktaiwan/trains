import {Game} from "./game";

export class GameGui extends Game {

  constructor(doc) {
    super(doc);
    this.map.setGame(this);
    this.setStatus();
    this.sounds = {
      station: new Howl({src: ['/snd/station.wav'], volume: 0.5}),
      remove: new Howl({src: ['/snd/remove.wav'], volume: 0.5}),
      drag: new Howl({src: ['/snd/drag.wav'], volume: 0.3}),
      success: new Howl({src: ['/snd/success.wav'], volume: 0.5}),
      merge: new Howl({src: ['/snd/merge.wav'], volume: 1}),
      clip: new Howl({src: ['/snd/clip.wav'], volume: 1}),
    }
  }

  sound(name, options = {}) {
    // const option = options || {};
    if(options.onlyIfNotPlaying && this.sounds[name].playing()) return;
    if(typeof(options.stereo) === 'undefined') options.stereo = -1 + this.map.mousePos.x / this.map.canvas.width * 2;
    if(options.stopAllOthers) _.each(this.sounds, function(s) {s.stop();});
    // console.log(this.map.mousePos.x, options.stereo);
    this.sounds[name].stereo(options.stereo).rate(1.0 + Math.random() / 4).play();
  }

  stop() {
    _.each(this.sounds, function(s) {s.unload();});
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
      // FIXME P1
      // else if(this.map.stations.length === 0) status = 'You should place your first station<br/>';
      // else if(this.map.stations.length < 3) status = 'You should build more rails<br/>';
    }
    this.gameStatus.set(status);
  }

}
