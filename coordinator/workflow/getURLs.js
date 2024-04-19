/**
 * getBookMetadata.js
 *
 * Implements the Map and Reduce functions of the GetBookMetadata workflow
 * https://hackmd.io/I9s_IMAfT4ub5kIkjAwD0w?both#GetBookMetadata-Workflow-orig-getText-Mandy
 */

// =======================================
//        Map / Reduce Functions
// =======================================

const getURLs = {};

getURLs['map'] = (url, _) => {
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
        // convert the given url to a directory
        if (!url.endsWith('.html') && !url.endsWith('/')) {
          url += '/';
        }
        const base = new global.URL(url);

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
        resolve(out);
      });
    });
  });
};

getURLs['reduce'] = (url, _count) => {
  return new Promise((resolve, reject) => {
    console.log('getURLs reduce url: ', url);
    // Determine databases based on file type
    let uncrawledDatabase;
    let crawledDatabase;
    if (url.endsWith('.txt')) {
      uncrawledDatabase = global.distribution.uncrawledBookURLs;
      crawledDatabase = global.distribution.bookMetadata;
    } else {
      uncrawledDatabase = global.distribution.uncrawledPageURLs;
      crawledDatabase = global.distribution.crawledURLs;
    }

    // filter out duplicate links
    const out = {};
    crawledDatabase.store.get(url, (err, value) => {
      console.log('err: ', err, value);
      if (err) { // the url has not been crawled
        console.log('The url has not been crawled');

        // the url has not been crawled, crawl
        uncrawledDatabase.store.put(url, url, (err, value) => {
          // store in distribution.uncrawledURLs
          if (err && Object.keys(err).length > 0) {
            console.log('uncrawledURLs put error');
            global.utils.errorLog(err);
            reject(err);
          } else {
            console.log('uncrawledURLs put success', value);
            out[url] = null;
            resolve(out);
          }
        });
      } else {
        // the url has been crawled, do nothing
        console.log('the url has been crawled, do nothing');
        out[url] = null;
        resolve(out);
      }
    });
  });
};

// =======================================
//          getBookMetadata Job
// =======================================

function executeGetURLsWorkflow(config) {
  // Get all crawled URLs from `crawledURLs`
  // Note: This assumes that Crawl was run before such that there exists
  // relevant data on the worker nodes
  global.distribution.uncrawledPageURLs.store.get(null, (err, uncralwedPageURLs) => {
    // TODO: something might be wrong with this
    // if (err && Object.keys(err).length > 0) {
    //   global.utils.errorLog(err);
    //   return err;
    // };

    // Define the workflow configuration
    const pageURLsToCrawl = uncralwedPageURLs.splice(0, config.MAX_KEYS_PER_EXECUTION);
    const workflowConfig = {
      keys: pageURLsToCrawl,
      map: getURLs['map'],
      reduce: getURLs['reduce'],
      memory: true,
    };

    // Perform the getBookMetadata map reduce workflow
    global.distribution.uncrawledPageURLs.mr.exec(workflowConfig, (err, _) => {
      if (err && Object.keys(err).length > 0) {
        return err;
      }

      // Remove parsed URLs from uncrawledBookURLs
      pageURLsToCrawl.forEach((url) => {
        global.distribution.uncrawledPageURLs.store.del(url, () => {});
      });
    });
  });
}

module.exports = {
  getURLs: getURLs,
  executeGetURLsWorkflow: executeGetURLsWorkflow,
};
