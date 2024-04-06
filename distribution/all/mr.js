const util = require('../util/util');

const mr = function(config) {
  let context = {};
  context.gid = config.gid || 'all';

  return {
    exec: (configuration, callback) => {
      /* Change this with your own exciting Map Reduce code! */
      const mrName = 'mr-' + util.id.getSID(configuration);
      const mrService = {
        // metadata
        mrName: mrName,
        gid: context.gid,
        mapper: configuration.map,
        reducer: configuration.reduce,

        init: function(callback=()=>{}) {
          this.mapOutput = [];
          this.reduceInput = new Map();
          
          // mapping from nid to sid
          global.distribution.local.groups.get(this.gid, (err, nodes) => {
            this.nodes = nodes;
            this.nidToSid = {};
            Object.keys(nodes).forEach((sid) => {
              this.nidToSid[util.id.getNID(nodes[sid])] = sid;
            });
          });
          callback(null, null);
        },

        map: function(keys, callback=()=>{}) {
          const groupService = global.distribution[this.gid];
          var counter = keys.length;
          if (!counter) {
            callback(null, this.mapOutput);
            return;
          }

          // map each object and store the result in memory
          keys.forEach((key) => {
            groupService.store.get(key, (e, value) => {
              const output = this.mapper(key, value);
              this.mapOutput.push(output);
              counter -= 1;
              if (!counter) {
                callback(null, this.mapOutput);
              }
            });
          });
        },

        // find host node by key and context.hash
        // nodes are {sid: nodeConfig}
        getRemoteHost: function(key) {
          const hostNid = util.id.consistentHash(
              util.id.getID(key),
              Object.keys(this.nidToSid));
          return this.nodes[this.nidToSid[hostNid]];
        },

        shuffle: function(callback=()=>{}) {
          const localService = global.distribution.local;
          const intermediateResult = this.mapOutput.flat();
          var counter = intermediateResult.length;
          if (!counter) {
            callback(null, this.mapOutput);
            return;
          }

          // send intermediate result to the corresponding nodes
          intermediateResult.forEach((output) => {
            const key = Object.keys(output)[0];
            const value = output[key];
            const remote = {
              node: this.getRemoteHost(key),
              service: this.mrName,
              method: 'reducePut'};

            localService.comm.send([key, value], remote, (e, v) => {
              counter -= 1;
              if (!counter) {
                callback(null, intermediateResult);
              }
            });
          });
        },

        reducePut: function(key, value, callback=()=>{}) {
          // aggreate values from shuffling
          if (this.reduceInput.has(key)) {
            this.reduceInput.get(key).push(value);
          } else {
            this.reduceInput.set(key, [value]);
          }
          callback(null, [key, value]);
        },

        reduce: function(callback=()=>{}) {
          const result = [...this.reduceInput.entries()].map(
              (args) => this.reducer(...args));
          callback(null, result);
        },
      };

      // Setup, Map, and Reduce
      const groupService = global.distribution[context.gid];
      groupService.routes.put(mrService, mrName, (e, v) => {
        const initNotify = {service: mrName, method: 'init'};
        groupService.comm.send([], initNotify, (e, v) => {
          distributeKeys(configuration.keys, (keysByNodeMap) => {
            mapNotifyWorkers(keysByNodeMap, () => {
              const shuffleNotify = {service: mrName, method: 'shuffle'};
              groupService.comm.send([], shuffleNotify, (e, v) => {
                console.log('map output: ', v);
                const reduceNotify = {service: mrName, method: 'reduce'};
                groupService.comm.send([], reduceNotify, (e, v) => {
                  console.log('reduce output: ', v);
                  const result = Object.values(v).flat();
                  // deregister using routes.del
                  groupService.routes.del(mrName, (e, v) => {
                    callback(null, result);
                  });
                });
              });
            });
          });
        });
      });
      
      // distribute keys evenly by slicing the key array into equal length
      function distributeKeys(keys, callback=()=>{}) {
        global.distribution.local.groups.get(context.gid, (err, nodes) => {
          // split keys
          const totalNumKeys = keys.length;
          const numNodes = Object.keys(nodes).length;
          const keysPerNode = Math.floor(totalNumKeys / numNodes);
          const remainder = totalNumKeys % numNodes;
          var counter = 0;
          var nextKey = 0;
          
          // construct the mapping from node info to keys
          const keysByNodeMap = new Map();
          Object.keys(nodes).forEach((nid) => {
            const node = {ip: nodes[nid].ip, port: nodes[nid].port};
            const numKeys = keysPerNode + (counter++ < remainder? 1 : 0);
            keysByNodeMap.set(node, keys.slice(nextKey, nextKey + numKeys));
            nextKey += numKeys
          });
          callback(keysByNodeMap);
        });
      }

      // notify workers and wait until map phase is complete
      function mapNotifyWorkers(keysByNodeMap, callback=()=>{}) {
        var counter = keysByNodeMap.size;
        keysByNodeMap.forEach((keys, node) => {
          const mapNotify = {node: node, service: mrName, method: 'map'};
          global.distribution.local.comm.send([keys], mapNotify, (e, v) => {
            counter -= 1;
            if (!counter) {
              callback();
            }
          });
        });
      }
    },
  };
};

module.exports = mr;
