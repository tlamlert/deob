/**
 * index.js 
 * 
 * Implements the Map and Reduce functions of the N-Gram / Indexing workflow
 * https://hackmd.io/I9s_IMAfT4ub5kIkjAwD0w?view#N-Gram-Workflow--Indexing-Workflow-Helen
 */


// =======================================
//        Map / Reduce Functions
// =======================================

const index = {};

/**
 * Takes a url and corresponding bookMetadata and outputs a list of
 * ngram-url pairs. These pairs are of type list.
 * 
 * @param {*} url : website URL
 * @param {*} bookMetadata : String corresponding to url
 * @returns List of ngram-url pairs (i.e. [[ngram, url], ...] )
 */
index['map'] = (url, bookMetadata) => {
  const ngrams = global.utils.preprocess(bookMetadata);
  const out = [];
  ngrams.forEach((ngram) => {
    const o = {};
    o[ngram] = url;
    out.push(o);
  });
  return out;
}

/**
 * Takes an ngram and list of urls containing ngram, and outputs
 * an object mapping ngram -> list of [url_i, count_i]
 * 
 * @param {*} ngram : string
 * @param {*} urls  : list of urls (i.e. list of strings). There can be duplicate urls.
 * @returns Object of form: { ngram : [ [url, count], ... ] }, but in distributed.store, we just store 
 * the [[url, count], ... ] part, and its key is the ngram.
 */
index['reduce'] = (ngram, urls) => {
  return new Promise((resolve) => {
    // Get existing [(url,count), ...] object if it exists
    global.distribution.invertedIndex.store.get(ngram, (e, oldURLs) => {
      const urlToCount = {} ;

      // Received oldURLS. Populate urlToCount with existing urls/counts
      if (!e) {
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
    
      // TODO: Sort list
      // res.sort((a, b) => b[1] - a[1]);
      
      // Store results as [[url, count], ... ]
      global.distribution.invertedIndex.store.put(res, ngram, (e, v) => {
        if (e) {
          global.utils.errorLog(e);
        }

        // Return as { ngram : [ [url, count], ... ] } (needed to conform to existing API)
        const out = {};
        out[ngram] = res;
        resolve(out);
      })
    })
  })
}

// =======================================
//          Indexing Job
// =======================================

function executeIndexingWorkflow() {
  const MAX_NUM_METADATAS = 100;

  // Get all book metadata from `bookMetadata`
  global.distribution.bookMetadata.store.get(null, (err, metadatas) => {
    if (err) {
      global.utils.errorLog(err);
      return err;
    }

    // Workflow configuration
    const workflowConfig = {
      keys: metadatas.splice(MAX_NUM_METADATAS),
      map: index.map,
      reduce: index.reduce,
      memory: true,
    }

    // Perform the mr workflow
    global.distribution.workers.exec(workflowConfig, (err, metadatas) => {
      if (err) {
        console.error(err);
        return err;
      }
    })
  })
}

module.exports = {
  index: index,
  executeIndexingWorkflow: executeIndexingWorkflow,
}
