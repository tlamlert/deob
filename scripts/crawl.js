const crawl = {};

crawl[map] = (key, url) => {
  return new Promise((resolve) => {
    global.https.get(url, (res) => {
      let page = '';
      res.on('data', (d) => {
        page += d;
      });
      res.on('end', () => {
        global.distribution.pages.store.put(page, url, ()=>{
          let out = {};
          out[url] = 1;
          resolve(out);
        });
      });
    });
  });
};

crawl[reduce] = (key, values) => {
  let out = {};
  out[key] = values.reduce((a, b) => a + b, 0);
  return out;
};
