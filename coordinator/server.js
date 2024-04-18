// =======================================
//          External libraries
// =======================================

const http = require('http');
const url = require('url');
const distribution = require('../distribution.js');
const utils = require("./utils.js");
const URL = require('url');
const { JSDOM } = require('jsdom');
id = distribution.util.id;
global.distribution = distribution;
global.URL = URL;
global.JSDOM = JSDOM;
global.utils = utils;
const groupsTemplate = require('../distribution/all/groups');

// =======================================
//          Import workflows
// =======================================

const { executeCrawlWorkflow } = require('./crawl.js');
const { executeGetURLsWorkflow } = require('./getURLs.js');
const { executeGetBookMetadataWorkflow } = require('./getBookMetadata.js');
const { executeIndexingWorkflow } = require('./index.js');

// Workflows are in their corresponding files
const recurringWorkflows = [
    executeCrawlWorkflow,
    executeGetURLsWorkflow,
    executeGetBookMetadataWorkflow,
    executeIndexingWorkflow,
];

// // TODO: This is not even a mr workflow
// const executeQueryWorkflow = require('./query.js');

// =======================================
//          Read config from CLI
// =======================================
// Usage: ./distribution.js --ip '127.0.0.1' --port 1234 --workers 0.0.0.0,1.1.1.1
const args = require('yargs').argv;

// Default configuration
const serverConfig = {
    ip: '127.0.0.1',
    port: 8080,
    workers: [],
    // List of IP Addr's of workers in the cloud distributed system
    // (ports are hardcoded to be the same)
    // workers can also be a list of local workers
};

/**
 * Read server configuration from command line.
 */
function readServerConfiguration() {
    // Read configuration values from CLI
    if (args.ip) {
        serverConfig.ip = args.ip;
    }

    if (args.port) {
        serverConfig.port = parseInt(args.port);
    }

    if (args.workers) {
        serverConfig.workers = args.workers.split(',');
    }

    if (args.workerPort) {
        serverConfig.workerPort = args.workerPort;
    }
}

// =======================================
//          Initialize groups
// =======================================

const createWorkerAndStorageGroups = function (workers, workerPort) {

    const createGenericGroup = function (gidString) {
        const genericGroup = {}
        for (const ipAddr of workers) {
            const neighbor = { ip: ipAddr, port: workerPort }; // port is not defined
            genericGroup[id.getSID(neighbor)] = neighbor;
        }
        const config = { gid: gidString };

        return new Promise((resolve) => {
            console.log("Creating group: ", gidString);
            groupsTemplate(config).put(config, genericGroup, (err, value) => {
                if (Object.keys(err).length > 0) {
                    console.error('err: ', err);
                } else {
                    console.log("Group deployed! ", gidString);
                }
                resolve();
            });
        })
    }

    // =======================================
    //          Worker Groups
    // =======================================

    // Worker : The group the connects all the EC2 instances (the workers)
    // NOTE: DO NOT INCLUDE THE SERVER/COORDINATOR IN THE GROUP
    return Promise.all([createGenericGroup("workers"),

    // =======================================
    //          Storage Groups
    // =======================================

    // uncrawledURLs : Responsible for storing the URLs to visit
    // (url, null) 
    createGenericGroup("uncrawledURLs"),

    // crawledUrls : Responsible for storing the URLs we already visited
    // (url, null)
    createGenericGroup("crawledURLs"),

    // rawBookContents : Responsible for storing the raw book contents (txt files)
    // (url, book-content)
    createGenericGroup("rawBookContents"),

    // rawPageContents : Responsible for storing the raw non-book contents (html, etc)
    // (url, page-content)
    createGenericGroup("rawPageContents"),

    // bookMetadata : Responsible for stroing the metadata of crawled books
    // (url, metadata)
    createGenericGroup("bookMetadata"),

    // invertedBookTitles : Responsible for storing the mapping from ngram to list of URLs
    // (ngram, [(url, count), ...])
    createGenericGroup("invertedMetadata")]);
}

// =======================================
//          Start HTTP Server
// =======================================

const startServer = function (serverConfig, cb = () => { }) {
    const server = http.createServer((req, res) => {
        const path = url.parse(req.url).pathname;
        console.log('request received for path: ', path);
        console.log('method: ', req.method);
        if (req.method === 'PUT') {
            if (path === '/start') {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Starting workflows');
                
                req.on('end', () => {
                    console.log('Setting interval for each workflow');
                    // Set interval for each workflow in the list to manage access control to distributed stores

                    global.ehorsh = setInterval(() => {
                        console.log('workflow triggered!');
                    }, 1000);

                    // global.jobIDs = new Map();
                    // recurringWorkflows.forEach((wf) => {
                    //     let locked = false;
                    //     global.jobID[wf] = setInterval(() => {
                    //         console.log('workflow triggered!');
                    //         if (!locked) {
                    //             locked = true;
                    //             workflow();
                    //             locked = false;
                    //         }
                    //     }, 1000);
                    // })
                })

            } else if (path === '/stop') {
                /**
                 * Stop the recurring job initialized in startCrawl
                 */
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Stopping workflows');
                clearInterval(global.ehorsh);
                
                // global.jobIDs.forEach((id) => {
                //     clearInterval(jobId);
                // })
            }
        } else if (req.method === 'GET') {
            if (path === "/search") { // e.g. /search?q=hello
                // Get the query from the URL
                const query = url.parse(req.url, true).query;
                const q = query.q;
                // 
                const ngram = utils.generateNgrams(q);
                global.distribution.invertedMetadata.get(ngram, (err, val) => {
                    if (err) {
                        res.end(distribution.util.serialize(err));
                        return;
                    }

                    // res: [(url, count), ...]
                    // Sort by count
                    val.sort((a, b) => b[1] - a[1]);
                    // Get the top 10 urls
                    const urls = val.slice(0, 10).map((url) => url[0]);
                    res.end(distribution.util.serialize(urls));
                })
            } else {
                res.end(distribution.util.serialize(new Error('GET path not found!')));
            }
        } else {
            res.end(distribution.util.serialize(new Error('Method not allowed!')));
        }
    });

    // create worker and storage groups
    createWorkerAndStorageGroups(serverConfig.workers, serverConfig.workerPort).then(() => {
        console.log('all groups are created');
        server.listen(serverConfig.port, serverConfig.ip, () => {
            console.log(`Engine listening on ${serverConfig.ip}:${serverConfig.port}`);
            cb(server);
        })
    });
}

/* The following code is run when distribution.js is run directly */
if (require.main === module) {
    // Read server configuration from command line
    readServerConfiguration();

    // Http server providing user interface
    startServer(serverConfig);
}

module.exports = startServer;
