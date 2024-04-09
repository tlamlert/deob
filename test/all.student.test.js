// global.nodeConfig = {ip: '127.0.0.1', port: 7070};
// const distribution = require('../distribution');
// const id = distribution.util.id;

// const groupsTemplate = require('../distribution/all/groups');

// const ncdcGroup = {};
// const nodeGroup = {};
// const crawlerGroup = {};
// const regexGroup = {};

// /*
//    This hack is necessary since we can not
//    gracefully stop the local listening node.
//    The process that node is
//    running in is the actual jest process
// */
// let localServer = null;

// /*
//     The local node will be the orchestrator.
// */

// const n1 = {ip: '127.0.0.1', port: 7110};
// const n2 = {ip: '127.0.0.1', port: 7111};
// const n3 = {ip: '127.0.0.1', port: 7112};

// beforeAll((done) => {
//   /* Stop the nodes if they are running */

//   ncdcGroup[id.getSID(n1)] = n1;
//   ncdcGroup[id.getSID(n2)] = n2;
//   ncdcGroup[id.getSID(n3)] = n3;

//   nodeGroup[id.getSID(n1)] = n1;
//   nodeGroup[id.getSID(n2)] = n2;
//   nodeGroup[id.getSID(n3)] = n3;

//   crawlerGroup[id.getSID(n1)] = n1;
//   crawlerGroup[id.getSID(n2)] = n2;
//   crawlerGroup[id.getSID(n3)] = n3;

//   regexGroup[id.getSID(n1)] = n1;
//   regexGroup[id.getSID(n2)] = n2;
//   regexGroup[id.getSID(n3)] = n3;

//   const startNodes = (cb) => {
//     distribution.local.status.spawn(n1, (e, v) => {
//       distribution.local.status.spawn(n2, (e, v) => {
//         distribution.local.status.spawn(n3, (e, v) => {
//           cb();
//         });
//       });
//     });
//   };

//   distribution.node.start((server) => {
//     localServer = server;
//     startNodes(() => {
//       const ncdcConfig = {gid: 'ncdc'};
//       groupsTemplate(ncdcConfig).put(ncdcConfig, ncdcGroup, (e, v) => {
//         const nodeConfig = {gid: 'node'};
//         groupsTemplate(nodeConfig).put(nodeConfig, nodeGroup, (e, v) => {
//           const crawlerConfig = {gid: 'crawler'};
//           groupsTemplate(crawlerConfig).put(crawlerConfig, crawlerGroup,
//               (e, v) => {
//                 const regexConfig = {gid: 'regex'};
//                 groupsTemplate(regexConfig).put(regexConfig, regexGroup,
//                     (e, v) => {
//                       done();
//                     });
//               });
//         });
//       });
//     });
//   });
// });

// afterAll((done) => {
//   let remote = {service: 'status', method: 'stop'};
//   remote.node = n1;
//   distribution.local.comm.send([], remote, (e, v) => {
//     remote.node = n2;
//     distribution.local.comm.send([], remote, (e, v) => {
//       remote.node = n3;
//       distribution.local.comm.send([], remote, (e, v) => {
//         localServer.close();
//         done();
//       });
//     });
//   });
// });

// function sanityCheck(mapper, reducer, dataset, expected, done) {
//   let mapped = dataset.map((o) =>
//     mapper(Object.keys(o)[0], o[Object.keys(o)[0]]));
//   /* Flatten the array. */
//   mapped = mapped.flat();
//   let shuffled = mapped.reduce((a, b) => {
//     let key = Object.keys(b)[0];
//     if (a[key] === undefined) a[key] = [];
//     a[key].push(b[key]);
//     return a;
//   }, {});
//   let reduced = Object.keys(shuffled).map((k) => reducer(k, shuffled[k]));

//   try {
//     expect(reduced).toEqual(expect.arrayContaining(expected));
//   } catch (e) {
//     done(e);
//   }
// }

// // ---all.mr---

// test('(25 pts) all.mr:ncdc (memory)', (done) => {
//   let m1 = (key, value) => {
//     let words = value.split(/(\s+)/).filter((e) => e !== ' ');
//     console.log(words);
//     let out = {};
//     out[words[1]] = parseInt(words[3]);
//     return out;
//   };

//   let r1 = (key, values) => {
//     let out = {};
//     out[key] = values.reduce((a, b) => Math.max(a, b), -Infinity);
//     return out;
//   };

//   let dataset = [
//     {'000': '006701199099999 1950 0515070049999999N9 +0000 1+9999'},
//     {'106': '004301199099999 1950 0515120049999999N9 +0022 1+9999'},
//     {'212': '004301199099999 1950 0515180049999999N9 -0011 1+9999'},
//     {'318': '004301265099999 1949 0324120040500001N9 +0111 1+9999'},
//     {'424': '004301265099999 1949 0324180040500001N9 +0078 1+9999'},
//   ];

