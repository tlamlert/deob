/**
 * Allow logging to file in addition to console
 * 
 * https://stackoverflow.com/questions/8393636/configure-node-js-to-log-to-a-file-instead-of-the-console
 */
const fs = require('fs');

const errorLog = function(msg, filename='debug.txt') {
  const log_file = fs.createWriteStream(__dirname + '/' + filename, {flags : 'w'});
  const log_stdout = process.stdout;

  log_file.write(msg + '\n');
  log_stdout.write(msg + '\n');
};

// =====================================================================

// Read stop words from file
const STOP_WORD_FILE = './data/stopwords.txt';
const stopwordsData = fs.readFileSync(STOP_WORD_FILE);
const bagOfStopwords = stopwordsData.split('\n').filter(Boolean);

/**
 * Generate n-grams from a given text
 * @param {*} text : string
 * @param {*} maxN : n-gram
 */
const preprocess = function(text, maxN=3) {
  // Translate characters that are not alphabetic into newlines
  const bagOfWords = text.replace(/[^A-Za-z]/g, '\n');
  
  // Translate to all lowercase
  const lowercaseBagOfWords = bagOfWords.toLowerCase();

  // Filter out the stopwords
  const filteredBagOfWords = lowercaseBagOfWords.split('\n').filter(word => !bagOfStopwords.includes(word)).join('\n');

  // Generate N-grams
  const ngrams = [];
  for (let i = 1; i <= maxN; i++) {
    const igram = generateNgrams(filteredBagOfWords, i);
    ngrams = [...ngrams, ...igram];
  }
  
  return ngrams;
}

// Helper to preprocess(). Creates just the n-gram (none of the sub-grams).
function generateNgrams(bagOfWords, n=3) {
  const ngrams = [];
  for (let i = 0; i + n < bagOfStopwords.length; i++) {
    const ngram = bagOfStopwords.splice(i, i + n).join(" ");
    ngrams.push(ngram);
  }
  return ngrams;
}

module.exports = {
    errorLog: errorLog,
    preprocess: preprocess,
    generateNgrams: generateNgrams,
}
