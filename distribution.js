#!/usr/bin/env node
const util = require('./distribution/util/util.js');
const args = require('yargs').argv;

// Default configuration
global.nodeConfig = global.nodeConfig || {
  ip: '127.0.0.1',
  port: 8080,
  onStart: () => {
    // console.log(`
    // sid: ${global.moreStatus.sid}
    // ip: ${global.nodeConfig.ip}
    // port: ${global.nodeConfig.port}`
    // );
  },
  neighbors: [], // List of IP Addr's of other nodes (ports are hardcoded to be the same)
};

/*
    As a debugging tool, you can pass ip and port arguments directly.
    This is just to allow for you to easily startup nodes from the terminal.

    Usage:
    ./distribution.js --ip '127.0.0.1' --port 1234
  */
if (args.ip) {
  global.nodeConfig.ip = args.ip;
}

if (args.port) {
  global.nodeConfig.port = parseInt(args.port);
}

if (args.config) {
  let nodeConfig = util.deserialize(args.config);
  global.nodeConfig.ip = nodeConfig.ip ? nodeConfig.ip : global.nodeConfig.ip;
  global.nodeConfig.port = nodeConfig.port ?
    nodeConfig.port : global.nodeConfig.port;
  global.nodeConfig.onStart = nodeConfig.onStart ?
    nodeConfig.onStart : global.nodeConfig.onStart;
}

if (args.neighbors) {
  global.nodeConfig.neighbors = args.workers.split(',');
}

const distribution = {
  util: require('./distribution/util/util.js'),
  local: require('./distribution/local/local.js'),
  node: require('./distribution/local/node.js'),
};

global.distribution = distribution;

distribution['all'] = {};
distribution['all'].status =
  require('./distribution/all/status')({ gid: 'all' });
distribution['all'].comm =
  require('./distribution/all/comm')({ gid: 'all' });
distribution['all'].gossip =
  require('./distribution/all/gossip')({ gid: 'all' });
distribution['all'].groups =
  require('./distribution/all/groups')({ gid: 'all' });
distribution['all'].routes =
  require('./distribution/all/routes')({ gid: 'all' });
distribution['all'].mem =
  require('./distribution/all/mem')({ gid: 'all' });
distribution['all'].store =
  require('./distribution/all/store')({ gid: 'all' });

module.exports = global.distribution;

/* The following code is run when distribution.js is run directly */
if (require.main === module) {
  distribution.node.start(global.nodeConfig.onStart);
}

// libraries for map reduce workflows
const https = require('https');
const { URL } = require('url');
const { JSDOM } = require('jsdom');
global.https = https;
global.URL = URL;
global.JSDOM = JSDOM;
global.utils = require('./coordinator/utils.js');
global.natural = require('natural');

// Stop words from file
const fs = require('fs');
const stopwordsData = fs.readFileSync('./coordinator/data/stopwords.txt', 'utf8');
const bagOfStopwords = stopwordsData.split('\n').filter(Boolean);
global.bagOfStopwords = bagOfStopwords;
