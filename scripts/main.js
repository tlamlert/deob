// global.nodeConfig = {ip: '127.0.0.1', port: 7070};
global.nodeConfig = {ip: '0.0.0.0', port: 7070};
const distribution = require('../distribution');
const id = distribution.util.id;

const groupsTemplate = require('../distribution/all/groups');

const poopGroup = {}; // Node SID -> {ip: ... , port: ...}
const port = 8080;

const startPoopGroup = function() {
  // Populate poopGroup with neighbor ip addresses and ports
  for (const ipAddr of global.nodeConfig.neighbors) {
    const neighbor = {ip: ipAddr, port: port};
    poopGroup[id.getSID(neighbor)] = neighbor;
  }

  // Instantiate poopGroup
  distribution.node.start((server) => {
    localServer = server;
    const poopConfig = {gid: 'poop'};
    groupsTemplate(poopConfig).put(poopConfig, poopGroup, (e, v) => {
      console.log("Poop deployed!");
      // Start crawling workflow
      distribution.poopGroup.mr.exec() {
        .f
      };
    });
  });
}

startPoopGroup()
