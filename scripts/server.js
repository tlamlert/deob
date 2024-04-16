const distribution = require('../distribution');
const args = require('yargs').argv;
const http = require('http');
const crawler = require('./crawl.js');

// =======================================
//          Read config from CLI
// =======================================
// Usage: ./distribution.js --ip '127.0.0.1' --port 1234 --workers 0.0.0.0,1.1.1.1

// Default configuration
const serverConfig = {
    ip: '127.0.0.1',
    port: 8080,
    workers: [] // List of IP Addr's of workers in the cloud distributed system (ports are hardcoded to be the same)
};

if (args.ip) {
    global.nodeConfig.ip = args.ip;
}

if (args.port) {
    global.nodeConfig.port = parseInt(args.port);
}

if (args.workers) {
    global.workers.neighbors = args.neighbors.split(',');
}



// =======================================
//          Initialize groups
// =======================================

const createGenericGroup = function (gidString) {
    // TODO:
    const genericGroup = {}
    for (const ipAddr of global.nodeConfig.workers) {
        const neighbor = { ip: ipAddr, port: port };
        genericGroup[id.getSID(neighbor)] = neighbor;
    }
    const config = { gid: gidString };
    groupsTemplate(config).put(config, genericGroup, (e, v) => {
        console.log("Group deployed!", gidString);
        //
        // Start crawling workflow
        distribution.genericGroup.mr.exec() {
        };
    });
}

// =======================================
//          Worker Groups
// =======================================
// Worker : The group the connects all the EC2 instances (the workers)
// NOTE: DO NOT INCLUDE THE SERVER/COORDINATOR IN THE GROUP
createGenericGroup("worker")

// Crawler : Responsible for ...
createGenericGroup("crawler")

// Preprocess : Responsible for ...
createGenericGroup("preprocess")

// Combine : Responsible for ...
createGenericGroup("combine")

// Invert : Responsible for ...
createGenericGroup("invert")


// =======================================
//          Storage Groups
// =======================================

// uncrawledURLs : Responsible for storing the URLs to visit
createGenericGroup("uncrawledURLs")

// crawledUrls : Responsible for storing the URLs we already visited
createGenericGroup("crawledUrls")

// Text : Responsible for ...
createGenericGroup("text")

// =======================================
//          Start HTTP Server
// =======================================

const server = http.createServer((req, res) => {
    const path = parsedUrl.pathname;
    if (req.method === 'PUT') {
        if (path === '/startCrawl') {
            /**
             * Set a recurring job to crawl xxx pages every xxx minutes
             */
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            global.recurringCrawlJobID = setInterval(executeCrawlWorkflow, 1000);
            res.end('Start crawling!');

            function executeCrawlWorkflow() {
                // get the first 5 uncrawled URLs
                const maxNumURLsToCrawl = 5;
                distribution.uncrawledURLs.store.get(null, (urls) => {
                    const crawlJob = {
                        keys: urls.splice(maxNumURLsToCrawl),
                        map: crawler.map,
                        reduce: crawler.reduce,
                    }
                    distribution.workers.mr.exec(crawlJob, () => {
                        // all URLs are crawled
                        distribution.uncrawledURLs.store.remove(urls, () => {
                            // end of execution!!! respond to client
                        });
                    });
                });
            };
        } else if (path === '/stopCrawl') {
            /**
             * Stop the recurring job initialized in startCrawl
             */
            // stop the recurring job
            clearInterval(global.recurringCrawlJobID);
        }
    } else if (req.method === 'GET') {
        if (path === "/query") {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Hello World!');
        } else {
            res.end(distribution.util.serialize(new Error('GET path not found!')));
        }
    } else {
        res.end(distribution.util.serialize(new Error('Method not allowed!')));
    }
});
global.listen(serverConfig.port, serverConfig.ip, () => {
    console.log(`Engine listening on ${erverConfig.ip}:${serverConfig.port}`);
})
