import pandas as pd
import numpy as np


def getColumnAverages(dataset):
    colMean = dataset.mean(axis=0)
    return colMean

def getLatency(colAvgs):
    return colAvgs[1]/colAvgs[2]

def getThroughput(colAvgs):
    return colAvgs[2]/colAvgs[1] * 1000

bookMetadataFilename = "../../stats/getBookMetadataWorkflow.csv"
URLsFilename = "../../stats/getURLsWorkflow.csv"
indexFilename = "../../stats/indexWorkflow.csv"
dfBookMetadata = pd.read_csv(bookMetadataFilename, sep=',', header=None)
dfURLs = pd.read_csv(URLsFilename, sep=',', header=None)
dfIndex = pd.read_csv(indexFilename, sep=',', header=None)

bookMetadataColAvg = getColumnAverages(dfBookMetadata)
getURLsColAvg = getColumnAverages(dfURLs)
IndexColAvg = getColumnAverages(dfIndex)
print("bookMetadata \n", bookMetadataColAvg)
print("getURLs \n", getURLsColAvg)
print("Index \n", IndexColAvg)

print("bookMetadata latency \n", getLatency(bookMetadataColAvg))
print("getURLs latency \n", getLatency(getURLsColAvg))
print("Index latency \n", getLatency(IndexColAvg))

print("bookMetadata Throughput \n", getThroughput(bookMetadataColAvg))
print("getURLs Throughput \n", getThroughput(getURLsColAvg))
print("Index Throughput \n", getThroughput(IndexColAvg))



# bookMetadata 
#  0    8969.423505
# 1    1405.031849
# 2      18.333333
# dtype: float64
# getURLs 
#  0    134334.466420
# 1       550.199644
# 2         5.400000
# dtype: float64
# Index 
#  0    8516.269820
# 1     260.730454
# 2       1.888889
# dtype: float64
# bookMetadata latency 
#  76.63810085423968
# getURLs latency 
#  101.88882296481036
# Index latency 
#  138.0337695304085
# bookMetadata Throughput 
#  13.048340040444508
# getURLs Throughput 
#  9.814619218296134
# Index Throughput 
#  7.244604008149632