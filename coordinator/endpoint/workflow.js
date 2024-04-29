const {performance} = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// =======================================
//          Workflow configuration
// =======================================

const defaultConfig = {
  TIME_BETWEEN_JOBS: 1000, // milliseconds
  MAX_KEYS_PER_EXECUTION: 35, // number of keys per invocation
};

const {executeGetURLsWorkflow} = require('../workflow/getURLs.js');
const {executeGetBookMetadataWorkflow} = require('../workflow/getBookMetadata.js');
const {executeIndexingWorkflow} = require('../workflow/index.js');

// The list of workflows to be executed
const crawlerWorkflows = [
  {name: 'getURLsWorkflow', exec: executeGetURLsWorkflow},
  {name: 'getBookMetadataWorkflow', exec: executeGetBookMetadataWorkflow},
  {name: 'indexWorkflow', exec: executeIndexingWorkflow},
];

// =======================================
//          Workflow endpoints
// =======================================

// Shared variables should be defined here
const jobIDs = [];

function startWorkflow() {
  if (jobIDs.length > 0) {
    return 'Crawler workflows are currently running';
  }

  crawlerWorkflows.forEach((workflow) => {
    // Variables used across all invocations
    let isRunning = false;

    // Set up a recurring job
    const jobID = setInterval(() => {
      // If this workflow is currently running, do nothing
      if (isRunning) {
        console.log(`\x1b[31m ${workflow.name} is currenly running, skipping this execution \x1b[0m`);
        return;
      }
      isRunning = true;

      // Otherwise, execute the workflow and log statistics to file
      console.log(`\x1b[31m ${workflow.name} \x1b[0m`);
      const startTime = performance.now();
      Promise.resolve(workflow.exec(defaultConfig)).then(
          (numKeysProcessed) => {
          // TODO: instead of returning the number of keys processed,
          // each workflow execution function can return self-defined stats objects
            isRunning = false;
            const executionTime = performance.now() - startTime;
            global.utils.statsLog(
                `${startTime},${executionTime},${numKeysProcessed}`,
                `data/stats/${workflow.name}.csv`,
            );
          },
          (err) => {
          // TODO: Better error handling than just printing it out??
            isRunning = false;
            global.utils.errorLog(err, `data/error/${workflow.name}.txt`);
          },
      );
    }, defaultConfig.TIME_BETWEEN_JOBS);
    jobIDs.push(jobID);
  });
  return 'Crawler workflows have been started';
}

function stopWorkflow() {
  jobIDs.forEach(clearInterval);
  jobIDs.length = 0;
  return 'Crawler workflows have been stopped';
}

/**
 * Read crawler statistics from the coordinator.
 * @returns an object containing various statistics
 */
function workflowStats() {
  // TODO: Not the best way to read from file; should read line by line
  const createStatView = function(workflowName) {
    let totalNumberInvocations = null;
    let totalExecutionTime = null;
    let totalNumberKeysProcessed = null;
    let averageExecutionTime = null;
    let averageNumberKeysProcessed = null;
    let numberErrors = null;

    // Gather workflow statistics from `data/error/...`
    const datapath = path.join(__dirname, `../data/stats/${workflowName}.csv`);
    if (fs.existsSync(datapath)) {
      const data = fs.readFileSync(datapath);
      const rows = data
          .toString('utf8')
          .split('\n')
          .map((str) => str.split(','))
          .filter((row) => row.length == 3);

      // Compute total statistics
      totalNumberInvocations = rows.length;
      totalExecutionTime = rows
          .map((row) => parseFloat(row[1]))
          .reduce((a, b) => a + b, 0);
      totalNumberKeysProcessed = rows
          .map((row) => parseFloat(row[2]))
          .reduce((a, b) => a + b, 0);

      // Compute average statistics
      averageExecutionTime = totalExecutionTime / totalNumberInvocations;
      averageNumberKeysProcessed =
        totalNumberKeysProcessed / totalNumberInvocations;
    }

    // Gather workflow statistics from `data/stats/...`
    const errorpath = path.join(__dirname, `../data/error/${workflowName}.txt`);
    if (fs.existsSync(errorpath)) {
      const error = fs.toString('utf8').readFileSync(errorpath);
      numberErrors = error.split('\n').length;
    }

    return {
      totalNumberInvocations: totalNumberInvocations,
      totalExecutionTime: totalExecutionTime,
      totalNumberKeysProcessed: totalNumberKeysProcessed,
      averageExecutionTime: averageExecutionTime,
      averageNumberKeysProcessed: averageNumberKeysProcessed,
      numberErrors: numberErrors,
    };
  };

  // Create stat view for each workflow in the pipeline
  const statView = {};
  crawlerWorkflows.forEach((workflow) => {
    statView[workflow.name] = createStatView(workflow.name);
  });
  return statView;
}

module.exports = {
  startWorkflow: startWorkflow,
  stopWorkflow: stopWorkflow,
  workflowStats: workflowStats,
};
