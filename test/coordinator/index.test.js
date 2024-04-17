global.nodeConfig = {ip: '127.0.0.1', port: 7070};
const distribution = require('../../distribution');
const id = distribution.util.id;

const groupsTemplate = require('../../distribution/all/groups');

const { index } = require('../../coordinator/index.js');
const utils = require('../../coordinator/utils.js');

const metadataGroup = {};
const invertedIndexGroup = {};

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

  // Define necessary node groups
  metadataGroup[id.getSID(n1)] = n1;
  metadataGroup[id.getSID(n2)] = n2;
  metadataGroup[id.getSID(n3)] = n3;

  invertedIndexGroup[id.getSID(n1)] = n1;
  invertedIndexGroup[id.getSID(n2)] = n2;
  invertedIndexGroup[id.getSID(n3)] = n3;

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
      const metadataConfig = {gid: 'bookMetadata'};
      groupsTemplate(metadataConfig).put(metadataConfig, metadataGroup, (e, v) => {
        const invertedIndexConfig = {gid: 'invertedIndex'};
        groupsTemplate(invertedIndexConfig).put(invertedIndexConfig, invertedIndexGroup, (e, v) => {
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


test('index[map]', (done) => {
    global.distribution = distribution;

    const url = "www.test.com";
    const metadata = "The United States' Constitution";
    const result = index.map(url, metadata);

    const expected = [
        {'unit' : "www.test.com"},
        {'constitut' : "www.test.com"},
        {'unit constitut' : "www.test.com"},
    ];
    expect(result).toEqual(expect.arrayContaining(expected));
    done();
});

test('index[reduce]', (done) => {
    // rm -rf ./store/*

    global.distribution = distribution;

    const ngram = 'sheep shoop';
    const urls = ['www.test.com', 'www.bacon.edu', 'www.bacon.edu', 'www.bacon.edu', 'www.apple.org', 'www.test.com'];

    const expected = {'sheep shoop' : [['www.bacon.edu', 3], ['www.test.com', 2], ['www.apple.org', 1]]};

    Promise.resolve(index.reduce(ngram, urls).then((result) => {
        // Test return value
        expect(Object.keys(result)).toEqual(Object.keys(expected));
        expect(result[ngram]).toEqual(expect.arrayContaining(expected[ngram]));

        // Test distributed store.get()
        distribution.invertedIndex.store.get('sheep shoop', (e, v) => {
            expect(e).toBeNull();
            expect(v).toEqual(expect.arrayContaining(expected[ngram]));
            done();
        })
    }))
});

test('index[reduce] w/ existing ngram object', (done) => {
    // rm -rf ./store/*

    global.distribution = distribution;

    // Put ngram object
    const ngram = 'beep boop';
    const oldURLs = [['www.bacon.edu', 3], ['www.test.com', 2], ['www.apple.org', 1]];
    distribution.invertedIndex.store.put(oldURLs, ngram, (e,v) => {
        expect(e).toBeNull();

        // Add new urls
        const newURLs = ["www.chicken.com", "www.test.com"];
        const expected = {'beep boop' : [['www.bacon.edu', 3], ['www.test.com', 3], ['www.apple.org', 1], ["www.chicken.com", 1]]};

        Promise.resolve(index.reduce(ngram, newURLs).then((result) => {
            expect(Object.keys(result)).toEqual(Object.keys(expected));
            expect(result[ngram]).toEqual(expect.arrayContaining(expected[ngram]));

            // Test distributed store.get()
            distribution.invertedIndex.store.get('beep boop', (e, v) => {
                expect(e).toBeNull();
                expect(v).toEqual(expect.arrayContaining(expected[ngram]));
                done();
            })
        }))
    })
});