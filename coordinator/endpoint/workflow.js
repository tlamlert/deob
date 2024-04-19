// =======================================
//          Workflow configuration
// =======================================

const defaultConfig = {
  TIME_BETWEEN_JOBS: 1000, // seconds
  MAX_KEYS_PER_EXECUTION: 100, // number of keys
};

// const {executeGetURLsWorkflow} = require('../workflow/getURLs.js');
const {executeGetBookMetadataWorkflow} = require('../workflow/getBookMetadata.js');
const {executeIndexingWorkflow} = require('../workflow/index.js');

const crawlerWorkflows = [
  // {name: 'getURLsWorkflow', exec: executeGetURLsWorkflow},
  {name: 'getBookMetadataWorkflow', exec: executeGetBookMetadataWorkflow},
  {name: 'indexWorkflow', exec: executeIndexingWorkflow},
];

// =======================================
//          Workflow endpoints
// =======================================

// Shared variables should be defined here
const jobIDs = [];

// Functions that will be called at different endpoints
function startWorkflow() {
  crawlerWorkflows.forEach((workflow) => {
    let isRunning = false;
    const jobID = setInterval(() => {
      if (!isRunning) {
        console.log(`\x1b[31m ${workflow.name} \x1b[0m`);
        isRunning = true;
        workflow.exec(defaultConfig, () => {
          isRunning = false;
        });
      }
    }, defaultConfig.TIME_BETWEEN_JOBS);
    jobIDs.push(jobID);
  });
  return 'All crawler workflows have been started';
}

function stopWorkflow() {
  jobIDs.forEach(clearInterval);
  jobIDs.length = 0;
  return 'All crawler workflows have been stopped';
}

function workflowStats() {
  return 'Not yet implemented';
}

module.exports = {
  startWorkflow: startWorkflow,
  stopWorkflow: stopWorkflow,
  workflowStats: workflowStats,
};
