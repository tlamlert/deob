const { getBookMetadata } = require("../../coordinator/getBookMetadata.js");

global.nodeConfig = { ip: "127.0.0.1", port: 7070 };
const distribution = require("../../distribution");
// global.distribution = distribution;
const id = distribution.util.id;

const groupsTemplate = require("../../distribution/all/groups");

const bookMetadataGroup = {};

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

const n1 = { ip: "127.0.0.1", port: 7110 };
const n2 = { ip: "127.0.0.1", port: 7111 };
const n3 = { ip: "127.0.0.1", port: 7112 };

beforeAll((done) => {
  // Define necessary node groups
  bookMetadataGroup[id.getSID(n1)] = n1;
  bookMetadataGroup[id.getSID(n2)] = n2;
  bookMetadataGroup[id.getSID(n3)] = n3;

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
      const bookMetadataConfig = { gid: "bookMetadata" };
      groupsTemplate(bookMetadataConfig).put(
        bookMetadataConfig,
        bookMetadataGroup,
        (e, v) => {
          done();
        }
      );
    });
  });
});

afterAll((done) => {
  // Stop the nodes if they are running
  let remote = { service: "status", method: "stop" };
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

// -----------------------------------------------------------------
// test("getBookMetadata[map] multiline title", (done) => {
//   const url = "url.com";
//   const expected = {};
//   expected[url] =
//     "The Mirror of Literature, Amusement, and Instruction Vol. 19. No. 575 - 10 Nov 1832";
//   const pageContent = `The Project Gutenberg EBook of The Mirror of Literature, Amusement, and
// Instruction, by Various

// This eBook is for the use of anyone anywhere at no cost and with
// almost no restrictions whatsoever.  You may copy it, give it away or
// re-use it under the terms of the Project Gutenberg License included
// with this eBook or online at www.gutenberg.org


// Title: The Mirror of Literature, Amusement, and Instruction
//        Vol. 19. No. 575 - 10 Nov 1832

// Author: Various

// Release Date: April 3, 2004 [EBook #11888]

// Language: English

// Character set encoding: ISO-8859-1

// *** START OF THIS PROJECT GUTENBERG EBOOK THE MIRROR OF LITERATURE ***
// Produced by Jonathan Ingram, Gregory Margo and PG Distributed
// Proofreaders
//   `;
//   const result = getBookMetadata["map"](url, pageContent);
//   expect(result).toEqual(expected);
//   // Note this is kind of betting that the storage is done before it gets here
//   // Could make this into a .then() I think but this is currently working too
//   distribution.bookMetadata.store.get(url, (e, v) => {
//     expect(v).toEqual(expected);
//     expect(e).toBeNull();
//     done();
//   });
// });

test("getBookMetadata[map] multiline title", (done) => {
  const url = "url.com";
  const expected = {};
  expected[url] =
    "The Mirror of Literature, Amusement, and Instruction Vol. 19. No. 575 - 10 Nov 1832";
  const pageContent = `The Project Gutenberg EBook of The Mirror of Literature, Amusement, and
Instruction, by Various

This eBook is for the use of anyone anywhere at no cost and with
almost no restrictions whatsoever.  You may copy it, give it away or
re-use it under the terms of the Project Gutenberg License included
with this eBook or online at www.gutenberg.org


Title: The Mirror of Literature, Amusement, and Instruction
       Vol. 19. No. 575 - 10 Nov 1832

Author: Various

Release Date: April 3, 2004 [EBook #11888]

Language: English

Character set encoding: ISO-8859-1

*** START OF THIS PROJECT GUTENBERG EBOOK THE MIRROR OF LITERATURE ***
Produced by Jonathan Ingram, Gregory Margo and PG Distributed
Proofreaders
  `;
  // const result = getBookMetadata["map"](url, pageContent);
  // expect(result).toEqual(expected);
  // Note this is kind of betting that the storage is done before it gets here
  // Could make this into a .then() I think but this is currently working too
  Promise.resolve(getBookMetadata['map'](url, pageContent)).then((result) => {
    distribution.bookMetadata.store.get(url, (e, v) => {
      expect(result).toEqual(expected);
      expect(e).toBeNull();
      done();
    })
  });
});

test("getBookMetadata[map] simple title", (done) => {
  const url2 = "url2.com";
  const expected = {};
  expected[url2] = "U.S. Copyright Renewals, 1961 January - June";
  const pageContent = `The Project Gutenberg eBook of U.S. Copyright Renewals, 1961 January - June

  This eBook is for the use of anyone anywhere at no cost and with
  almost no restrictions whatsoever.  You may copy it, give it away or
  re-use it under the terms of the Project Gutenberg License included
  with this eBook or online at www.gutenberg.org
  
  
  Title: U.S. Copyright Renewals, 1961 January - June
  
  Author: U.S. Copyright Office
  
  Release Date: March 30, 2004 [EBook #11823]
  
  Language: English
  
  Character set encoding: ISO-8859-1
      `;
  // const result = getBookMetadata["map"](url2, pageContent);
  Promise.resolve(getBookMetadata['map'](url2, pageContent)).then((result) => {
    expect(result).toEqual(expected);
    done();
  });
});

test("getBookMetadata[map] no title", (done) => {
  const url = "url.com";
  const expected = {
    "url.com": "N/A",
  };
  const pageContent = `The Project Gutenberg eBook of U.S. Copyright Renewals, 1961 January - June
  
    This eBook is for the use of anyone anywhere at no cost and with
    almost no restrictions whatsoever.  You may copy it, give it away or
    re-use it under the terms of the Project Gutenberg License included
    with this eBook or online at www.gutenberg.org
    
    Author: U.S. Copyright Office
    
    Release Date: March 30, 2004 [EBook #11823]
        `;
  // const result = getBookMetadata["map"](url, pageContent);
  Promise.resolve(getBookMetadata['map'](url, pageContent)).then((result) => {
    expect(result).toEqual(expected);
    done();
  });
});

test("getBookMetadata[reduce]", (done) => {
  const expected = {
    "url.com": "U.S. Copyright Renewals, 1961 January - June",
  };
  const result = getBookMetadata["reduce"](
    "url.com",
    "U.S. Copyright Renewals, 1961 January - June"
  );
  expect(result).toEqual(expected);
  done();
});
