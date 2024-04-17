// =======================================
//          External libraries
// =======================================

const http = require('http');
const distribution = require('../distribution.js');
const utils = require("./utils.js");
global.distribution = distribution;

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

// Read configuration values from CLI
if (args.ip) {
    global.serverConfig.ip = args.ip;
}

if (args.port) {
    global.serverConfig.port = parseInt(args.port);
}

if (args.workers) {
    global.serverConfig.workers = args.workers.split(',');
}

// =======================================
//          Initialize groups
// =======================================

const createGenericGroup = function (gidString) {
    const genericGroup = {}
    for (const ipAddr of global.serverConfig.workers) {
        const neighbor = { ip: ipAddr, port: port };
        genericGroup[id.getSID(neighbor)] = neighbor;
    }
    const config = { gid: gidString };
    groupsTemplate(config).put(config, genericGroup, (err, value) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Group deployed! ", gidString);
        }
    });
}

// =======================================
//          Worker Groups
// =======================================

// Worker : The group the connects all the EC2 instances (the workers)
// NOTE: DO NOT INCLUDE THE SERVER/COORDINATOR IN THE GROUP
createGenericGroup("workers")

// =======================================
//          Storage Groups
// =======================================

// uncrawledURLs : Responsible for storing the URLs to visit
// (url, null) 
createGenericGroup("uncrawledURLs");

// crawledUrls : Responsible for storing the URLs we already visited
// (url, null)
createGenericGroup("crawledURLs");

// rawBookContents : Responsible for storing the raw book contents (txt files)
// (url, book-content)
createGenericGroup("rawBookContents");

// rawPageContents : Responsible for storing the raw non-book contents (html, etc)
// (url, page-content)
createGenericGroup("rawPageContents");

// bookMetadata : Responsible for stroing the metadata of crawled books
// (url, metadata)
createGenericGroup("bookMetadata");

// invertedBookTitles : Responsible for storing the mapping from ngram to list of URLs
// (ngram, [(url, count), ...])
createGenericGroup("invertedMetadata")

// =======================================
//          Start HTTP Server
// =======================================

const server = http.createServer((req, res) => {
    const path = parsedUrl.pathname;
    if (req.method === 'PUT') {
        if (path === '/start') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });

            // Set interval for each workflow in the list to manage access control to distributed stores
            global.jobIDs = new Map();
            recurringWorkflows.forEach((wf) => {
                let locked = false;
                global.jobID[wf] = setInterval(() => {
                    if (!locked) {
                        locked = true;
                        workflow();
                        locked = false;
                    }
                }, 1000);
            })
        } else if (path === '/stop') {
            /**
             * Stop the recurring job initialized in startCrawl
             */
            global.jobIDs.forEach((id) => {
                clearInterval(jobId);
            })
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

server.listen(serverConfig.port, serverConfig.ip, () => {
    console.log(`Engine listening on ${serverConfig.ip}:${serverConfig.port}`);
})

module.exports = server;