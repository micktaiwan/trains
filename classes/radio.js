export class Radio {

  constructor() {

    this.stations = [
      {name: 'Fluid', descr: "[SomaFM] Drown in the electronic sound of instrumental hiphop, future soul and liquid trap.", src: ['http://ice1.somafm.com/fluid-128-mp3'], format: ['mp3']},
      {name: 'Police', descr: "[SomaFM] Ambient music mixed with the sounds of San Francisco public safety radio traffic.", src: ['http://ice1.somafm.com/sf1033-128-mp3'], format: ['mp3']},
      {name: 'Suburbs of Goa', descr: "[SomaFM] Desi-influenced Asian world beats and beyond", src: ['http://ice1.somafm.com/suburbsofgoa-128-mp3'], format: ['mp3']},
      {name: 'Groove Salad', descr: "[SomaFM] A nicely chilled plate of ambient/downtempo beats and grooves.", src: ['http://ice1.somafm.com/groovesalad-128-mp3'], format: ['mp3']},
      {name: 'Rails', descr: "New York State Trains station radio", src: ['http://relay.broadcastify.com:80/887156917.mp3?xan=2932322D752F210678D79E7588319CA3'], format: ['mp3']},
      {name: 'Drone Zone', descr: "[SomaFM] Served best chilled, safe with most medications. Atmospheric textures with minimal beats.", src: ['http://ice1.somafm.com/dronezone-128-mp3'], format: ['mp3']},
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