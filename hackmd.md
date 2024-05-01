# DEOB: A Distributed Engine for Open Books
DEOB is a distributed search engine that users to query for open books from Project Gutenberg, a library of over 70,000 free eBooks. Inspired by Google's search engine, we wanted to focus our system on resources used by a diverse audience.  Hence, we chose books; a resource sought after by people of all ages and backgrounds. Built upon semester-long milestone implementations, our search system incorporates vital workflows and endpoints for workflow execution, performance testing, and easy querying.

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
![Untitled Diagram.drawio (3)](https://hackmd.io/_uploads/S1eBf9bb0.png)

**How we apply these workflows**: Our system consists of 2 workflows running recurringly and the other workflow responsible for processing search query on demand. The first two workflows are triggered at set intervals to operate on first $n$ elements of input dataset. These are started and stopped by the `crawler/stat` an `crawler/stop` endpoints.

### Data Groups
The DEOB system assumes that data used in MapReduce workflows is already partitioned and stored on all the worker nodes using consistent hashing. Implementation-wise, data should be split by categories and each MapReduce workflow must be executed on its corresponding data group.
* `uncrawledPageURLs (url, url)`: Responsible for storing uncrawled page URLs
* `uncrawledBookURLs (url, url)`: Responsible for storing uncrawled book URLs
* `crawledPageURLs  (url, url)`: Responsible for storing visited page URLs
* `bookMetadata (url, metadata)`: Responsible for storing book metadata
* `invertedMetadata (ngram, [(url, count), ...])`: Responsible for storing the mapping from ngram to list of URLs

<!-- 
### Crawler Workflow (Tiger)
- `summary`: Download page content from URL as HTML
- `Keys`: `[url, ...]`
- `Existing dataset structure`: `(url, null)` - `uncrawledURLs`
- `To-store dataset structure`: `(url, pageContent)` - `rawPageContents` or `rawBookContent`
- `Mapper`: 
    ```js
    (url, _) => {
        // Just follow Tiger's existing thing
        // - Download the page content using https.get
        // - If it is a book (ending in .txt), we store the content
        // in distribution.rawBookContents.store(value=pagecontent, key=url)
        // - If it is not a book, we store the content in
        // distribution.rawPageContents.store(value=pageContent, key=url)
        // TODO: if the page content is too large;
        // might need to modity the mapper to gradually store each chunk of data
        // 
        // Output: (url, 1)
        // NOTE: value 1 is a dummy variable
    }
    ```
- `Reducer`: 
    ```js
    (url, _count) => {
        //  Count the total number of URLs. Totalcount should be 1 given that input URLs are distinct
        // 
        // Output: (url, totalCount)
    }
    ```
- `Postprocessing`: Remove already crawled URLs from `uncrawledURLs` to avoid processing duplicate URLs. Add already crawled URLs to `distribution.crawledURLs`.
 -->
 
### GetURLs Workflow
- `Summary`: Extract unvisited URLs from webpages and store them in distributed file system.
- `Keys`: `[url, ...]`
- `Existing dataset structure`: `(url, url)` - `uncrawledPageURLs`
- `To-store dataset structure`: `(url, url)` - `uncrawledPageURLs` or `uncrawledBookURLs`
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

### GetBookMetadata Workflow (orig: getText) (Mandy)
- `Summary`: Extract metadata from book content. Store it in the database for indexing.
    - Tip: use regex to grab title
- `Keys`: `[url, ...]`
- `Existing dataset structure`: `(url, _)` - `uncrawledBookURLs`
- `To-store dataset structure`: `(url, metadata)` - `bookMetadata`
    ```
    metadata: 
    {
        Title: string 
        Author: string
        Release Date: date/string
        Language: string
    }
    **IGNORE ABOVE**
    New Metadata:
    - Metadata: Title: string 
    ```
- `Mapper`: 
    ```js
    (url, _) => {
        // Extract metadata from book page content
        // - Store metadata in `bookMetadata`
        // output: (url, metadata)
    }
    ```
- `Reducer`: 
    ```js
    (url, metadata) => {
        // Do nothing
        // output: (url, metadata)
    }
    ```
- `Postprocessing`:


### N-Gram Workflow / Indexing Workflow (Helen)
- `Summary`: From book metadata, produce ngrams. (This basically combines process, stem, combine from m0).
- `Keys`: `[url, ...]`
- `Existing dataset structure`: `(url, metadata)` - `bookMetadata`
- `To-store dataset structure`: `(ngram, [(url, count), ...])` - `invertedMetadata`
- `Mapper`: 
    ```js
    (url, bookMetadata) => {
        // NOTE: For now/simplicity purposes, metadata is page title
        //
        // 1. convert to lower case, remove stopwords (process.sh)
        // 2. stem individual words (stem.js)
        // 3. generate ngrams from list of words (combine.js)
        // output: [(ngram, url), ...];
    }
    ```
- `Reducer`: 
    ```js
    (ngram, urls) => {
        // Count the number of urls
        // 
        // output : (ngram, [(url_1, count_1), (url_2, count_2), ...])
    }
    ```
- `Postprocessing`: N/A


## Query Subsystem
- `Summary`: Given a query string, search for relevant URLs in the inverted index
- `Existing dataset structure`: `(ngram, [(url, count), ...])` - `invertedIndex`
- `Search Functionality`: 
    ```js
    (query) => {
        // 1. preprocess the query similar to the N-Gram workflow (process and stem)
        ngrams <- process(query)
        // 2. look up each n-gram in the invertedIndex
        ngrams.forEach((ngram) => {
            distribution.invertedIndex.store.get(ngram)
        })
    }
    ```


### If We Have Time...
- Watch some [cat videos](https://www.youtube.com/watch?v=y0sF5xhGreA&ab_channel=ThePetCollective) for 5 minutes
- Add other Indexing workflows (*i.e. TF/IDF, PageRank weights, etc.*)
- Support querying for proper nouns
- Support querying for arbitrary text (*yikes*)
- Dynamically determine when each workflow should execute


## TODO's
1. Extend `distribution.js` to take in a list of IP addresses as an extra argument
    * nodeConfig.start must communicate with all nodes (specified by the input IP addresses), passing its own ip address (TODO: is it possible to get the ip address of the current EC2 instance???) maybe via comm.send
    * If we have time (lmao): implement routes.connect() to support adding new nodes to the already established distributed system.
    * 

2. The private key `jz-key.pem` is needed to SSH into the EC2 instance. We could create multiple users on the server to avoid passing on the private key. https://stackoverflow.com/a/55222064
3. Deploy the server on 0.0.0.0:port_num, meaning the server listens on all interfaces
    * Is it possible to get the exact interface we should be listening on instead of 0.0.0.0? Something about an private(internal) IP address. https://stackoverflow.com/questions/33953447/express-app-server-listen-all-interfaces-instead-of-localhost-only

How do we control what workflow to run and when?

## Useful Code Snippets
### Setup script for a new EC2 instance
```shell
sudo apt update
sudo apt install nodejs git vim
git clone https://github.com/tlamlert/m6.git
sudo apt install npm
```

### Manually Sending a Request to a Node (manual `comm.send`)
1. Start the node server and expose it to the public internet by running `node distribution.js --ip "0.0.0.0"`
2. Send a request to the node server (from a remote machine in the same network) by running the following command:
    ```shell
    curl -X PUT http://<public-ip-address>:<port>/status/get -H "Content-Type: application/json" -d '{}'
    ```

```shell
# Start a node server
node distribution.js --ip '127.0.0.1' --neighbors <ip_address_1>,<ip_address_2>,...

# Neighbors must be comma separated because shell script arguments are split by white spaces
# https://stackoverflow.com/questions/45589583/how-to-get-ip-adress-from-aws-ec2-command
const yargs = require('yargs/yargs');
yargs('node distribution.js --neighbors 0.0.0.0,1.1.1.1').parse();
```

```shell
# https://stackoverflow.com/questions/38679346/get-public-ip-address-on-current-ec2-instance
# IP addresses under this account?
aws ec2 describe-instances --query 'Reservations[*].Instances[*].PublicIpAddress' --output text | 
    paste -sd, # joins all lines into a single line

# The private IP address is available via:
$ curl http://169.254.169.254/latest/meta-data/local-ipv4

# The private IP address is available via:
$ curl http://169.254.169.254/latest/meta-data/public-ipv4
```

```js
function main() {
  console.log("Hello world!");
}
```

```python
def main():
    print("Hello world!")
```

