/**
 * Created by mfaivremacon on 31/08/2015.
 */
"use strict";

Meteor.startup(function() {

    var defaultTileSize = 50;

    class TileGui extends Tile {

      constructor(map, pos, id) {
        super(map, pos, id);
        this.ctx = map.ctx;
      }

      draw() {
        // background
        let w = this.map.displayOptions.tileWidth;
        //this.ctx.drawImage(this.img, this.pos.x * w, this.pos.y * w, w, w);
        this.ctx.fillStyle = "#333";
        this.ctx.fillRect(this.pos.x * w, this.pos.y * w, w, w);

        // borders
      }

    }

    class MapGui extends Map {
      constructor(canvas_id, id, displayOptions) {
        super(id);
        displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
        this.displayOptions = {
          tileWidth: displayOptions.tileWidth || defaultTileSize
        };
        this.canvas = $(canvas_id).get(0);
        this.ctx = this.canvas.getContext("2d");

        this.mouseIsDown = false;
        this.mouseOldPos = {x: -1, y: -1};
        this.mousePos = {x: -1, y: -1};
        this.pan = {x: 0, y: 0};

        // listen to mouse
        this.canvas.addEventListener("mousedown", $.proxy(this.onMouseDown, this), false);
        this.canvas.addEventListener("mouseup", $.proxy(this.onMouseUp, this), false);
        this.canvas.addEventListener("mousemove", $.proxy(this.onMouseMove, this), false);
        this.canvas.addEventListener("mousewheel", $.proxy(this.onMouseWheel, this), false);
        this.canvas.addEventListener("contextmenu", $.proxy(this.onContextMenu, this), false);

        //this.canvas.addEventListener("dblclick", $.proxy(this.onMouseDblClick, this), false);
        //this.canvas.addEventListener("mouseout", $.proxy(this.onMouseOut, this), false);
      }

      onContextMenu(e) {
        e.preventDefault();
        return false;
      }

      putTrain() {
        if(this.trains.length == 0) { // for now only one train
          this.addTrainToDB({pos: {x:1, y: 1}, dir: {x:1, y: 0}});
        }
        this.draw();
      }

      // coming from db
      setTileWithId(id, pos) {
        let c = this.getTile(pos);
        console.log('setTileWithId', id, pos, 'found', c);
        if(c) // if the client already have it
          c.id = id; // make sure the object have a DB id so we can remove it later
        else {
          this.tiles.push(new TileGui(this, pos, id));
          this.draw();
        }
      }

      // coming from db
      addTrain(id, pos) {
        let c = this.getTrain(pos);
        console.log('addTrain', id, pos, 'found', c);
        if(c) // if the client already have it
          c.id = id; // make sure the object have a DB id so we can remove it later
        else {
          this.trains.push(new TrainGui(this, pos, id));
          this.draw();
        }
      }

      resetMap() {
        super.resetMap();
        this.resetPosition();
      }

      resetPosition() {
        this.displayOptions.tileWidth = 50;
        this.pan = {x: 0, y: 0};
        this.draw();
      }

      draw() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.translate(this.pan.x, this.pan.y);
        for(let i = 0; i < this.tiles.length; i++) {
          this.tiles[i].draw();
        }
        for(let i = 0; i < this.trains.length; i++) {
          this.trains[i].draw();
        }
        this.ctx.translate(-this.pan.x, -this.pan.y);

        this.drawMapBorder();
      }

      drawMouse(event) {
        let c = this.getMouseTileCoords(this.mouseCoords(event), true);
        //this.ctx.fillStyle = 'white';
        //this.ctx.fillText(c.x + ' ' + c.y, 20, 20);
        this.drawMouseTile(c);
      }

      // we have been notified that another client removed this tile
      removeTile(id) {
        console.log('removing tile', id, '...');
        super.removeTile(id);
        this.draw();
      }

      onMouseWheel(e) {
        e.preventDefault();
        let oldPos = this.relMouseCoords(e);

        let factor = Math.round((this.displayOptions.tileWidth / (e.wheelDelta / 60)));
        this.displayOptions.tileWidth += factor;
        if(this.displayOptions.tileWidth < 1)
          this.displayOptions.tileWidth = 1;
        if(this.displayOptions.tileWidth > 200)
          this.displayOptions.tileWidth = 200;

        // zoom depends on mouse position
        let newPos = this.relMouseCoords(e);
        this.pan.x += (newPos.x - oldPos.x) / (defaultTileSize / this.displayOptions.tileWidth);
        this.pan.y += (newPos.y - oldPos.y) / (defaultTileSize / this.displayOptions.tileWidth);

        this.draw();
        this.drawMouse(e);
      }

      onMouseMove(e) {
        this.mouseOldPos = this.mousePos;
        this.mousePos = this.mouseCoords(e);
        this.mouseMovement = {x: this.mousePos.x - this.mouseOldPos.x, y: this.mousePos.y - this.mouseOldPos.y};
        this.draw();

        if(!e.ctrlKey) this.drawMouse(e);
        if(this.mouseIsDown) {
          if(e.ctrlKey) { // pan map
            this.pan.x += this.mouseMovement.x;
            this.pan.y += this.mouseMovement.y;
          }
          else { // edit map
            if(this.button === 1)
              this.setTileFromEvent(e);
            else if(this.button === 2) { // middle button = pan
              this.pan.x += this.mouseMovement.x;
              this.pan.y += this.mouseMovement.y;
            }
            else if(this.button === 3)
              this.removeTileFromEvent(e);
          }
        }
      }

      onMouseDown(e) {
        e.preventDefault();
        if(!e.ctrlKey) {
          switch(e.which) {
            case 1: // left button
              this.setTileFromEvent(e);
              break;
            case 3: // right button
              this.removeTileFromEvent(e);
              break;
          }
        }
        this.button = e.which;
        this.draw();
        this.mouseIsDown = true;
        document.body.style.cursor = 'none';
      }

      onMouseUp(event) {
        this.mouseIsDown = false;
        document.body.style.cursor = 'default';
      }

      setTileFromEvent(event) {
        this.saveTileToDB(this.getMouseTileCoords(this.mouseCoords(event)));
      }

      removeTileFromEvent(event) {
        let tile = this.getTile(this.getMouseTileCoords(this.mouseCoords(event)));
        if(tile)
          this.removeTileFromDb(tile.id);
      }

      drawMapBorder() {
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = '#999';
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.stroke();
      }

      drawMouseTile(c) {
        let margin = 0;
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#500';
        this.ctx.beginPath();
        this.ctx.rect(c.x * this.displayOptions.tileWidth + margin + (this.pan.x % this.displayOptions.tileWidth), c.y * this.displayOptions.tileWidth + margin + (this.pan.y % this.displayOptions.tileWidth), this.displayOptions.tileWidth - margin * 2, this.displayOptions.tileWidth - margin * 2);
        this.ctx.stroke();
      }

      getMouseTileCoords(coords, ignorePan) {
        if(ignorePan) {
          return {
            x: Math.floor((coords.x - (this.pan.x % this.displayOptions.tileWidth)) / this.displayOptions.tileWidth),
            y: Math.floor((coords.y - (this.pan.y % this.displayOptions.tileWidth)) / this.displayOptions.tileWidth)
          };

        }
        return {
          x: Math.floor((coords.x - this.pan.x) / this.displayOptions.tileWidth),
          y: Math.floor((coords.y - this.pan.y) / this.displayOptions.tileWidth)
        };
      }

      // mouse coords relative to a tile size and panning
      relMouseCoords(e) {
        let c = this.mouseCoords(e);
        let factor = defaultTileSize / this.displayOptions.tileWidth;
        c.x = (c.x * factor) - (this.pan.x * factor);
        c.y = (c.y * factor) - (this.pan.y * factor);
        return c;
      }

      // real mouse coords
      mouseCoords(e) {
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

    }

    window.MapGui = MapGui;
  }
);
