/**
 * crawl.js 
 * 
 * Implements the Map and Reduce functions of the crawling workflow
 * https://hackmd.io/I9s_IMAfT4ub5kIkjAwD0w?view#Crawler-Workflow-Tiger
 */

// =======================================
//        Map / Reduce Functions
// =======================================

const crawlAndMap = {};

crawlAndMap['map'] = (url, _) => {
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
    const getBookMetadataMap = (url, pageContent) => {
      /**
       * Extract metadata from book page content
       *  Store metadata in `bookMetadata`
       *  output: (url, metadata)
       * */
      console.log("Here")
      const regex = /Title:(.*?)(?=Author:)/s;
      const match = regex.exec(pageContent);
      let out = {};
      if (match) {
        let titleText = match[1].trim();
        // Make the title on one line
        titleText = titleText.replace(/[\n\t]/g, " ");
        titleText = titleText.replace(/\s+/g, " ");
        out[url] = titleText;
        console.log("titleText: ", titleText)
        // Only store if regex match can be found
        return new Promise((resolve) => {
          global.distribution.bookMetadata.store.put(out, url, (e, v) => {
            console.log("getBookMetadata Map Error:", e);
            console.log("getBookMetadata Map Value:", v);
            resolve(out);
          });
        })
      } else {
        // If we can't find the regex, ignore this file
        console.log("titleText GOT NOTHING")
        out[url] = "N/A";
        return out;
      }
    };

    const getURLsMap = (url, pageContent) => {
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

    global.https.get(url, { rejectUnauthorized: false }, (res) => {
      // Concatenate all data chunk into page content
      let pageContent = '';
      res.on('data', (d) => {
        pageContent += d;
      });
      res.on('end', () => {
        // Determine where to store the page content
        if (url.endsWith('.txt')) {
          resolve(getBookMetadataMap(url, pageContent));
        } else {
          resolve(getURLsMap(url, pageContent));
        }

        // // TODO: pageContent might be too large to be sent over HTTP
        // // might need to configure the server to allow a larger size
        // const MAX_PAGE_SIZE = 900;
        // pageContent = pageContent.substring(0, MAX_PAGE_SIZE);

        // // Store the page content on the appropriate database
        // targetDatabase.store.put(pageContent, url, (e,v) => {
        //   if (e && Object.keys(e).length) {
        //     console.log(e);
        //   }

        //   let out = {};
        //   out[url] = 1;
        //   resolve(out);
        // });
      });
    });
  });
};

crawlAndMap['reduce'] = (url, value) => {
  /**
   * Count the total number of URLs. Totalcount should be 1 given that input URLs are distinct
   * 
   * Output: (url, totalCount)
   */
  const getBookMetadataReduce = (key, values) => {
    let out = {};
    out[key] = values;
    return out;
  };

  const getURLsReduce = (url, _count) => {
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
  
  if (url.endsWith('.txt')) {
    return getBookMetadataReduce(url, value);
  } else {
    return getURLsReduce(url, value);
  }
};

// =======================================
//          Crawler Job
// =======================================

// Job Configuration
const MAX_NUM_URLS = 100;

function executeCrawlAndMapWorkflow(cb=()=>{}) {
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
      map: crawlAndMap.map,
      reduce: crawlAndMap.reduce,
      memory: true,
    }

    // Perform the mr workflow
    global.distribution.uncrawledURLs.mr.exec(workflowConfig, (err, output) => {
      if (err && Object.keys(err) > 0) {
        console.error("executeCrawlWorkflow 2", err);
        return err;
      }

      const cralwedURLs = output.map((o) => Object.keys(o)).flat();
      console.log(`cralwedURLs: `, cralwedURLs);
      let counter = cralwedURLs.length;

      // Remove crawled URLs from uncrawledURLs
      cralwedURLs.forEach((url) => {
        global.distribution.uncrawledURLs.store.del(url, () => {
          counter -= 1;
          if (counter == 0) {
            cb();
          }
        });
      })
    });
  });
}

module.exports = {
  crawlAndMap: crawlAndMap,
  executeCrawlAndMapWorkflow: executeCrawlAndMapWorkflow,
}
