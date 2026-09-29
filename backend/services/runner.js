// Executes blocks in a real browser, step by step, calling onStep
// after every single step — this is what powers the live view later.

const { chromium } = require("playwright");

async function runBlocksLive(blocks, onStep) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const results = [];
  let overallPass = true;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    let stepResult;

    try {
      switch (block.action) {
        case "navigate":
          await page.goto(block.value, { timeout: 15000 });
          break;
        case "click":
          await page.click(block.target, { timeout: 15000 });
          break;
        case "type":
          await page.fill(block.target, block.value, { timeout: 15000 });
          break;
        case "wait":
          await page.waitForSelector(block.target, { timeout: 15000 });
          break;
        case "assert":
          await page.waitForFunction(
            (text) => document.body.innerText.includes(text),
            block.value,
            { timeout: 15000 }
          );
          break;
        case "screenshot":
          await page.screenshot({ path: `screenshot_${i}.png` });
          break;
        default:
          throw new Error(`Unknown action: ${block.action}`);
      }
      stepResult = { index: i, action: block.action, status: "passed" };
    } catch (err) {
      stepResult = {
        index: i,
        action: block.action,
        status: "failed",
        errorMessage: err.message,
      };
      overallPass = false;
    }

    results.push(stepResult);
    if (onStep) onStep(stepResult); // live update fires here, per step

    if (stepResult.status === "failed") break;
  }

  await browser.close();
  return { overallPass, results };
}

module.exports = { runBlocksLive };