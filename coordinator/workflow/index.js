/**
 * index.js
 *
 * Implements the Map and Reduce functions of the N-Gram / Indexing workflow
 * https://hackmd.io/I9s_IMAfT4ub5kIkjAwD0w?view#N-Gram-Workflow--Indexing-Workflow-Helen
 */

const workflow = require('../endpoint/workflow');

// =======================================
//        Map / Reduce Functions
// =======================================

const index = {};

/**
 * Takes a url and corresponding bookMetadata and outputs a list of
 * ngram-url pairs. These pairs are of type list.
 *
 * Note: bookMetadata will be 'N/A' if the URL doesn't have metadata
 *
 * @param {*} url : website URL
 * @param {*} bookMetadata : String corresponding to url
 * @return List of ngram-url pairs (i.e. [[ngram, url], ...] )
 */
index['map'] = (url, bookMetadata) => {
  console.log(url, bookMetadata);
  const ngrams = global.utils.preprocess(bookMetadata);
  const out = [];
  ngrams.forEach((ngram) => {
    const o = {};
    o[ngram] = url;
    out.push(o);
  });
  return out;
};

/**
 * Takes an ngram and list of urls containing ngram, and outputs
 * an object mapping ngram -> list of [url_i, count_i]
 *
 * @param {*} ngram : string
 * @param {*} urls  : list of urls (i.e. list of strings). There can be duplicate urls.
 * @return Object of form: { ngram : [ [url, count], ... ] }, but in distributed.store, we just store
 * the [[url, count], ... ] part, and its key is the ngram.
 */
index['reduce'] = (ngram, urls) => {
  return new Promise((resolve) => {
    global.utils.statsLog(
        `${ngram},${urls}`,
        `data/stats/ngram.csv`,
    );
    // Get existing [(url,count), ...] object if it exists
    global.distribution.invertedMetadata.store.get(ngram, (e, oldURLs) => {
      const urlToCount = {};

      // Received oldURLS. Populate urlToCount with existing urls/counts
      if (oldURLs && Object.keys(oldURLs).length > 0) {
        for (const urlCount of oldURLs) {
          urlToCount[urlCount[0]] = urlCount[1];
        }
      }

      // Update urlToCount with new urls
      for (const url of urls) {
        if (!urlToCount.hasOwnProperty(url)) {
          urlToCount[url] = 1;
        } else {
          urlToCount[url]++;
        }
      }

      // Format results : [[url_1, count_1], [url_2, count_2], ...]
      const res = [];
      for (const [url, count] of Object.entries(urlToCount)) {
        res.push([url, count]);
      }

      // Optional : Sort list here instead of query; but this would introduce a lot more
      //  computation, so maybe not.
      // res.sort((a, b) => b[1] - a[1]);

      // Store results as [[url, count], ... ]
      global.distribution.invertedMetadata.store.put(res, ngram, (e, v) => {
        if (e && Object.keys(e).length > 0) {
          console.error(e);
        }


        // Return as { ngram : [ [url, count], ... ] } (needed to conform to existing API)
        const out = {};
        out[ngram] = res;
        resolve(out);
      });
    });
  });
};

// =======================================
//          Indexing Job
// =======================================

function executeIndexingWorkflow(config) {
  // Get all book metadata from `bookMetadata`
  return new Promise((resolve, reject) => {
    global.distribution.bookMetadata.store.get(null, (err, metadatas) => {
      if (err && Object.keys(err).length > 0) {
        reject(err);
        return;
      }

      // Workflow configuration
      const workflowConfig = {
        keys: metadatas.splice(0, config.MAX_KEYS_PER_EXECUTION),
        map: index.map,
        reduce: index.reduce,
        memory: true,
      };

      if (workflowConfig.keys.length == 0) {
        reject(new Error('null keys'));
        return;
      }

      // Perform the mr workflow
      global.distribution.bookMetadata.mr.exec(workflowConfig, (err, metadatas) => {
        if (err) {
          console.error('Indexing workflow error: ' + err);
          reject(err);
        } else {
          // Delete processed metadatas
          const processedMetadatas = metadatas.map(Object.keys).flat();
          let numDeleted = 0;
          processedMetadatas.forEach((metadata) => {
            global.distribution.bookMetadata.store.del(metadata, () => {
              numDeleted++;
              if (numDeleted === processedMetadatas.length) {
                resolve(workflowConfig.keys.length);
              }
            });
          });
        }
      });
    });
  });
}

module.exports = {
  index: index,
  executeIndexingWorkflow: executeIndexingWorkflow,
};
