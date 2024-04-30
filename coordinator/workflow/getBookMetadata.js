/**
 * getBookMetadata.js
 *
 * Implements the Map and Reduce functions of the GetBookMetadata workflow
 * https://hackmd.io/I9s_IMAfT4ub5kIkjAwD0w?both#GetBookMetadata-Workflow-orig-getText-Mandy
 */

// =======================================
//        Map / Reduce Functions
// =======================================

const getBookMetadata = {};

/**
 * Extract metadata from book page content
 * and store it in `bookMetadata`
 * @param {*} url   The book URL to crawl
 * @param {*} _     The book URL to crawl (ignored)
 * @return (url, metadata)
 */
getBookMetadata['map'] = (url, _) => {
  return new Promise((resolve, reject) => {
    // TODO: execution time might vary
    global.https.get(url, {rejectUnauthorized: false}, (res) => {
      // Concatenate all data chunk into page content
      let pageContent = '';
      res.on('data', (d) => {
        pageContent += d;
      });
      res.on('end', () => {
        // Get regex match
        const regex = /Title:(.*?)(?=Author:)/s;
        const match = pageContent.match(regex);

        let out = {};
        if (match) {
          // Make the title on one line
          const title = match[1].trim();
          out[url] = title;
          // Only store if regex match can be found
          global.distribution.bookMetadata.store.put(title, url, (e, v) => {
            resolve(out);
          });
        } else {
          // If we can't find the regex, ignore this file
          out[url] = null;
          resolve(out);
        }
      });
    });
  });
};

/**
 * Do nothing.
 * Output: (url, metadata)
 * @param {*} key 
 * @param {*} values 
 * @returns 
 */
getBookMetadata['reduce'] = (key, values) => {
  let out = {};
  out[key] = values;
  return out;
};

// =======================================
//          getBookMetadata Job
// =======================================

function executeGetBookMetadataWorkflow(config) {
  // Get all crawled URLs from `crawledPageURLs`
  // Note: This assumes that Crawl was run before such that there exists
  // relevant data on the worker nodes
  return new Promise((resolve, reject) => {
    global.distribution.uncrawledBookURLs.store.get(null, (err, uncralwedBookURLs) => {
      if (err && Object.keys(err).length > 0) {
        reject(err);
        return;
      }
      if (uncralwedBookURLs.length == 0) {
        resolve(0);
        return;
      }

      // Define the workflow configuration
      const workflowConfig = {
        keys: uncralwedBookURLs.splice(0, config.MAX_KEYS_PER_EXECUTION),
        map: getBookMetadata['map'],
        reduce: getBookMetadata['reduce'],
        memory: true,
      };

      // Perform the getBookMetadata map reduce workflow
      global.distribution.uncrawledBookURLs.mr.exec(workflowConfig, (err, bookMetadata) => {
        if (err && Object.keys(err).length > 0) {
          reject(err);
          return;
        }
        const crawledBookURLs = bookMetadata.map(Object.keys).flat();
        if (crawledBookURLs.length == 0) {
          resolve(0);
          return;
        }

        // Remove crawled URLs from uncrawledBookURLs
        let numDeleted = 0;
        crawledBookURLs.forEach((url) => {
          global.distribution.uncrawledBookURLs.store.del(url, () => {
            numDeleted++;
            if (numDeleted === crawledBookURLs.length) {
              resolve(crawledBookURLs.length);
            }
          });
        });
      });
    });
  });
}

module.exports = {
  getBookMetadataa: getBookMetadata,
  executeGetBookMetadataWorkflow: executeGetBookMetadataWorkflow,
};
