# Credit: https://stackoverflow.com/questions/10369681/how-to-plot-bar-graphs-with-same-x-coordinates-side-by-side-dodged
import matplotlib.pyplot as plt
import numpy as np

# -------------------------------------------
#--------------SCALABILITY EVAL PART 1-------------
# -------------------------------------------

# Total number of files 107386
# Numbers of pairs of bars you want
N = 3

x = np.array([1, 5])

# Data on X-axis
# averageExecutionTime / averageNumberKeysProcessed
# Latency Values (how long does it take for the system to store and index a page)
#109.22
y_latency_getURLsWorkflow = [76.63810085423968, 38.370]
y_latency_getBookMetadataWorkflow = [101.88882296481036, 40.59]
y_latency_indexWorkflow = [138.0337695304085,30.26]

# Throughput Values (how many pages can it store and index per second)
# averageNumberKeysProcessed / averageExecutionTime
# (100 + 92.80077369439071 + 100) / (3837.029017886311 + 3767.099816715677 + 3026.228136601139) * 1000
# 100/(3837.029017886311 + 3767.099816715677 + 3026.228136601139) * 1000 = 9.4
#27.5
y_throughput_getURLsWorkflow = [13.048340040444508, 26.06]
y_throughput_getBookMetadataWorkflow = [9.814619218296134, 24.63]
y_throughput_indexWorkflow = [7.244604008149632, 33.04]



# # Position of bars on x-axis
# ind = np.arange(N)

# Figure size
plt.figure(figsize=(10,5))
    

# Plotting
plt.plot(x, y_latency_getURLsWorkflow, label='getURLsWorkflow', marker='.')
plt.plot(x, y_latency_getBookMetadataWorkflow, label='getBookMetadataWorkflow', marker='.')
plt.plot(x, y_latency_indexWorkflow, label='indexWorkflow', marker='.')

plt.xlabel('# nodes')
plt.ylabel('milliseconds')
plt.title('Scalability Latency Evaluation')

# Finding the best position for legends and putting it
plt.legend(loc='best')
plt.show()


# Plotting
plt.plot(x, y_throughput_getURLsWorkflow, label='getURLsWorkflow', marker='.')
plt.plot(x, y_throughput_getBookMetadataWorkflow, label='getBookMetadataWorkflow', marker='.')
plt.plot(x, y_throughput_indexWorkflow, label='indexWorkflow', marker='.')

plt.xlabel('# nodes')
plt.ylabel('# pages')
plt.title('Scalability Throughput Evaluation')

# Finding the best position for legends and putting it
plt.legend(loc='best')
plt.show()