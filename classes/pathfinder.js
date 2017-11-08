import {Geometry} from "./helpers";
import {TinyQueue} from "./priority-queue";


export class PathFinder {

  static heuristic(p1, p2) {
    return Geometry.dist(p1, p2);
  }

  static search(start, goal) {
    const frontier = new TinyQueue([], function(a, b) {return a.priority - b.priority;});
    frontier.push({value: start, priority: 0});
    const inverse_path = {};
    const cost_so_far = {};
    cost_so_far[start._id] = 0;
    let found = false;

    while(frontier.length) {
      const current = frontier.pop().value;
      // console.log('============ current', current._id, 'goal', goal._id);
      if(current._id === goal._id) {
        // console.log('break');
        found = true;
        // break; // do not break, go all around the graph and find the shortest path
      } // found
      _.each(current.children, function(child) {
        // console.log('** child', next._id);
        const new_cost = cost_so_far[current._id] + PathFinder.heuristic(current.pos, child.pos);
        // console.log('in', next._id in cost_so_far, new_cost, cost_so_far[next._id]);
        if(!(child._id in cost_so_far) || new_cost < cost_so_far[child._id]) {
          cost_so_far[child._id] = new_cost;
          const priority = new_cost + PathFinder.heuristic(child.pos, goal.pos);
          frontier.push({value: child, priority: priority});
          // console.log('pushing', next._id, '=>', current._id);
          inverse_path[child._id] = current._id;
        }
      });
    }
    return {found: found, inverse_path: inverse_path, cost_so_far: cost_so_far}
  }

  static path(start, goal) {
    const search = PathFinder.search(start, goal);
    if(!search.found) return [];
    const path = [goal._id];
    let current = goal._id;
    while(current = search.inverse_path[current]) {
      if(current !== start._id) path.unshift(current);
    }
    return path;
  }

}

/*
const six = {
  _id: '6',
  children: [],
  pos: {x: 0, y: 4}
};

const five = {
  _id: '5',
  children: [six],
  pos: {x: 0, y: 3}
};


const detour = {
  _id: '7',
  children: [six],
  pos: {x: -1, y: 3}
};

const four = {
  _id: '4',
  children: [],
  pos: {x: 0, y: 2}
};

const three = {
  _id: '3',
  children: [five],
  pos: {x: 1, y: 200}
};

const two = {
  _id: '2',
  children: [three, four],
  pos: {x: 0, y: 1}
};

const one = {
  _id: '1',
  children: [two],
  pos: {x: 0, y: 0}
};
console.log(PathFinder.path(one, six));
*/

