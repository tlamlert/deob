# Credit: https://stackoverflow.com/questions/10369681/how-to-plot-bar-graphs-with-same-x-coordinates-side-by-side-dodged
import matplotlib.pyplot as plt
import numpy as np

# -------------------------------------------
#--------------PERFORMANCE EVAL-------------
# -------------------------------------------

# Total number of files 107386
# Numbers of pairs of bars you want
N = 3

# Data on X-axis
# averageExecutionTime / averageNumberKeysProcessed
# Latency Values (how long does it take for the system to store and index a page)
#109.22
blue_bar = (38.370, 40.59, 30.26)

# Throughput Values (how many pages can it store and index per second)
# averageNumberKeysProcessed / averageExecutionTime
# (100 + 92.80077369439071 + 100) / (3837.029017886311 + 3767.099816715677 + 3026.228136601139) * 1000
# 100/(3837.029017886311 + 3767.099816715677 + 3026.228136601139) * 1000 = 9.4
#27.5
orange_bar = (26.06, 24.63, 33.04)

# Position of bars on x-axis
ind = np.arange(N)

# Figure size
plt.figure(figsize=(10,5))

# Width of a bar 
width = 0.3       

# Plotting
plt.bar(ind, blue_bar , width, label='Latency')
# plt.bar(ind + width, orange_bar, width, label='Throughput')

plt.xlabel('Workflow')
plt.ylabel('Milliseconds per file')
plt.title('Performance Evaluation (Latency)')

# First argument - A list of positions at which ticks should be placed
# Second argument -  A list of labels to place at the given locations
plt.xticks(ind + width / 2, ('getURLsWorkflow', 'getBookMetadataWorkflow', 'indexWorkflow'))

# Finding the best position for legends and putting it
plt.legend(loc='best')
plt.show()

#--------------------------------------------------------------------------------------
plt.bar(ind, orange_bar, width, label='Throughput')

plt.xlabel('Workflow')
plt.ylabel('Files per second')
plt.title('Performance Evaluation (Throughput)')

# First argument - A list of positions at which ticks should be placed
# Second argument -  A list of labels to place at the given locations
plt.xticks(ind + width / 2, ('getURLsWorkflow', 'getBookMetadataWorkflow', 'indexWorkflow'))

# Finding the best position for legends and putting it
plt.legend(loc='best')
plt.show()