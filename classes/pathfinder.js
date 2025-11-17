import {Geometry} from "./helpers";
import {TinyQueue} from "./priority-queue";


export class PathFinder {

  static heuristic(p1, p2) {
    return Geometry.dist(p1, p2);
  }

  static search(start, goal) {
    // Input validation (legitimate check - prevent crashes from bad callers)
    if(!start || !goal) {
      console.error('PathFinder.search: BUG - called with null parameters (start:', !!start, 'goal:', !!goal, ')');
      return {found: false, inverse_path: {}, cost_so_far: {}};
    }
    if(!start._id || !goal._id) {
      console.error('PathFinder.search: BUG - stations missing IDs (start._id:', !!start._id, 'goal._id:', !!goal._id, ')');
      return {found: false, inverse_path: {}, cost_so_far: {}};
    }

    const frontier = new TinyQueue([], function(a, b) {return a.priority - b.priority;});
    frontier.push({value: start, priority: 0});
    const inverse_map = {};
    const costs = {};
    costs[start._id] = 0;
    let found = false;
    let nbCurrentNodes = 0, nbChildrenNodes = 0, nbFrontiers = 0;

    while(frontier.length) {
      nbCurrentNodes++;
      const current = frontier.pop().value;
      // console.log('============ current', current._id, 'goal', goal._id);
      if(current._id === goal._id) {
        // console.log('break');
        found = true;
        break; // do not break, go all around the graph and find the shortest path
      } // found
      _.each(current.children, function(child) {
        nbChildrenNodes++;
        // console.log('** child', next._id);
        const new_cost = costs[current._id] + PathFinder.heuristic(current.pos, child.pos);
        // console.log('in', next._id in cost_so_far, new_cost, cost_so_far[next._id]);
        if(!(child._id in costs) || new_cost < costs[child._id]) {
          nbFrontiers++;
          costs[child._id] = new_cost;
          const priority = new_cost + PathFinder.heuristic(child.pos, goal.pos);
          frontier.push({value: child, priority: priority});
          // console.log('pushing', next._id, '=>', current._id);
          inverse_map[child._id] = current._id;
        }
      });
    }
    // console.log("PathFinder#search: nb nodes:", nbCurrentNodes, '/', nbFrontiers, '(', nbChildrenNodes, ' children), total cost:', Math.round(costs[goal._id]));
    return {found: found, inverse_path: inverse_map, cost_so_far: costs}
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

