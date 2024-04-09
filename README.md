# M5: Distributed Execution Engine
> Full name: `Tiger Lamlertprasertkul`
> Email:  `tanadol_lamlertprasertkul@brown.edu`
> Username:  `tlamlert`

## Summary
> Summarize your implementation, including key challenges you encountered

My implementation comprises `1` new software components, totaling `254` added lines of code over the previous implementation. I also implemented `3` MapReduce workflows in `all.student.test.js`. Key challenges included
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

## Time to Complete
> Roughly, how many hours did this milestone take you to complete?

Hours: `20 hrs`

