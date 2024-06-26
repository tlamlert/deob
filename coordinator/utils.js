/**
 * Allow logging to file in addition to console
 *
 * https://stackoverflow.com/questions/8393636/configure-node-js-to-log-to-a-file-instead-of-the-console
 */
const fs = require("fs");
const path = require("path");
const natural = require("natural");
global.natural = natural;

// Read stop words from file
const STOP_WORD_FILE = path.join(__dirname, "/data/stopwords.txt");
const stopwordsData = fs.readFileSync(STOP_WORD_FILE, "utf8");
global.bagOfStopwords = stopwordsData.split("\n").filter(Boolean);

let newDebugSesh = true;
const errorLog = function (msg, filename = "debug.txt") {
  if (msg instanceof Error) {
    msg = msg.message;
  } else if (typeof msg !== "string") {
    msg = JSON.stringify(msg);
  }

  // If running for the first time, clear the file with new write
  if (newDebugSesh) {
    fs.writeFileSync(path.join(__dirname, filename), msg + "\n");
    newDebugSesh = false;
  }
  // Else append contents
  else {
    fs.appendFileSync(path.join(__dirname, filename), msg + "\n");
  }

  // Also write contents to stdout
  process.stdout.write("\x1b[31m Error Log: \x1b[0m" + msg + "\n");
};

let newLogSesh = true;
const statsLog = function (msg, filename = "defaultStatsLog.txt") {
  if (msg instanceof Error) {
    msg = msg.message;
  } else if (typeof msg !== "string") {
    msg = JSON.stringify(msg);
  }

  // If running for the first time, clear the file with new write
  if (newLogSesh) {
    fs.writeFileSync(path.join(__dirname, filename), msg + "\n");
    newLogSesh = false;
  }
  // Else append contents
  else {
    fs.appendFileSync(path.join(__dirname, filename), msg + "\n");
  }

  // Also write contents to stdout
  // process.stdout.write('\x1b[34m Stats Log: \x1b[0m' + msg + '\n');
};
// =====================================================================

/**
 * Generate n-grams (including sub-grams) from a given text
 * @param {*} text : string whose words are space-separared (e.g. "helen on horse")
 * @param {*} maxN : max n-gram to create
 *
 * Returns: List of ngrams (List[String])
 */
const preprocess = function (text, maxN = 3) {
  if (typeof text !== "string") {
    text = "";
  }

  // Get rid of characters that are not alphabetic
  // and removes extra newlines caused by first step
  const bagOfWords = text.replace(/[^A-Za-z]/g, "\n").replace(/\n{2,}/g, "\n");

  // Translate to all lowercase
  const lowercaseBagOfWords = bagOfWords.toLowerCase();

  // Stem each word
  const stemmedBagOfWords = lowercaseBagOfWords
    .split("\n")
    .map((word) => global.natural.PorterStemmer.stem(word))
    .join("\n");

  // Filter out the stopwords and get rid of leading and trailing spaces
  const filteredBagOfWords = stemmedBagOfWords
    .split("\n")
    .filter((word) => !global.bagOfStopwords.includes(word))
    .join(" ")
    .trim();

  // Generate N-grams
  let ngrams = [];
  for (let i = 1; i <= maxN; i++) {
    const igram = generateNgrams(filteredBagOfWords, i);
    ngrams = ngrams.concat(igram);
  }

  return ngrams;
};

/**
 * Helper to preprocess(). Creates just the n-gram (none of the sub-grams).
 * @param {*} bagOfWords : string whose words are space-separated (e.g. "helen on horse")
 * @param {*} n : n-gram to create
 *
 * Returns: List of ngrams (List[String])
 */
function generateNgrams(bagOfWords, n = 3) {
  const ngrams = [];
  const bagOfWordsList = bagOfWords.split(" ");
  for (let i = 0; i + n <= bagOfWordsList.length; i++) {
    const ngram = bagOfWordsList.slice(i, i + n).join(" ");
    ngrams.push(ngram);
  }
  return ngrams;
}

module.exports = {
  errorLog: errorLog,
  statsLog: statsLog,
  preprocess: preprocess,
  generateNgrams: generateNgrams,
};
