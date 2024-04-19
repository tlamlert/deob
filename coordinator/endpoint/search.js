// =======================================
//          Workflow endpoints
// =======================================

// TODO: RETURNS LIST OF NGRAMS, NEED TO UPDATE QUERY TO HANDLE ALL OF THEM??
// CURRENT FIX: JUST TAKE FIRST NGRAM
// EXAMPLE QUERY : curl -X GET -d "" 127.0.0.1:8080/search?q=june
function search(query) {
  // e.g. /search?q=hello
  // Get the query from the URL
  const q = query.q;
  const ngrams = utils.preprocess(q);
  const testNgram = ngrams[0];
  console.log('testNgram: ', testNgram);

  return new Promise((resolve, reject) => {
    global.distribution.invertedMetadata.store.get(testNgram, (err, val) => {
      if (err) {
        resolve(err);
      } else {
        // res: [(url, count), ...]
        // Sort by count
        val.sort((a, b) => b[1] - a[1]);
        // Get the top 10 urls
        const urls = val.slice(0, 10).map((url) => url[0]);
        resolve(urls);
      }
    });
  });
}

module.exports = {
  search: search,
};
