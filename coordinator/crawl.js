/**
 * crawl.js 
 * 
 * Implements the Map and Reduce functions of the crawling workflow
 * https://hackmd.io/I9s_IMAfT4ub5kIkjAwD0w?view#Crawler-Workflow-Tiger
 */

// =======================================
//        Map / Reduce Functions
// =======================================

const crawl = {};

crawl[map] = (url, _) => {
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
    global.https.get(url, (res) => {
      // Concatenate all data chunk into page content
      let pageContent = '';
      res.on('data', (d) => {
        pageContent += d;
      });
      res.on('end', () => {
        // Determine where to store the page content
        let targetDatabase;
        if (url.endsWith('.txt')) {
          targetDatabase = global.distribution.rawBookContents;
        } else {
          targetDatabase = global.distribution.rawPageContents;
        }

        // Store the page content on the appropriate database
        targetDatabase.store.put(pageContent, url, ()=>{
          let out = {};
          out[url] = 1;
          resolve(out);
        });
      });
    });
  });
};

crawl[reduce] = (url, _count) => {
  /**
   * Count the total number of URLs. Totalcount should be 1 given that input URLs are distinct
   * 
   * Output: (url, totalCount)
   */
  let out = {};
  out[key] = values.reduce((a, b) => a + b, 0);
  return out;
};

// =======================================
//          Crawler Job
// =======================================

// Job Configuration
const MAX_NUM_URLS = 100;

function executeCrawlWorkflow() {
  // Get all uncralwed URLs from `uncrawledURLs` 
  global.distribution.uncrawledURLs.store.get(null, (err, uncrawledURLs) => {
    if (err) {
      console.error(err);
      return err;
    }

    // Workflow configuration
    const workflowConfig = {
      keys: uncrawledURLs.splice(MAX_NUM_URLS),
      map: crawl.map,
      reduce: crawl.reduce,
      memory: true,
    }

    // Perform the mr workflow
    global.distribution.workers.exec(workflowConfig, (err, cralwedURLs) => {
      if (err) {
        console.error(err);
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