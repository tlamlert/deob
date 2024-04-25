// =======================================
//          External libraries
// =======================================

const http = require('http');
const URL = require('url');
const {JSDOM} = require('jsdom');
global.URL = URL;
global.JSDOM = JSDOM;

// =======================================
//          Internal libraries
// =====================================

const groupsTemplate = require('../distribution/all/groups');
const distribution = require('../distribution.js');
const utils = require('./utils.js');
const id = distribution.util.id;
global.distribution = distribution;
global.utils = utils;

// =======================================
//          Read config from CLI
// =======================================

// Usage: ./distribution.js --ip 127.0.0.1 --port 1234 --workers 0.0.0.0,1.1.1.1 --workerPort 8080
const args = require('yargs').argv;

// Default configuration
const serverConfig = {
  ip: '127.0.0.1',
  port: 8080,
  workers: [],
  workerPorts: 8081,
  // List of IP Addr's of workers in the cloud distributed system
  // (ports are hardcoded to be the same)
  // workers can also be a list of local workers
};

/**
 * Read server configuration from command line.
 */
function readServerConfiguration() {
  // Read configuration values from CLI
  if (args.ip) {
    serverConfig.ip = args.ip;
  }

  if (args.port) {
    serverConfig.port = parseInt(args.port);
  }

  if (args.workers) {
    serverConfig.workers = args.workers.split(',');
  }

  if (args.workerPorts) {
    if (typeof(args.workerPorts) === 'string') {
      serverConfig.workerPorts = args.workerPorts.split(',').map(eval);
      if (serverConfig.workers.length != serverConfig.workerPorts.length) {
        return new Error('the number of ports is not equal to the number of workers');
      }
    } else {
      serverConfig.workerPorts = Array(serverConfig.workers.length).fill(args.workerPorts);
    }
  }
}

// =======================================
//          Initialize groups
// =======================================

const createWorkerAndStorageGroups = function(workers, workerPorts) {
  // Create node group with the given GID
  const createGenericGroup = function(gidString) {
    const genericGroup = {};
    console.log('workers: ', workers);
    workers.forEach((ipAddr, i) => {
      const neighbor = {ip: ipAddr, port: workerPorts[i]};
      genericGroup[id.getSID(neighbor)] = neighbor;
    })
    const config = {gid: gidString};

    return new Promise((resolve) => {
      groupsTemplate(config).put(config, genericGroup, (err, value) => {
        if (Object.keys(err).length > 0) {
          console.error('err: ', err);
        } else {
          console.log('Group deployed! ', gidString);
        }
        resolve();
      });
    });
  };

  // TODO: Before creating 

  return Promise.all([
    // uncrawledPageURLs : Responsible for storing uncrawled page URLs
    // (url, url)
    createGenericGroup('uncrawledPageURLs'),

    // uncrawledBookURLs : Responsible for storing uncrawled book URLs
    // (url, url)
    createGenericGroup('uncrawledBookURLs'),

    // crawledPageURLs : Responsible for storing visited page URLs
    // (url, url)
    createGenericGroup('crawledPageURLs'),

    // bookMetadata : Responsible for storing book metadata
    // (url, metadata)
    createGenericGroup('bookMetadata'),

    // invertedMetadata : Responsible for storing the mapping from ngram to list of URLs
    // (ngram, [(url, count), ...])
    createGenericGroup('invertedMetadata')]);
};

// =======================================
//          Start HTTP Server
// =======================================

const {startWorkflow, stopWorkflow, workflowStats} = require('./endpoint/workflow.js');
const {search} = require('./endpoint/search.js');
const { number } = require('yargs');

const startServer = function(serverConfig, cb = () => { }) {
  // Register functions as endpoints. Only synchronous functions
  // or functions that return a Promise can be registered.
  const endpoints = {PUT: {}, GET: {}};
  endpoints.PUT['/start'] = startWorkflow;
  endpoints.PUT['/stop'] = stopWorkflow;
  endpoints.GET['/search'] = search;
  endpoints.GET['/stats'] = workflowStats;
  endpoints.GET['/'] = () => 'Welcome to the Distributed Search Engine!\n';

  // Create a HTTPs server.
  const server = http.createServer((req, res) => {
    const url = URL.parse(req.url, true);
    console.log(`received a ${req.method} request at ${url.pathname}`);
    if (endpoints.hasOwnProperty(req.method)) {
      if (endpoints[req.method].hasOwnProperty(url.pathname)) {
        const asyncEndpoint = endpoints[req.method][url.pathname](url.query);
        const serializeResponse = (response) => res.end(JSON.stringify(response));
        Promise.resolve(asyncEndpoint).then(serializeResponse);
      } else {
        res.end(`${url.pathname} path not found!`);
      }
    } else {
      res.end(`${req.method} method not allow!`);
    }
  });

  // Create worker and storage groups.
  createWorkerAndStorageGroups(serverConfig.workers, serverConfig.workerPorts).then(() => {
    console.log('all groups are created');
    // Init uncrawled database
    const pageUrl = 'https://atlas.cs.brown.edu/data/gutenberg/';
    const bookUrl = 'https://atlas.cs.brown.edu/data/gutenberg/1/1/8/2/11823/11823-8.txt';
    global.distribution.uncrawledPageURLs.store.put(pageUrl, pageUrl, () => {
      global.distribution.uncrawledBookURLs.store.put(bookUrl, bookUrl, () => {
        server.listen(serverConfig.port, serverConfig.ip, () => {
          console.log(`Engine listening on ${serverConfig.ip}:${serverConfig.port}`);
          cb(server);
        });
      });
    });
  });
};

/* The following code is run when server.js is run directly */
if (require.main === module) {
  // Read server configuration from command line
  const err = readServerConfiguration();
  if (err) {
    console.err(err);
  }

  // Http server providing user interface
  startServer(serverConfig);
}

module.exports = startServer;
