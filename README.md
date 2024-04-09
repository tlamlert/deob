# M5: Distributed Execution Engine
> Full name: `Tiger Lamlertprasertkul`
> Email:  `tanadol_lamlertprasertkul@brown.edu`
> Username:  `tlamlert`

## Summary
> Summarize your implementation, including key challenges you encountered

My implementation comprises `1` new software components, totaling `364` added lines of code over the previous implementation. I also implemented `3` MapReduce workflows in `all.student.test.js`. Key challenges included
1. MapReduce implementation. Workers must be synchornized across different phases to ensure the consistency of a MapReduce workflow. This is achieved by the -notify services that implement the execution of the map, shuffle, and reduce phases.
2. Key distribution. Keys should be uniformly distributed across all nodes. Currently, the input keys are split using their original order. A better approach is use consistent hashing implemented in the previous milestone.
3. Workflow implementation. Advanced MapReduce workflows might need access to external libraries. Since our serialization library does not provide support for import statements nested inside another function, we must provide access to these external libraries by declaring access to them `distribution.js`

## Correctness & Performance Characterization
> Describe how you characterized the correctness and performance of your implementation

*Correctness*: The distributed MapReduce implementation is tested using example workflow against local execution to ensure the correctness of the distributed computation.

*Performance*: The perfomance of the MapReduce implementation can be evaluated by measuring the execution time of example workflows on the distribution implementation and the local sequential execution.

## Key Feature
> Which extra features did you implement and how?
In memeory operation. Intermediate results are stored in memory using the keyword `this`. They can be accessed using the same keywork. This eliminates the need to store intermediate results in file system.

> What workflows did you implement and how?
I implemented 3 workflows in `all.student.test.js`. The 3 workflows are crawler, URL extraction, and distributed string matching.
* In crawler, I made the mapper function asynchronous by using Promise in JavaScript. The mapper is responsible for fetching the page content and store it in a separate group distribution `extract`. The reducer merely aggragates the number of times each URL in the input is fetched. Pages crawled in this step will be used in URL extraction in the next step
* In URL extraction, I use two libraries `URL` and `JSDOM` to construct the corresponding DOM objects and extract URLs on the page. Notice that the mapper function is not asynchronous since the `exec` method in MapReduce implementation is responsible for retrieving the object for this function. Similarly, the reducer merely aggregates the number of occcurence each link appears in total across all URLs.
* The distribution string matching is quite simple. The mapper is responsible for all Regex expression evaluation. The reduce aggragates the number of occurences.

## Time to Complete
> Roughly, how many hours did this milestone take you to complete?

Hours: `20 hrs`

