/**
 * crawl.js 
 * 
 * Implements the Map and Reduce functions of the crawling workflow
 * https://hackmd.io/I9s_IMAfT4ub5kIkjAwD0w?view#Crawler-Workflow-Tiger
 */

// =======================================
//        Map / Reduce Functions
// =======================================

const { getBookMetadata } = require('./getBookMetadata');
const { getURLs } = require('./getURLs');

const crawl = {};

crawl['map'] = (url, _) => {
  /**
   * - Download the page content using https.get
   * - If it is a book (ending in .txt), we store the content
   * in rawBookContents.store(value=pagecontent, key=url)
   * - If it is not a book, we store the content in
   * rawPageContents.store(value=pageContent, key=url)
   * 
   * Output: (url, 1)
   * NOTE: value 1 is a dummy variable
   */
  return new Promise((resolve) => {
    global.https.get(url, { rejectUnauthorized: false }, (res) => {
      // Concatenate all data chunk into page content
      let pageContent = '';
      res.on('data', (d) => {
        pageContent += d;
      });
      res.on('end', () => {
        // Determine where to store the page content
        let targetDatabase;
        let out;
        if (url.endsWith('.txt')) {
            out = getBookMetadata.map(url, pageContent);  
          targetDatabase = global.distribution.rawBookContents;
        } else {

          targetDatabase = global.distribution.rawPageContents;
        }

        // TODO: pageContent might be too large to be sent over HTTP
        // might need to configure the server to allow a larger size
        const MAX_PAGE_SIZE = 900;
        pageContent = pageContent.substring(0, MAX_PAGE_SIZE);
        console.log("typeof pageContent : ", typeof pageContent);
        console.log("typeof url : ", typeof url);

        // Store the page content on the appropriate database
        targetDatabase.store.put(pageContent, url, (e,v) => {
          if (e && Object.keys(e).length) {
            console.log(e);
          }

          let out = {};
          out[url] = 1;
          resolve(out);
        });
      });
    });
  });
};

crawl['reduce'] = (url, _count) => {
  /**
   * Count the total number of URLs. Totalcount should be 1 given that input URLs are distinct
   * 
   * Output: (url, totalCount)
   */
  let out = {};
  out[url] = _count.reduce((a, b) => a + b, 0);
  return out;
};

// =======================================
//          Crawler Job
// =======================================

// Job Configuration
const MAX_NUM_URLS = 100;

function executeCrawlWorkflow() {
  // Get all uncralwed URLs from `uncrawledURLs` 
  console.log('executing crawl workflow');
  global.distribution.uncrawledURLs.store.get(null, (err, uncrawledURLs) => {
    if (Object.keys(err).length > 0) {
      console.error("executeCrawlWorkflow 1 ", err);
      return err;
    }

    // Workflow configuration
    const workflowConfig = {
      keys: uncrawledURLs.splice(0, MAX_NUM_URLS),
      map: crawl.map,
      reduce: crawl.reduce,
      memory: true,
    }

    // Perform the mr workflow
    global.distribution.workers.mr.exec(workflowConfig, (err, cralwedURLs) => {
      if (err && Object.keys(err) > 0) {
        console.error("executeCrawlWorkflow 2", err);
        return err;
      }

      // Remove crawled URLs from uncrawledURLs
      cralwedURLs.forEach((url) => {
        global.distribution.uncrawledURLs.store.del(url, () => {});
      })
    });
  });
}

module.exports = {
  crawl: crawl,
  executeCrawlWorkflow: executeCrawlWorkflow,
}