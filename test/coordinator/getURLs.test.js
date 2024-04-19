global.nodeConfig = {ip: '127.0.0.1', port: 7070};
const distribution = require('../../distribution');
const id = distribution.util.id;

const groupsTemplate = require('../../distribution/all/groups');

const {getURLs} = require('../../coordinator/getURLs.js');

// QUESTION: should we change GIDs to `test-${gid}`?
const rpcGroup = {}; // rawPageContents
const cURLsGroup = {}; // crawledURLs
const uURLsGroup = {}; // uncrawledURLs

const fs = require('fs');


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

const n1 = {ip: '127.0.0.1', port: 7210};
const n2 = {ip: '127.0.0.1', port: 7211};
const n3 = {ip: '127.0.0.1', port: 7212};

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
  // Define necessary node groups
  rpcGroup[id.getSID(n1)] = n1;
  rpcGroup[id.getSID(n2)] = n2;
  rpcGroup[id.getSID(n3)] = n3;

  cURLsGroup[id.getSID(n1)] = n1;
  cURLsGroup[id.getSID(n2)] = n2;
  cURLsGroup[id.getSID(n3)] = n3;

  uURLsGroup[id.getSID(n1)] = n1;
  uURLsGroup[id.getSID(n2)] = n2;
  uURLsGroup[id.getSID(n3)] = n3;

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
        console.log('Raw Page Contents Group Initialized');
        const cURLsConfig = {gid: 'crawledURLs'};
        groupsTemplate(cURLsConfig).put(cURLsConfig, cURLsGroup, (e, v) => {
          console.log('Crawled URLs Group Initialized');
          const uURLsConfig = {gid: 'uncrawledURLs'};
          groupsTemplate(uURLsConfig).put(uURLsConfig, uURLsGroup, (e, v) => {
            console.log('Uncrawled URLs Group Initialized');
            done();
          });
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

test('getURLs[map]', (done) => {
  const url = 'https://www.york.ac.uk/teaching/cws/wws/webpage1.html';
  const htmlPath = 'test/data/getURLs1.html';
  const expected = [{'https://www.york.ac.uk/teaching/cws/wws/webpage2.html': 1}, {'https://www.york.ac.uk/teaching/cws/wws/col3.html': 1}];
  // read in the html file

  fs.readFile(htmlPath, 'utf8', (err, pageContent) => {
    console.log('getURLs map pageContent: ', pageContent);
    if (err) {
      expect(err).toBeNull();
      done();
    }
    const res = getURLs['map'](url, pageContent);
    console.log('getURLs map url: ', url);
    expect(res).toEqual(expected);
    expect(res).toEqual(expect.arrayContaining(expected));
    done();
  });
});

test('getURLs[reduce]', (done) => {
  const url = 'https://www.york.ac.uk/teaching/cws/wws/webpage1.html';
  const expected = {'https://www.york.ac.uk/teaching/cws/wws/webpage1.html': null};
  getURLs.reduce(url, 1).then((res) => {
    console.log('getURLs reduce url: ', url);
    expect(Object.keys(res)).toEqual(Object.keys(expected));
    done();
  });
});
