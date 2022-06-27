/**
 * Copyright 2021 Kuaichi Inc. All rights reserved.
 *
 * @author yuchuangu
 */

 /**
  * Verifies that images on the page which are lazy loaded do not use scroll
  * events to do so. This can present a problem for search crawlers discovering
  * the images on a page.
  *
  * Usage:
  *
  *     node szse_disclosure.js -o 'szse_20210101.txt'
  */

const puppeteer = require('puppeteer');
const fs = require('fs');

const DEFAULT_VIEWPORT = {
  width: 1400,
  height: 2000,
  deviceScaleFactor: 1,
};

const TXT_RESULT_FILENAME = 'szse_20210101.txt';

const WAIT_FOR = 2000; // Additional seconds to wait after page is considered load.

const argv = require('yargs')
.options({
  'url': {
    alias: 'u',
    describe: 'URL to load',
    default: 'http://www.szse.cn/disclosure/listed/notice/index.html',
    type: 'string',
  },
  'output': {
    alias: 'o',
    describe: 'Output result file',
    type: 'string',
  },
})
.help()
.argv;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async() => {

const browser = await puppeteer.launch({
  //headless: false,
  defaultViewport: DEFAULT_VIEWPORT,
});

// async function waitForNetworkIdle(page, idle='networkidle0') {
//   return new Promise(resolve => {
//     page._client.on('Page.lifecycleEvent', e => {
//       if (e.name === 'networkIdle' && idle === 'networkidle0') {
//         resolve();
//       } else if (e.name === 'networkAlmostIdle' && idle === 'networkidle2') {
//         resolve();
//       }
//     });
//   });
// }

async function screenshotPageAfterQueryCongye(url) {
  const context = await browser.createIncognitoBrowserContext();

  const page = await context.newPage();

  await page.goto(url, {waitUntil: 'networkidle2'});
  console.log("szse");

  await page.waitFor(WAIT_FOR); // Wait a bit more in case other things are loading.

  let x = await page.waitForSelector('tbody');
  var texts = [];
  let res = false
  page.on('response', async(response) => {
    //  http://www.szse.cn/api/disc/announcement/detailinfo?random=0.02383768229406935&pageSize=30&pageNum=24&plateCode=szse
    if (response.url().indexOf("/api/disc/announcement/detailinfo") > 0) {
      // let body = await response.json();
      // console.log("response body: ", body);
      res = true
    }
  });
  for (let nextpage = 1; ; nextpage++) {
    let list = await page.evaluate(() => {
      let cells = document.querySelector('.table').querySelectorAll('tbody tr td');
      var codes = [];
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].innerText.length == 6) {
          codes.push(cells[i].innerText);
        }
      }
      return Promise.resolve(Array.from(codes));
    });

    for (let i = 0; i < list.length; i++) {
      texts.push(list[i]);
    }

    try {
      let selector_name = '#paginator li a[data-pi="'+nextpage+'"]'
      x = await page.waitForSelector(selector_name, {timeout: 100});
      if (x == null) {
        break;
      }
    } catch (error) {
      console.log(nextpage -1, "x paginator not found");
      break
    }
    console.log(nextpage -1, "x paginator found");
    res = false;
    x.click();
    while(!res) {
      await sleep(100);
    }
    await sleep(1000);
  }
  console.log("save codes");

  fs.writeFileSync(argv.output, JSON.stringify(texts), {encoding: 'utf8'});

  await context.close();
}

await screenshotPageAfterQueryCongye(argv.url)

await browser.close();
})();
