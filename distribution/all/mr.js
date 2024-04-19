const util = require('../util/util');

const mr = function(config) {
  let context = {};
  context.gid = config.gid || 'all';

  return {
    exec: (configuration, nextExecution) => {
      /* Change this with your own exciting Map Reduce code! */
      // console.log('keys; ', configuration.keys);

      // define the map-reduce service
      const mrName = 'mr-' + util.id.getSID(configuration);
      const mrService = configuration;

      // metadata
      mrService.mrName = mrName;
      mrService.gid = context.gid;
      mrService.mapper = configuration.map;
      mrService.reducer = configuration.reduce;

      // libraries
      mrService.https = require('https');

      // methods
      mrService.init = function(callback=()=>{}) {
        // support variables for in-memory operation
        if (this.memory) {
          this.mapOutput = [];
        }
        this.reduceInput = new Map();

        // mapping from nid to sid
        global.distribution.local.groups.get(this.gid, (err, nodes) => {
          this.nodes = nodes;
          this.nidToSid = {};
          Object.keys(nodes).forEach((sid) => {
            this.nidToSid[util.id.getNID(nodes[sid])] = sid;
          });
          callback(null, null);
        });
      };

      mrService.mapNofify = function(keys, callback=()=>{}) {
        const groupService = global.distribution[this.gid];
        const localService = global.distribution.local;
        var counter = keys.length;
        if (!counter) {
          callback(null, []);
          return;
        }

        // map each object and store the result in memory
        const mapOutput = [];
        keys.forEach((key) => {
          groupService.store.get(key, (e, value) => {
            Promise.resolve(this.mapper(key, value)).then(((output) => {
              mapOutput.push(output);
              counter -= 1;
              if (!counter) {
                // store in memory or write to local storage
                if (this.memory) {
                  this.mapOutput = mapOutput;
                  callback(null, mapOutput);
                } else {
                  localService.store.put(mapOutput,
                      this.mrName + 'mapOutput',
                      () => {
                        callback(null, mapOutput);
                      });
                }
              }
            }));
          });
        });
      };

      mrService.shuffleNotify = function(callback=()=>{}) {
        const localService = global.distribution.local;

        // read intermediate result from memory or local storage
        const getIntermediateResult = (cb) => {
          if (this.memory) {
            cb(this.mapOutput.flat());
          } else {
            localService.store.get(this.mrName + 'mapOutput', (e, v) => {
              cb(v.flat());
            });
          }
        };

        // find host node by key and context.hash
        // nodes are {sid: nodeConfig}
        const getRemoteHost = (key) => {
          const hostNid = util.id.consistentHash(
              util.id.getID(key),
              Object.keys(this.nidToSid));
          return this.nodes[this.nidToSid[hostNid]];
        };

        getIntermediateResult((intermediateResult) => {
          var counter = intermediateResult.length;
          if (!counter) {
            callback(null, intermediateResult);
            return;
          }

          // send intermediate result to the corresponding nodes
          intermediateResult.forEach((output) => {
            const key = Object.keys(output)[0];
            const value = output[key];
            const remote = {
              node: getRemoteHost(key),
              service: this.mrName,
              method: 'reducePut'};

            localService.comm.send([key, value], remote, (e, v) => {
              counter -= 1;
              if (!counter) {
                callback(null, intermediateResult);
              }
            });
          });
        });
      },

      mrService.reducePut = function(key, value, callback=()=>{}) {
        // aggreate values from shuffling
        if (this.reduceInput.has(key)) {
          this.reduceInput.get(key).push(value);
        } else {
          this.reduceInput.set(key, [value]);
        }
        callback(null, [key, value]);
      },

      mrService.reduceNotify = function(callback=()=>{}) {
        const result = [];
        if (this.reduceInput.size == 0) {
          callback(null, []);
        }

        let counter = this.reduceInput.size;
        this.reduceInput.forEach((value, key) => {
          Promise.resolve(this.reducer(key, value)).then((output) => {
            if (output) {
              result.push(output);
            }
            counter -= 1;
            if (!counter) {
              callback(null, result);
            }
          });
        });
      };

      // Setup, Map, and Reduce
      const groupService = global.distribution[context.gid];
      groupService.routes.put(mrService, mrName, (e, v) => {
        const initNotify = {service: mrName, method: 'init'};
        groupService.comm.send([], initNotify, (e, v) => {
          distributeKeys(configuration.keys, (keysByNodeMap) => {
            mapNotifyWorkers(keysByNodeMap, () => {
              const shuffleNotify = {service: mrName, method: 'shuffleNotify'};
              groupService.comm.send([], shuffleNotify, (e, v) => {
                // console.log('map output: ', v);
                const reduceNotify = {service: mrName, method: 'reduceNotify'};
                groupService.comm.send([], reduceNotify, (e, v) => {
                  const result = Object.values(v).flat();
                  // deregister using routes.del

                  // TODO: DELETING SERVICE CAUSES ERRORS IN FUTURE WORKFLOWS
                  // groupService.routes.del(mrName, (e, v) => {
                  //   // // TODO: need to make this work baby
                  //   // callback(null, result);
                  //   nextExecution(null, result);
                  // });
                  nextExecution(null, result);
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
            nextKey += numKeys;
          });
          callback(keysByNodeMap);
        });
      }

      // notify workers and wait until map phase is complete
      function mapNotifyWorkers(keysByNodeMap, callback=()=>{}) {
        var counter = keysByNodeMap.size;
        keysByNodeMap.forEach((keys, node) => {
          const mapNotify = {node: node, service: mrName, method: 'mapNofify'};
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