//   let expected = [{'1950': 22}, {'1949': 111}];

//   /* Sanity check: map and reduce locally */
//   sanityCheck(m1, r1, dataset, expected, done);

//   /* Now we do the same thing but on the cluster */
//   const doMapReduce = (cb) => {
//     distribution.ncdc.store.get(null, (e, v) => {
//       try {
//         expect(v.length).toBe(dataset.length);
//       } catch (e) {
//         done(e);
//       }

//       const configuration = {keys: v, map: m1, reduce: r1, memory: true};
//       distribution.ncdc.mr.exec(configuration, (e, v) => {
//         try {
//           expect(v).toEqual(expect.arrayContaining(expected));
//           done();
//         } catch (e) {
//           done(e);
//         }
//       });
//     });
//   };

//   let cntr = 0;

//   // We send the dataset to the cluster
//   dataset.forEach((o) => {
//     let key = Object.keys(o)[0];
//     let value = o[key];
//     distribution.ncdc.store.put(value, key, (e, v) => {
//       cntr++;
//       // Once we are done, run the map reduce
//       if (cntr === dataset.length) {
//         doMapReduce();
//       }
//     });
//   });
// });

// // ---mr.workflow---

// test('crawler workflow', (done) => {
//   // // TODO: this doesn't work yet
//   // let m1 = (() => {
//   //   // const library = {
//   //   //   https: https,
//   //   // };

//   //   // const context = 1;
//   //   return function(key, url) {
//   //     // TODO: Why does this not work?
//   //     // library.https.get(url, (res) => {
//   //     //   let rawData = '';
//   //     //   res.on('data', (chunk) => { rawData += chunk; });
//   //     //   res.on('end', () => { global.distribution.crawler.store.put(rawData, url);})
//   //     // })

//   //     let out = {};
//   //     out[url] = context;
//   //     return out;
//   //   };
//   // })();

//   let m1 = (key, url) => {
//     global.https.get(url, (res) => {
//       let page = '';
//       res.on('data', (d) => {
//         page += d;
//       });
//       res.on('end', () => {
//         global.distribution.local.store.put(url, page, ()=>{});
//       });
//     });
//     let out = {};
//     out[url] = 1;
//     return out;
//   };

//   let r1 = (key, values) => {
//     let out = {};
//     out[key] = values.reduce((a, b) => a + b, 0);
//     return out;
//   };

//   let dataset = [
//     {'000': 'https://www.york.ac.uk/teaching/cws/wws/webpage1.html'},
//     {'106': 'https://www.york.ac.uk/teaching/cws/wws/webpage2.html'},
//     {'212': 'https://www.york.ac.uk/teaching/cws/wws/webpage3.html'},
//     {'318': 'https://www.york.ac.uk/teaching/cws/wws/webpage4.html'},
//     {'424': 'https://www.york.ac.uk/teaching/cws/wws/webpage1.html'},
//   ];

//   let expected = [
//     {'https://www.york.ac.uk/teaching/cws/wws/webpage1.html': 2},
//     {'https://www.york.ac.uk/teaching/cws/wws/webpage2.html': 1},
//     {'https://www.york.ac.uk/teaching/cws/wws/webpage3.html': 1},
//     {'https://www.york.ac.uk/teaching/cws/wws/webpage4.html': 1},
//   ];

//   /* Sanity check: map and reduce locally */
//   sanityCheck(m1, r1, dataset, expected, done);

//   /* Now we do the same thing but on the cluster */
//   const doMapReduce = (cb) => {
//     distribution.node.store.get(null, (e, v) => {
//       try {
//         expect(v.length).toBe(dataset.length);
//       } catch (e) {
//         done(e);
//       }

//       const configuration = {keys: v, map: m1, reduce: r1, memory: true};
//       distribution.node.mr.exec(configuration, (e, v) => {
//         try {
//           expect(v).toEqual(expect.arrayContaining(expected));
//           done();
//         } catch (e) {
//           done(e);
//         }
//       });
//     });
//   };

//   let cntr = 0;

//   // We send the dataset to the cluster
//   dataset.forEach((o) => {
//     let key = Object.keys(o)[0];
//     let value = o[key];
//     distribution.node.store.put(value, key, (e, v) => {
//       cntr++;
//       // Once we are done, run the map reduce
//       if (cntr === dataset.length) {
//         doMapReduce();
//       }
//     });
//   });
// });

// test('url extraction workflow', (done) => {
//   // TODO: this doesn't work yet
//   let m1 = (key, url) => {
//     global.distribution.crawler.store.get(url, (rawData) => {
//       // convert the given url to a directory
//       if (!url.endsWith('.html') && !url.endsWith('/')) {
//         url += '/';
//       }
//       const {URL} = require('url');
//       const base = new URL(url);

