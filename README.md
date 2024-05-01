# DEOB: A Distributed Engine for Open Books
DEOB is a distributed search engine that users to query for open books from Project Gutenberg, a library of over 70,000 free eBooks. Inspired by Google's search engine, we wanted to focus our system on resources used by a diverse audience. Hence, we chose books; a resource sought after by people of all ages and backgrounds. Built upon semester-long milestone implementations, our search system incorporates vital workflows and endpoints for workflow execution, performance testing, and easy querying. The project report can be found [here](./final-report.pdf)

## Design Overview
We designed our system using the coordinator-worker model. The coordinator node is in charge of running a webserver that provides HTTP endpoints for both the end users and system administrators. The worker nodes are in charge of storing data and running the subsystems.

There are three sub-systems: crawler, indexer, and query. The crawler and indexer subsystems are distributed MapReduce workflows that run concurrently to download, parse, and index books from the Gutenberg project. The query subsystem takes user input and returns URLs ordered in relevancy from the distributed file storage.

Each node in the system runs the `distribution` package, which contains abstractions for local and distributed actions. Namely, the package runs each node as a HTTP server, allowing for easy communication between nodes and remote procedure calls to be made to other nodes. 

When the coordinator node receives a request, it dispatches corresponding distributed workflows to the worker nodes, triggering the workers to perform the necessary actions. There are two benefits to this design: 
* The system is scalable because the coordinator node can easily add more worker nodes to handle heavier workloads.
* The system is user-friendly because the distributed workflows are abstracted away from the end users and system administrators.

### Server API documentation
Method | Endpoint                      | Description                               |
:----: | :---------------------------- | :---------------------------------------- |
| PUT  | /crawler/start                | Schedule recurring workflow jobs.         |
| PUT  | /crawler/stop                 | Stop recurring workflow execution.        |
| PUT  | /crawler/reset-workers        | Create necessary groups on allall worker nodes. |
| GET  | /crawler/stats                | Get statistic info. about crawler jobs.   |
| GET  | /book/search?q=\<query-string\> | Search for books by words or phrases.   |


## Distributed MapReduce Workflows
![Workflow diagram](/figures/workflows.png)

**How we apply these workflows**: Our system consists of 2 workflows running recurringly and the other workflow responsible for processing search query on demand. The first two workflows are triggered at set intervals to operate on first $n$ elements of input dataset. These are started and stopped by the `crawler/stat` an `crawler/stop` endpoints.

### Data Groups
The DEOB system assumes that data used in MapReduce workflows is already partitioned and stored on all the worker nodes using consistent hashing. Implementation-wise, data should be split by categories and each MapReduce workflow must be executed on its corresponding data group.
* `uncrawledPageURLs (url, url)`: Responsible for storing uncrawled page URLs
* `uncrawledBookURLs (url, url)`: Responsible for storing uncrawled book URLs
* `crawledPageURLs  (url, url)`: Responsible for storing visited page URLs
* `bookMetadata (url, metadata)`: Responsible for storing book metadata
* `invertedMetadata (ngram, [(url, count), ...])`: Responsible for storing the mapping from ngram to list of URLs

### GetURLs Workflow
- **Summary:** Extract unvisited URLs from webpages and store them in distributed file system for later any information extraction workflows. GetURLs is the core workflow to the web crawler subsystem.
- **Keys**: A list of page URLs to crawl. `[url, ...]`
- **Relevant datasets**: `uncrawledPageURLs`, `crawledPageURLs`, and `uncrawledBookURLs`
```js
/**
 * Extract URLs from web page content
 * @param {*} url   The page URL to crawl
 * @param {*} _     The page URL to crawl (ignored)
 * @return [(url, 1), ...]
 */
getURLs['map'] = (url, _) => {}

/**
 * Store uncrawled URls in `uncrawled<page-type>URLs`
 * where page-type is either `Page` or `Book`
 * @param {*} url     The URL to store
 * @param {*} _       A list of ones equal to the number of occurrences (ignored)
 * @return (url, null)
 */
getURLs['reduce'] = (url, _count) => {}
```

### GetBookMetadata Workflow
- **Summary:** Use Regex expression to extract metadata from book content and store it in distributed file system for indexing.
- **Keys**: A list of book URLs to build index on. `[url, ...]`
- **Relevant datasets**: `bookMetadata` and `invertedMetadata`
```js
/**
 * Takes a url and corresponding bookMetadata and outputs a list of
 * ngram-url pairs. These pairs are of type list.
 *
 * @param {*} url : website URL
 * @param {*} bookMetadata : String corresponding to url
 * @return List of ngram-url pairs (i.e. [[ngram, url], ...] )
 */
index['map'] = (url, bookMetadata) => {}

/**
 * Takes an ngram and list of urls containing ngram, and outputs
 * an object mapping ngram -> list of [url_i, count_i]
 *
 * @param {*} ngram : string
 * @param {*} urls  : list of urls (i.e. list of strings). There can be duplicate urls.
 * @return Object of form: { ngram : [ [url, count], ... ] }
 */
index['reduce'] = (ngram, urls) => {}
```

### N-Gram / Indexing Workflow
- **Summary:** From book metadata, produce ngrams, and store ngram-URL pair in the inverted index.
- **Keys**: A list of book URLs to extract metadata from. `[url, ...]`
- **Relevant datasets**: `uncrawledBookURLs` and `bookMetadata`
```js
/**
 * Extract metadata from book page content
 * and store it in `bookMetadata`
 * @param {*} url   The book URL to crawl
 * @param {*} _     The book URL to crawl (ignored)
 * @return (url, metadata)
 */
getBookMetadata['map'] = (url, _) => {}

/**
 * Do nothing. The reducer is needed to send data back to the coordinator.
 * Output: (url, metadata)
 * @param {*} key
 * @param {*} values
 * @returns
 */
getBookMetadata["reduce"] = (key, values) => {}
```

## Deployment
### Local Deployment
The system can be deploy locally by running the coordinator and worker nodes on separate processes. The commands listed below are example commands used during development. Multiple worker nodes can be run concurrently to mimic the distributed nature of the system by changing the worker's port number and providing all port numbers in the coordinator configuration.

```bash
shell1 (worker): node distribution.js --port 8081
shell2 (coordinator): node ./coordinator/server.js --workers 127.0.0.1 --workerPorts 8081
shell3 (client): curl -X PUT -d "" 127.0.0.1:8080/crawler/start
shell3 (client): curl -X GET -d "" 127.0.0.1:8080/book/search?q=<query-string>
# See the coordinator API docs for the complete list of available endpoints
```

## Collaborators
This project is part of Distributed Computer System course at Brown University. Collaborators on this project includes Mandy He, Helen Huang, Tiger Lamlertprasertkul, and Jialiang Zhou.
