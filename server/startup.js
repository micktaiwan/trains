/**
 * Created by mfaivremacon on 03/09/2015.
 */

import {ServerTrain} from '../classes/serverTrain';

const trains = [];

const getTrain = function(train_id) {
  for(let i = 0; i < trains.length; i++) if(trains[i]._id === train_id) return trains[i];
  return null;
};

const createTrain = function(train_id, doc) {
  // console.log('create train', train_id, doc);
  let train = getTrain(train_id);
  if(train) return train;
  // not found
  train = new ServerTrain(train_id, doc);
  trains.push(train);
  return train;
};

const removeTrain = function(train_id, doc) {
  let train = getTrain(train_id);
  if(!train) return train;
  // found
  for(let i = 0; i < trains.length; i++) if(trains[i]._id === train_id) {
    trains[i].stop();
    trains.splice(i, 1);
    break;
  }
};

// for each train in the map, move it
Meteor.startup(function() {

  // server observe for new trains
  Trains.find().observeChanges({
    added: function(train_id, doc) {
      //console.log('server: added', train_id, doc);
      createTrain(train_id, doc);
    },
    removed: function(id) {
      let doc = Paths.findOne(id);
      //console.log('server: removed', id);
      removeTrain(id);
    }
  });

  // path types data seed
  /*
    if(PathTypes.find({}).count() === 0) {
      PathTypes.insert({
        name: 'Rails',
        price: 1,
        icon: 'road'
      });
      PathTypes.insert({
        name: 'Station',
        price: 150,
        icon: 'university'
      });
    }
  */

});
