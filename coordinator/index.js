/**
 * index.js 
 * 
 * Implements the Map and Reduce functions of the N-Gram / Indexing workflow
 * https://hackmd.io/I9s_IMAfT4ub5kIkjAwD0w?view#N-Gram-Workflow--Indexing-Workflow-Helen
 */

const utils = require('./utils')

// =======================================
//        Map / Reduce Functions
// =======================================

const index = {};

index[map] = (url, bookMetadata) => {
  // NOTE: bookMetadata is a string
  return utils.preprocess(bookMetadata);
}

index[reduce] = (ngram, urls) => {
  // TODO: Count the number of urls

  // TODO: Store/return (ngram, [(url_1, count_1), (url_2, count_2), ...])
}

// =======================================
//          Indexing Job
// =======================================

function executeIndexingWorkflow() {
  // TODO: refer to executeCrawlWorkflow
}

module.exports = {
  index: index,
  executeIndexingWorkflow: executeIndexingWorkflow,
}
