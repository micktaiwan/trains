/**
 * Created by mfaivremacon on 31/08/2015.
 */
"use strict";

class Tile {

  constructor(map, pos) {
    this.map = map;
    this.ctx = map.ctx;
    this.pos = pos;
    //this.img = new Image();
    //this.img.src = "http://static.dotjobs.io.s3.amazonaws.com/www/img/perks/cross.svg";
  }

  draw() {
    // background
    let w = this.map.displayOptions.caseWidth;
    //this.ctx.drawImage(this.img, this.pos.x * w, this.pos.y * w, w, w);
    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(this.pos.x * w, this.pos.y * w, w, w);

    // borders
  }

}

class Map {
  constructor(canvas_id, displayOptions) {
    displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
    this.displayOptions = {
      caseWidth: displayOptions.caseWidth || 50
    };
    this.canvas = $(canvas_id).get(0);
    this.ctx = this.canvas.getContext("2d");
    this.tiles = [];
    //this.tiles.push(new Tile(this.ctx));
    this.mouseIsDown = false;
    // listen to mouse
    this.canvas.addEventListener("mousedown", $.proxy(this.onMouseDown, this), false);
    //this.canvas.addEventListener("dblclick", $.proxy(this.onMouseDblClick, this), false);
    this.canvas.addEventListener("mouseup", $.proxy(this.onMouseUp, this), false);
    this.canvas.addEventListener("mousemove", $.proxy(this.onMouseMove, this), false);
    //this.canvas.addEventListener("mouseout", $.proxy(this.onMouseOut, this), false);
    this.canvas.addEventListener("mousewheel", $.proxy(this.onMouseWheel, this), false);
  }

  resetMap() {
    this.tiles.length = 0;
    this.displayOptions.caseWidth = 50;
    this.train = null;
    this.draw();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for(let i = 0; i < this.tiles.length; i++) {
      this.tiles[i].draw();
    }
    if(this.train) this.train.draw();
  }

  onMouseWheel(event) {
    event.preventDefault();
    this.displayOptions.caseWidth = (event.wheelDelta / 30 + this.displayOptions.caseWidth);
    this.draw();
  }

  onMouseMove(event) {
    this.draw();
    let coords = this.relMouseCoords(event);
    let c = this.getMouseCaseCoords(coords);

    this.ctx.fillStyle = 'white';
    this.ctx.fillText(c.x + ' ' + c.y, 20, 20);

    if(this.mouseIsDown) this.setCase(event);
    this.drawMouseCase(c);
  }

  onMouseDown(event) {
    this.setCase(event);
    this.draw();
    this.mouseIsDown = true;
    document.body.style.cursor = 'none';
  }

  onMouseUp(event) {
    this.mouseIsDown = false;
    document.body.style.cursor = 'default';
  }

  setCase(event) {
    this.tiles.push(new Tile(this, this.getMouseCaseCoords(this.relMouseCoords(event))));
  }

  getCase(coords) {
    for(let i = 0; i < this.tiles.length; i++) {
      if(this.tiles[i].pos.x === coords.x && this.tiles[i].pos.y === coords.y) return this.tiles[i];
    }
    return null;
  }

  drawMouseCase(c) {
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = '#500';
    this.ctx.beginPath();
    this.ctx.rect(c.x * this.displayOptions.caseWidth, c.y * this.displayOptions.caseWidth, this.displayOptions.caseWidth, this.displayOptions.caseWidth);
    this.ctx.stroke();
  }

  getMouseCaseCoords(coords) {
    return {
      x: Math.floor(coords.x / this.displayOptions.caseWidth),
      y: Math.floor(coords.y / this.displayOptions.caseWidth)
    };
  }

  relMouseCoords(e) {
    let cx, cy;
    if(e.pageX || e.pageY) {
      cx = e.pageX;
      cy = e.pageY;
    }
    else {
      cx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      cy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    cx -= e.target.offsetLeft;
    cy -= e.target.offsetTop;

    return {x: cx, y: cy}
  }

  putTrain() {
    if(!this.train)
      this.train = new Train(this);
    this.draw();
  }
}

window.Map = Map;
