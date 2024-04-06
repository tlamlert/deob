global.nodeConfig = {ip: '127.0.0.1', port: 7070};
const distribution = require('../distribution');
const id = distribution.util.id;

const groupsTemplate = require('../distribution/all/groups');

const nodeGroup = {};

const fetch = require('node-fetch')

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

  nodeGroup[id.getSID(n1)] = n1;
  nodeGroup[id.getSID(n2)] = n2;
  nodeGroup[id.getSID(n3)] = n3;

  const startNodes = (cb) => {
    distribution.local.status.spawn(n1, (e, v) => {
      distribution.local.status.spawn(n2, (e, v) => {
        distribution.local.status.spawn(n3, (e, v) => {
          cb();
        });
      });
    });
  };

  distribution.node.start((server) => {
    localServer = server;

    const nodeConfig = {gid: 'node'};
    startNodes(() => {
      groupsTemplate(nodeConfig).put(nodeConfig, nodeGroup, (e, v) => {
        done();
      });
    });
  });
});

afterAll((done) => {
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

function sanityCheck(mapper, reducer, dataset, expected, done) {
  let mapped = dataset.map((o) =>
    mapper(Object.keys(o)[0], o[Object.keys(o)[0]]));
  /* Flatten the array. */
  mapped = mapped.flat();
  let shuffled = mapped.reduce((a, b) => {
    let key = Object.keys(b)[0];
    if (a[key] === undefined) a[key] = [];
    a[key].push(b[key]);
    return a;
  }, {});
  let reduced = Object.keys(shuffled).map((k) => reducer(k, shuffled[k]));

  try {
    expect(reduced).toEqual(expect.arrayContaining(expected));
  } catch (e) {
    done(e);
  }
}

// ---all.mr---

test('crawler workflow', (done) => {
  let m1 = (key, url) => {
    fetch(url).then(response => {
      response.text().then(content => {
        distribution.node.store.put(content, url);
      });
    });
    let out = {};
    out[url] = 1;
    return out;
  };

  let r1 = (key, values) => {
    let out = {};
    out[key] = values.reduce((a, b) => a + b, 0);
    return out;
  };

  let dataset = [
    {'000': 'https://cs.brown.edu/courses/csci1380/sandbox/1/'},
    {'106': 'https://cs.brown.edu/courses/csci1380/sandbox/2/'},
    {'212': 'https://cs.brown.edu/courses/csci1380/sandbox/3/'},
    {'318': 'https://cs.brown.edu/courses/csci1380/sandbox/4/'},
    {'424': 'https://cs.brown.edu/courses/csci1380/sandbox/1/'},
  ];

  let expected = [
    {'https://cs.brown.edu/courses/csci1380/sandbox/1/': 2},
    {'https://cs.brown.edu/courses/csci1380/sandbox/2/': 1},
    {'https://cs.brown.edu/courses/csci1380/sandbox/3/': 1},
    {'https://cs.brown.edu/courses/csci1380/sandbox/4/': 1},
  ];

  /* Sanity check: map and reduce locally */
  sanityCheck(m1, r1, dataset, expected, done);

  /* Now we do the same thing but on the cluster */
  const doMapReduce = (cb) => {
    distribution.node.store.get(null, (e, v) => {
      try {
        expect(v.length).toBe(dataset.length);
      } catch (e) {
        done(e);
      }

      distribution.node.mr.exec({keys: v, map: m1, reduce: r1}, (e, v) => {
        try {
          expect(v).toEqual(expect.arrayContaining(expected));
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  };

  let cntr = 0;

  // We send the dataset to the cluster
  dataset.forEach((o) => {
    let key = Object.keys(o)[0];
    let value = o[key];
    distribution.node.store.put(value, key, (e, v) => {
      cntr++;
      // Once we are done, run the map reduce
      if (cntr === dataset.length) {
        doMapReduce();
      }
    });
  });
});
