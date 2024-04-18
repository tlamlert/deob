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

getURLs['map'] = (url, pageContent) => {
  // // construct output
  // let out = [];
  // rawLinks.forEach((link) => {
  //   let o = {};
  //   let newUrl = new URL(link, base).href;
  //   o[newUrl] = 1;
  //   out.push(o);
  // });
  // return out

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
  return out;
};

getURLs['reduce'] = (url, _count) => {
  return new Promise((resolve, reject) => {
    console.log("getURLs reduce url: ", url);
    // filter out duplicate links
    const out = {}
    global.distribution.crawledURLs.store.get(url, (err, value) => {
      if (err) { // the url has not been crawled
        // the url has not been crawled, crawl  
        global.distribution.uncrawledURLs.store.put(url, url, (err, value) => {
          // store in distribution.uncrawledURLs
          if (err) {
            global.utils.errorLog(err)
            reject(err);
          } else {
            out[url] = null;
            resolve(out);
          }
        })
      } else {
        // the url has been crawled, do nothing
        out[url] = null;
        resolve(out);
      }
    })
  });
};

// =======================================
//          getURL Job
// =======================================

const MAX_NUM_PAGES = 100;

function executeGetURLsWorkflow() {
  global.distribution.rawPageContents.store.get(null, (err, pages) => {
    if (Object.keys(err).length > 0) {
      global.utils.errorLog(err);
      return err;
    }

    // Define the workflow configuration
    const workflowConfig = {
      keys: pages.splice(0, MAX_NUM_PAGES),
      map: getURLs.map,
      reduce: getURLs.reduce,
      memory: true,
    }

    // Perform the crawl map reduce workflow
    global.distribution.workers.mr.exec(workflowConfig, (err, urls) => {
      if (err) {
        global.utils.errorLog(err);
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
