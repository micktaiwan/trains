/**
 * Created by mfaivremacon on 31/08/2015.
 */
"use strict";

Meteor.startup(function() {

    class TileGui extends Tile {

      constructor(map, pos, id) {
        super(map, pos, id);
        this.ctx = map.ctx;
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

    class MapGui extends Map {
      constructor(canvas_id, displayOptions) {
        super();
        displayOptions = displayOptions || {}; // why default parameters in es6 does not work here ?
        this.displayOptions = {
          caseWidth: displayOptions.caseWidth || 50
        };
        this.canvas = $(canvas_id).get(0);
        this.ctx = this.canvas.getContext("2d");

        this.mouseIsDown = false;

        // listen to mouse
        this.canvas.addEventListener("mousedown", $.proxy(this.onMouseDown, this), false);
        this.canvas.addEventListener("mouseup", $.proxy(this.onMouseUp, this), false);
        this.canvas.addEventListener("mousemove", $.proxy(this.onMouseMove, this), false);
        this.canvas.addEventListener("mousewheel", $.proxy(this.onMouseWheel, this), false);
        //this.canvas.addEventListener("dblclick", $.proxy(this.onMouseDblClick, this), false);
        //this.canvas.addEventListener("mouseout", $.proxy(this.onMouseOut, this), false);
      }

      putTrain() {
        if(!this.train)
          this.train = new TrainGui(this);
        this.draw();
      }

      // local (from this client) setCase
      setCase(pos) {
        super.setCase(pos); // save it in DB and broadcast
      }

      // coming from db
      setCaseWithId(id, pos) {
        let c = this.getCase(pos);
        console.log('setCaseWithId', id, pos, 'found', c);
        if(c) // if the client already have it
          c.id = id; // make sure the object have a DB id so we can remove it later
        else {
          this.tiles.push(new TileGui(this, pos, id));
          this.draw();
        }
      }

      resetMap() {
        super.resetMap();
        this.displayOptions.caseWidth = 50;
        this.draw();
      }

      draw() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        for(let i = 0; i < this.tiles.length; i++) {
          this.tiles[i].draw();
        }
        if(this.train) this.train.draw();
        this.drawMapBorder();
      }

      drawMouse(event) {
        let coords = this.relMouseCoords(event);
        let c = this.getMouseCaseCoords(coords);

        this.ctx.fillStyle = 'white';
        this.ctx.fillText(c.x + ' ' + c.y, 20, 20);

        if(this.mouseIsDown) this.setCaseFromEvent(event);
        this.drawMouseCase(c);
      }

      // we have been notified that another client removed this tile
      removeCase(id) {
        console.log('removing case', id, '...');
        for(let i = 0; i < this.tiles.length; i++) {
          if(this.tiles[i].id === id) {
            this.tiles.splice(i, 1);
            break;
          }
        }
        this.draw();
      }

      onMouseWheel(event) {
        event.preventDefault();
        this.displayOptions.caseWidth = (event.wheelDelta / 30 + this.displayOptions.caseWidth);
        this.draw();
        this.drawMouse(event);
      }

      onMouseMove(event) {
        this.draw();
        this.drawMouse(event);
      }

      onMouseDown(event) {
        this.setCaseFromEvent(event);
        this.draw();
        this.mouseIsDown = true;
        document.body.style.cursor = 'none';
      }

      onMouseUp(event) {
        this.mouseIsDown = false;
        document.body.style.cursor = 'default';
      }

      setCaseFromEvent(event) {
        this.setCase(this.getMouseCaseCoords(this.relMouseCoords(event)));
      }

      drawMapBorder() {
        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = '#999';
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.stroke();
      }

      drawMouseCase(c) {
        let margin = 3;
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#500';
        this.ctx.beginPath();
        this.ctx.rect(c.x * this.displayOptions.caseWidth + margin, c.y * this.displayOptions.caseWidth + margin, this.displayOptions.caseWidth - margin * 2, this.displayOptions.caseWidth - margin * 2);
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

    }

    window.MapGui = MapGui;
  }
);
