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

getBookMetadata['map'] = (url, _) => {
  /**
   * Extract metadata from book page content
   *  Store metadata in `bookMetadata`
   *  output: (url, metadata)
   * */
  return new Promise((resolve) => {
    global.https.get(url, {rejectUnauthorized: false}, (res) => {
      // Concatenate all data chunk into page content
      let pageContent = '';
      res.on('data', (d) => {
        pageContent += d;
      });
      res.on('end', () => {
        // Get regex match
        const regex = /Title:(.*?)(?=Author:)/s;
        const match = regex.exec(pageContent);

        let out = {};
        if (match) {
          // Make the title on one line
          let titleText = match[1].trim();
          titleText = titleText.replace(/[\n\t]/g, ' ');
          titleText = titleText.replace(/\s+/g, ' ');
          out[url] = titleText;
          // Only store if regex match can be found
          global.distribution.bookMetadata.store.put(titleText, url, (e, v) => {
            resolve(out);
          });
        } else {
          // If we can't find the regex, ignore this file
          out[url] = 'N/A';
          resolve(out);
        }
      });
    });
  });
};

getBookMetadata['reduce'] = (key, values) => {
  /**
   * Do nothing.
   * Output: (url, metadata)
   */
  let out = {};
  out[key] = values;
  return out;
};

// =======================================
//          getBookMetadata Job
// =======================================

function executeGetBookMetadataWorkflow(config) {
  // Get all crawled URLs from `crawledURLs`
  // Note: This assumes that Crawl was run before such that there exists
  // relevant data on the worker nodes
  return new Promise((resolve, reject) => {
    global.distribution.uncrawledBookURLs.store.get(null, (err, uncralwedBookURLs) => {
      if (err && Object.keys(err).length > 0) {
        reject(err);
      };
  
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
        }
  
        // Remove parsed URLs from uncrawledBookURLs
        const crawledBookURLs = bookMetadata.map(Object.keys).flat();
        crawledBookURLs.forEach((url) => {
          global.distribution.uncrawledBookURLs.store.del(url, () => { resolve(crawledBookURLs.length) });
        });
      });
    });
  });
}

module.exports = {
  getBookMetadataa: getBookMetadata,
  executeGetBookMetadataWorkflow: executeGetBookMetadataWorkflow,
};
