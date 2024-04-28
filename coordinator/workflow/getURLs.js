/**
 * getBookMetadata.js
 *
 * Implements the Map and Reduce functions of the GetBookMetadata workflow
 * https://hackmd.io/I9s_IMAfT4ub5kIkjAwD0w?both#GetBookMetadata-Workflow-orig-getText-Mandy
 */

const workflow = require('.');

// =======================================
//        Map / Reduce Functions
// =======================================

const getURLs = {};

/**
 * Extract URLs from web page content
 * @param {*} url   The page URL to crawl
 * @param {*} _     The page URL to crawl (ignored)
 * @return [(url, 1), ...]
 */
getURLs['map'] = (url, _) => {
  return new Promise((resolve, reject) => {
    global.https.get(url, {rejectUnauthorized: false}, (res) => {
      // Concatenate all data chunk into page content
      let pageContent = '';
      res.on('data', (d) => {
        pageContent += d;
      });
      res.on('end', () => {
        // convert the given url to a directory
        let base;
        if (!url.endsWith('.txt') && !url.endsWith('/')) {
          base = new global.URL(url + '/');
        } else {
          base = new global.URL(url);
        }

        // init dom object
        const dom = new global.JSDOM(pageContent);
        const rawLinks = [...dom.window.document.querySelectorAll('a')];

        // construct output
        let out = [];
        rawLinks.forEach((link) => {
          let o = {};
          o[new global.URL(link, base).href] = 1;
          out.push(o);
        });

        global.distribution.crawledPageURLs.store.put(url, url, ()=>{
          resolve(out);
        });
      });
    });
  });
};

/**
 * Store uncrawled URls in `uncrawled<page-type>URLs`
 * where page-type is either `Page` or `Book`
 * @param {*} url     The URL to store
 * @param {*} _       A list of ones equal to the number of occurrences (ignored)
 * @return (url, null)
 */
getURLs['reduce'] = (url, _count) => {
  return new Promise((resolve, reject) => {
    // Filter out invalid links
    if (!url || !url.startsWith('https://atlas.cs.brown.edu/data/gutenberg/')) {
      global.utils.errorLog(new Error('invalid url received'));
      resolve(null);
      return;
    };

    // Determine databases based on file type
    let uncrawledDatabase;
    let crawledDatabase;
    if (url.endsWith('.txt')) {
      uncrawledDatabase = global.distribution.uncrawledBookURLs;
      crawledDatabase = global.distribution.bookMetadata;
    } else {
      uncrawledDatabase = global.distribution.uncrawledPageURLs;
      crawledDatabase = global.distribution.crawledPageURLs;
    }

    // filter out duplicate links
    const out = {};
    out[url] = null;
    crawledDatabase.store.get(url, (err, value) => {
      if (err) {
        // the url has not been crawled, store in distribution.uncrawledURLs
        uncrawledDatabase.store.put(url, url, (err, value) => {
          if (err) {
            // TODO: sometimes the serialized url is not properly escaped
            // and will refer to a file inside a (nested) directory.
            // We will just ignore the file :| and remove it anyways
            global.utils.errorLog(err);
            console.log(url);
            resolve(out);
          } else {
            resolve(out);
          }
        });
      } else {
        // the url has been crawled, do nothing
        resolve(out);
      }
    });
  });
};

// =======================================
//          getURLs Job
// =======================================

function executeGetURLsWorkflow(config) {
  // Get all crawled URLs from `crawledPageURLs`
  // Note: This assumes that Crawl was run before such that there exists
  // relevant data on the worker nodes
  return new Promise((resolve, reject) => {
    global.distribution.uncrawledPageURLs.store.get(null, (err, uncralwedPageURLs) => {
      // TODO: something might be wrong with this
      // if (err && Object.keys(err).length > 0) {
      //   reject(err);
      // };

      // Define the workflow configuration
      const pageURLsToCrawl = uncralwedPageURLs.splice(0, config.MAX_KEYS_PER_EXECUTION);
      const workflowConfig = {
        keys: pageURLsToCrawl,
        map: getURLs['map'],
        reduce: getURLs['reduce'],
        memory: true,
      };

      // Perform the getURLs map reduce workflow
      global.distribution.uncrawledPageURLs.mr.exec(workflowConfig, (err, _) => {
        if (err && Object.keys(err).length > 0) {
          reject(err);
        }

        // Remove parsed URLs from uncrawledBookURLs
        let numDeleted = 0;
        pageURLsToCrawl.forEach((url) => {
          global.distribution.uncrawledPageURLs.store.del(url, () => {
            numDeleted++;
            if (numDeleted === pageURLsToCrawl.length) {
              resolve(pageURLsToCrawl.length);
            }
          });
        });
      });
    });
  });
}

module.exports = {
  getURLs: getURLs,
  executeGetURLsWorkflow: executeGetURLsWorkflow,
};
