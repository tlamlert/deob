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

  return new Promise((resolve, reject) => {
    let numNgramsProcessed = 0;
    let finalUrlsMap = new Map();
    for (const ngram of ngrams) {
      global.distribution.invertedMetadata.store.get(ngram, (err, val) => {
        if (err) {
          resolve(err);
        } else {
          // Update continuation thing
          numNgramsProcessed++;

          // Update finalUrlsMap (val = [[url, count], ...])
          for (const urlCount of val) {
            const key = urlCount[0];
            const count = urlCount[1];
            if (finalUrlsMap.has(key)) {
              finalUrlsMap.set(key, finalUrlsMap.get(key) + count);
            } else {
              finalUrlsMap.set(key, count);
            }
          }

          // Finished processing all ngrams; create final url list
          if (numNgramsProcessed === ngrams.length) {
            let finalUrls = [];
            for (const [url, count] of finalUrlsMap) {
              finalUrls.push([url, count]);
            }

            // Sort finalUrls count
            finalUrls.sort((a, b) => b[1] - a[1]);

            // Get the top 10 urls
            const urls = finalUrls.slice(0, 10).map((url) => url[0]);
            // resolve(urls);
            // ----------------------------- Metadata Extra Credit ------------------------//
            // Get the actual titles for these urls
            let numRetrieved = 0;
            let titles = [];
            urls.forEach((url) => {
              global.distribution.bookMetadata.store.get(url, (e, title) => {
                numRetrieved++;
                titles.push([title, url]); // Note: this pushes back the corresponding title & url pair
                // We can also easily do regex matching here to grab more specific areas than just the title
                if (titles.length === urls.length) {
                  resolve(titles);
                }
              });
            });
            // ----------------------------- Metadata Extra Credit End ------------------------//
          }
        }
      });
    }

    // console.log('search query: ', query);
    // global.distribution.invertedMetadata.store.get(testNgram, (err, val) => {
    //   console.log('err: ', err);
    //   if (err) {
    //     resolve(err);
    //   } else {
    //     // res: [(url, count), ...]
    //     // Sort by count
    //     val.sort((a, b) => b[1] - a[1]);
    //     // Get the top 10 urls
    //     const urls = val.slice(0, 10).map((url) => url[0]);
    //     resolve(urls);
    //   }
    // });
  });
}

module.exports = {
  search: search,
};
