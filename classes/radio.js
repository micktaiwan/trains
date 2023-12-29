export class Radio {

  constructor() {

    this.stations = [
      {name: 'Groove Salad', descr: "[SomaFM] A nicely chilled plate of ambient/downtempo beats and grooves", src: ['http://ice1.somafm.com/groovesalad-128-mp3'], format: ['mp3']},
      {name: 'Police', descr: "[SomaFM] Ambient music mixed with the sounds of San Francisco public safety radio traffic", src: ['http://ice1.somafm.com/sf1033-128-mp3'], format: ['mp3']},
        // {name: 'Mario Radio', descr: "All Mario, all the time", src: ['http://radio.themushroomkingdom.net:8000/wtmk.ogg'], format: ['ogg']},
      {name: 'Slay Radio', descr: "Gaming music", src: ['http://relay3.slayradio.org:8100/'], format: ['mp3']},
      {name: 'RPGN Game Music Radio', descr: "Gaming music", src: ['http://stream.rpgamers.net:8000/rpgn'], format: ['mp3']},
      {name: 'RPGamers', descr: "RPGamers Network Game Music Radio", src: ['http://www.rpgamers.net/radio/data/data_3/3965.dat'], format: ['mp3']},
      {name: 'Fluid', descr: "[SomaFM] Drown in the electronic sound of instrumental hiphop, future soul and liquid trap", src: ['http://ice1.somafm.com/fluid-128-mp3'], format: ['mp3']},
      {name: 'Suburbs of Goa', descr: "[SomaFM] Desi-influenced Asian world beats and beyond", src: ['http://ice1.somafm.com/suburbsofgoa-128-mp3'], format: ['mp3']},
      {name: 'Drone Zone', descr: "[SomaFM] Served best chilled, safe with most medications. Atmospheric textures with minimal beats", src: ['http://ice1.somafm.com/dronezone-128-mp3'], format: ['mp3']},
    ];
    this.backgroundSound = null;
    this.currentStation = 0;
  }

  playing() {
    return this.backgroundSound && this.backgroundSound.playing();
  }

  play(fadeDuration) {
    if(!fadeDuration) fadeDuration = 2000;
    const s = this.stations[this.currentStation];
    console.log('Playing', s);
    if(this.backgroundSound) this.backgroundSound.unload();
    try {
      this.backgroundSound = new Howl({
        src: s.src,
        html5: true, // needed when streaming
        autoplay: true,
        format: s.format,
        volume: 0
      });
      this.backgroundSound.fade(0, 0.5, fadeDuration);
    }
    catch(e) {
      console.log(e);
      this.next();
    }
  }

  next() {
    console.log('next', this.backgroundSound);
    const self = this;
    self.currentStation++;
    if(self.currentStation >= self.stations.length) self.currentStation = 0;
    // if(!this.backgroundSound) self.play();
    // else this.backgroundSound.fade(0.5, 0, 500).once('fade', function() {
    //   self.play();
    // });
    self.play();
  }

  previous() {
    const self = this;
    if(!this.backgroundSound) self.play();
    else this.backgroundSound.fade(0.5, 0, 500).once('fade', function() {
      self.currentStation--;
      if(self.currentStation < 0) self.currentStation = self.stations.length - 1;
      self.play();
    });
  }

  stop() {
    const self = this;
    if(this.backgroundSound) this.backgroundSound.fade(0.2, 0, 3000).once('fade', function() {
      self.backgroundSound.unload();
      self.backgroundSound = null;
    });
  }

}
