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

getBookMetadata["map"] = (url, pageContent) => {
  /**
   * Extract metadata from book page content
   *  Store metadata in `bookMetadata`
   *  output: (url, metadata)
   * */
  const regex = /Title:(.*?)(?=Author:)/s;
  const match = regex.exec(pageContent);
  let out = {};
  if (match) {
    let titleText = match[1].trim();
    // Make the title on one line
    titleText = titleText.replace(/[\n\t]/g, " ");
    titleText = titleText.replace(/\s+/g, " ");
    out[url] = titleText;
    // Only store if regex match can be found
    global.distribution.bookMetadata.store.put(out, url, (e, v) => {
      console.log("getBookMetadata Map Error:", e);
      console.log("getBookMetadata Map Value:", v);
    });
  } else {
    // If we can't find the regex, ignore this file
    out[url] = "N/A";
  }
  return out;
};

getBookMetadata["reduce"] = (key, values) => {
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

// Job Configuration
const MAX_NUM_URLS = 100;

function executeGetBookMetadataWorkflow() {
  // Get all crawled URLs from `crawledURLs`
  // Note: This assumes that Crawl was run before such that there exists
  // relevant data on the worker nodes
  global.distribution.crawledURLs.store.get(null, (err, crawledURLs) => {
    if (err) {
      console.error(err);
      return err;
    }

    // Define the workflow configuration
    const workflowConfig = {
      keys: crawledURLs.splice(MAX_NUM_URLS),
      map: getBookMetadata.map,
      reduce: getBookMetadata.reduce,
      memory: true,
    };

    // Perform the getBookMetadata map reduce workflow
    global.distribution.workers.exec(workflowConfig, (err, bookMetadata) => {
      if (err) {
        console.error(err);
        return err;
      }
    });
  });
}

module.exports = {
  getBookMetadata: getBookMetadata,
  executeGetBookMetadataWorkflow: executeGetBookMetadataWorkflow,
};