//       // init dom object
//       const {JSDOM} = require('jsdom');
//       const dom = new JSDOM(rawData);
//       const rawLinks = [...dom.window.document.querySelectorAll('a')];

//       // construct output
//       let out = {};
//       out[url] = rawLinks.map((link) => new URL(link, base).href);
//       return out;
//     });
//   };

//   let r1 = (key, values) => {
//     // filter out duplicates and store in distribution group
//     const uniqueLinks = [...new Set(values)];
//     uniqueLinks.forEach((link) => {
//       distribution.crawler.store.put(link, link);
//     });

//     // construct output
//     let out = {};
//     out[key] = uniqueLinks;
//     return out;
//   };

//   // TODO: update dataset and expected values
//   let dataset = [
//     {'000': 'https://www.york.ac.uk/teaching/cws/wws/webpage1.html'},
//     {'106': 'https://www.york.ac.uk/teaching/cws/wws/webpage2.html'},
//     {'212': 'https://www.york.ac.uk/teaching/cws/wws/webpage3.html'},
//     {'318': 'https://www.york.ac.uk/teaching/cws/wws/webpage4.html'},
//     {'424': 'https://www.york.ac.uk/teaching/cws/wws/webpage1.html'},
//   ];

//   let expected = [
//     {'https://www.york.ac.uk/teaching/cws/wws/webpage1.html': 2},
//     {'https://www.york.ac.uk/teaching/cws/wws/webpage2.html': 1},
//     {'https://www.york.ac.uk/teaching/cws/wws/webpage3.html': 1},
//     {'https://www.york.ac.uk/teaching/cws/wws/webpage4.html': 1},
//   ];

//   /* Sanity check: map and reduce locally */
//   sanityCheck(m1, r1, dataset, expected, done);

//   /* Now we do the same thing but on the cluster */
//   const doMapReduce = (cb) => {
//     distribution.node.store.get(null, (e, v) => {
//       try {
//         expect(v.length).toBe(dataset.length);
//       } catch (e) {
//         done(e);
//       }

//       const configuration = {keys: v, map: m1, reduce: r1, memory: true};
//       distribution.node.mr.exec(configuration, (e, v) => {
//         try {
//           expect(v).toEqual(expect.arrayContaining(expected));
//           done();
//         } catch (e) {
//           done(e);
//         }
//       });
//     });
//   };

//   let cntr = 0;

//   // We send the dataset to the cluster
//   dataset.forEach((o) => {
//     let key = Object.keys(o)[0];
//     let value = o[key];
//     distribution.node.store.put(value, key, (e, v) => {
//       cntr++;
//       // Once we are done, run the map reduce
//       if (cntr === dataset.length) {
//         doMapReduce();
//       }
//     });
//   });
// });

// test('string matching workflow', (done) => {
//   let m1 = (key, objectId) => {
//     const regexExpression = /^([a-z0-9]{5,})$/;
//     const regex = new RegExp(regexExpression);
//     if (regex.test(objectId)) {
//       let out = {};
//       out[objectId] = [null];
//       return out;
//     } else {
//       return [];
//     }
//   };

//   let r1 = (key, values) => {
//     let out = {};
//     out[key] = values.length;
//     return out;
//   };

//   let dataset = [
//     {'000': 'abc1'},
//     {'106': 'abc12'},
//     {'212': 'abc123'},
//     {'318': 'abc12'},
//   ];

//   let expected = [
//     {'abc12': 2},
//     {'abc123': 1},
//   ];

//   /* Sanity check: map and reduce locally */
//   sanityCheck(m1, r1, dataset, expected, done);

//   /* Now we do the same thing but on the cluster */
//   const doMapReduce = (cb) => {
//     distribution.regex.store.get(null, (e, v) => {
//       try {
//         expect(v.length).toBe(dataset.length);
//       } catch (e) {
//         done(e);
//       }

//       const configuration = {keys: v, map: m1, reduce: r1, memory: true};
//       distribution.regex.mr.exec(configuration, (e, v) => {
//         try {
//           console.log(v);
//           console.log(expected);
//           expect(v).toEqual(expect.arrayContaining(expected));
//           done();
//         } catch (e) {
//           done(e);
//         }
//       });
//     });
//   };

//   let cntr = 0;

//   // We send the dataset to the cluster
//   dataset.forEach((o) => {
//     let key = Object.keys(o)[0];
//     let value = o[key];
//     distribution.regex.store.put(value, key, (e, v) => {
//       cntr++;
//       // Once we are done, run the map reduce
//       if (cntr === dataset.length) {
//         doMapReduce();
//       }
//     });
//   });
// });
