global.nodeConfig = {ip: '127.0.0.1', port: 7070};
const distribution = require('../../distribution');
const id = distribution.util.id;

const groupsTemplate = require('../../distribution/all/groups');

const { crawl } = require('../../coordinator/crawl.js');

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
  // Define necessary node groups
  rpcGroup[id.getSID(n1)] = n1;
  rpcGroup[id.getSID(n2)] = n2;
  rpcGroup[id.getSID(n3)] = n3;

  rbcGroup[id.getSID(n1)] = n1;
  rbcGroup[id.getSID(n2)] = n2;
  rbcGroup[id.getSID(n3)] = n3;

  // Spawn 3 nodes as the distributed system
  const startNodes = (cb) => {
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          cb();
        });
      });
    });
  };

  // Initialize necessary node groups
  distribution.node.start((server) => {
    localServer = server;
    startNodes(() => {
      const rpcConfig = {gid: 'rawPageContents'};
      groupsTemplate(rpcConfig).put(rpcConfig, rpcGroup, (e, v) => {
        const rbcConfig = {gid: 'rawBookContents'};
        groupsTemplate(rbcConfig).put(rbcConfig, rbcGroup, (e, v) => {
          done();
        });
      });
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

test('crawl[map]: non-book page', (done) => {
  // Set up libraries used in crawl[map]
  global.https = require('https');
  global.distribution = distribution;

  // Input and expected output: {url: 1}
  const url = 'https://atlas.cs.brown.edu/data/gutenberg/';
  const expected = {};
  expected[url] = 1;

  Promise.resolve(crawl['map'](url, null)).then((result) => {
    // Check that the page content is properly stored in the distributed system
    distribution.rawPageContents.store.get(url, (e, v) => {
      expect(result).toEqual(expected);
      expect(e).toBeNull();
      done();
    })
  });
});

test('crawl[map]: book page', (done) => {
  // Set up libraries used in crawl[map]
  global.https = require('https');
  global.distribution = distribution;

  // Input and expected output: {url: 1}
  const url = 'https://atlas.cs.brown.edu/data/gutenberg/donate-howto.txt';
  const expected = {};
  expected[url] = 1;

  Promise.resolve(crawl['map'](url, null)).then((result) => {
    // Check that the page content is properly stored in the distributed system
    distribution.rawBookContents.store.get(url, (e, v) => {
      expect(result).toEqual(expected);
      expect(e).toBeNull();
      done();
    })
  });
});

test('crawl[reduce]', (done) => {
  // Input and expected output: {url: 1}
  const url = 'https://atlas.cs.brown.edu/data/gutenberg/';
  const _count = [1];
  const expected = {};
  expected[url] = 1;

  const result = crawl['reduce'](url, _count)
  expect(result).toEqual(expected);
  done();
});
