export class Radio {

  constructor() {

    this.stations = [
      {name: 'Fluid', descr: "[SomaFM] Fluid radio", src: ['http://ice1.somafm.com/fluid-128-mp3'], format: ['mp3']},
      {name: 'Police', descr: "[SomaFM] San Francisco police radio with ambient background music", src: ['http://ice1.somafm.com/sf1033-128-mp3'], format: ['mp3']},
      {name: 'Groove Salad', descr: "[SomaFM] Groove Salad radio", src: ['http://ice1.somafm.com/groovesalad-128-mp3'], format: ['mp3']},
      {name: 'Rails', descr: "New York State Trains station radio", src: ['http://relay.broadcastify.com:80/887156917.mp3?xan=2932322D752F210678D79E7588319CA3'], format: ['mp3']},
      {name: 'Drone Zone', descr: "[SomaFM] Drone Zone online radio", src: ['http://ice1.somafm.com/dronezone-128-mp3'], format: ['mp3']},
      {name: 'Airport Tower', descr: "Chinese Live ATC", src: ['http://d.liveatc.net/lfpo3_twr'], format: ['mp3']},
    ];
    this.backgroundSound = null;
    this.currentStation = 0;
  }

  play() {
    const s = this.stations[this.currentStation];
    console.log('Playing', s);
    if(this.backgroundSound) this.backgroundSound.unload();
    this.backgroundSound = new Howl({
      src: s.src,
      html5: true, // needed when streaming
      autoplay: true,
      format: s.format,
      volume: 0
    });
    this.backgroundSound.fade(0, 0.2, 2000);
  }

  next() {
    const self = this;
    this.backgroundSound.fade(0.2, 0, 500).once('fade', function() {
      self.currentStation++;
      if(self.currentStation >= self.stations.length) self.currentStation = 0;
      self.play();
    });
  }

  previous() {
    const self = this;
    this.backgroundSound.fade(0.2, 0, 500).once('fade', function() {
      self.currentStation--;
      if(self.currentStation < 0) self.currentStation = self.stations.length - 1;
      self.play();
    });
  }

  stop() {
    const self = this;
    this.backgroundSound.fade(0.2, 0, 3000).once('fade', function() {
      self.backgroundSound.unload();
      self.backgroundSound = null;
    });
  }

}
