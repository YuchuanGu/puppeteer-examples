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
  *     node sse_disclosure.js -o 'sse_20210101.txt'
  */

const puppeteer = require('puppeteer');
const fs = require('fs');

const DEFAULT_VIEWPORT = {
  width: 1400,
  height: 2000,
  deviceScaleFactor: 1,
};

const TXT_RESULT_FILENAME = 'sse_20210101.txt';

const WAIT_FOR = 2000; // Additional seconds to wait after page is considered load.

const argv = require('yargs')
.options({
  'url': {
    alias: 'u',
    describe: 'URL to load',
    default: 'http://www.sse.com.cn/disclosure/listedinfo/regular/',
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
  console.log("sse");

  await page.waitFor(WAIT_FOR); // Wait a bit more in case other things are loading.

  let x = await page.waitForSelector('tbody');

  let list = await page.evaluate(() => {
    let cells = document.querySelector('tbody').querySelectorAll('tr td');
    // for (let i = 0; i < cells.length; i++) {
    //   console.log(cells[i]);
    // }
    var textObject = {}
    for (let i = 0; i < cells.length; i++) {
      textObject[cells[i].innerText] = true;
    }
    var texts = []
    for (const text in textObject) {
      if (text.length == 6) {
        texts.push(text);
      }
    }
    return Promise.resolve(Array.from(texts));
  });

  fs.writeFileSync(argv.output, JSON.stringify(list), {encoding: 'utf8'});

  await context.close();
}

await screenshotPageAfterQueryCongye(argv.url)

await browser.close();
})();
