/**
 * getURLs.js 
 * 
 * Implements the Map and Reduce functions of the GetURLs workflow
 * https://hackmd.io/I9s_IMAfT4ub5kIkjAwD0w?view#GetURLs-Workflow-JZ
 */

// =======================================
//        Map / Reduce Functions
// =======================================

const getURLs = {};

getURLs[map] = (url, pageContent) => {
  // convert the given url to a directory
  const base = new global.URL(url);

  // init dom object
  const dom = new global.JSDOM(pageContent);
  const rawLinks = [...dom.window.document.querySelectorAll('a')];

  // construct output
  let out = [];
  rawLinks.forEach((link) => {
    let o = {};
    let newUrl = new URL(link, base).href;
    o[newUrl] = 1;
    out.push(o);
  });
  return out;
};

getURLs[reduce] = (url, _count) => {
  // filter out duplicate links
  out = {}
  distribution.crawledURLs.store.get(url, (err, value) => {
    if (err) {
      // the url has not been crawled, crawl  
      distribution.uncrawledURLs.store.put(url, url, (err, value) => {
        // store in distribution.uncrawledURLs
        global.distribution.util.errorLog(err)
        out[url] = null;
      })
    }
  })
  return out;
};

// =======================================
//          getURL Job
// =======================================

const MAX_NUM_PAGES = 100;

function executeGetURLsWorkflow() {
  global.distribution.rawPageContents.store.get(null, (err, pages) => {
    if (err) {
      global.distribution.util.errorLog(err);
      return err;
    }

    // Define the workflow configuration
    const workflowConfig = {
      keys: pages.splice(MAX_NUM_PAGES),
      map: getURLs.map,
      reduce: getURLs.reduce,
      memory: true,
    }

    // Perform the crawl map reduce workflow
    global.distribution.workers.exec(workflowConfig, (err, urls) => {
      if (err) {
        global.distribution.util.errorLog(err);
        return err;
      }

      // ignore urls of rawPageContents
    })
  })
}

module.exports = {
  getURLs: getURLs,
  executeGetURLsWorkflow: executeGetURLsWorkflow,
}
