const urlExtraction = {};
urlExtraction[map] = (url, rawData) => {
    // convert the given url to a directory
    if (!url.endsWith('.html') && !url.endsWith('/')) {
      url += '/';
    }
    const base = new global.URL(url);

    // init dom object
    const dom = new global.JSDOM(rawData);
    const rawLinks = [...dom.window.document.querySelectorAll('a')];

    // construct output
    let out = [];
    rawLinks.forEach((link) => {
      let o = {};
      o[new URL(link, base).href] = 1;
      out.push(o);
    });
    return out;
  };

urlExtraction[reduce] = (key, values) => {
    // // filter out duplicates and store in distribution group
    // const uniqueLinks = [...new Set(values)];
    // uniqueLinks.forEach((link) => {
    //   distribution.crawler.store.put(link, link);
    // });

    // construct output
    let out = {};
    out[key] = values.length;
    return out;
  };