global.nodeConfig = {ip: '127.0.0.1', port: 7070};
const distribution = require('../../distribution');
const id = distribution.util.id;

const groupsTemplate = require('../../distribution/all/groups');
const startServer = require('../../coordinator/server.js');

const rpcGroup = {};
const rbcGroup = {};


/*
  This hack is necessary since we can not
  gracefully stop the local listening node.
  The process that node is
  running in is the actual jest process
*/

let localServer = null;

/*
  The local node will be the orchestrator.
*/

const n1 = {ip: '127.0.0.1', port: 7110};
const n2 = {ip: '127.0.0.1', port: 7111};
const n3 = {ip: '127.0.0.1', port: 7112};

beforeAll((done) => {
  /* Stop the nodes if they are running */
  let remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
      });
    });
  });

  const startNodes = (cb) => {
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          cb();
        });
      });
    });
  };

  const serverConfig = {
    ip: '127.0.0.1',
    port: 8080,
    workers: [n1.ip, n2.ip, n3.ip],
    ports: [n1.port, n2.port, n3.port],
  };

  // Spawn 3 nodes as the distributed system
  // This is equivalent to running `node distribution.js` in all EC2 instances
  startNodes(() => {
    // Start HTTP server after starting the nodes ()
    console.log("startNodesCalled")
    startServer(serverConfig, (server) => {
      console.log("STARTING SERVER")
      localServer = server;
      done();
    });
  });
});

afterAll((done) => {
  // Stop the nodes if they are running
  let remote = {service: 'status', method: 'stop'};
  remote.node = n1;
  distribution.local.comm.send([], remote, (e, v) => {
    remote.node = n2;
    distribution.local.comm.send([], remote, (e, v) => {
      remote.node = n3;
      distribution.local.comm.send([], remote, (e, v) => {
        localServer.close();
        done();
      });
    });
  });
});

const https = require('https');

test('EndToEnd test .txt file', (done) => {
  // Put some URLs in uncrawledURLs
  // Send http PUT to /start
  // Wait for a few seconds
  // Check that crawledURLs is not empty and contains all initial URLs
  const url = 'https://atlas.cs.brown.edu/data/gutenberg/1/1/8/2/11823/11823-8.txt';
  distribution.uncrawledURLs.store.put(null, url, (e, v) => {
    const options = {
      host: '127.0.0.1',
      port: 8080,
      path: '/start',
      method: 'PUT',
    };
    https.request(options, (res) => {
      setTimeout(() => {
        distribution.crawledURLs.store.get(null, (e, v) => {
          expect(e).toBeNull();
          expect(v.length > 0).toEqual(true);
          done();
        })}, 1000);
    });
  });
});
