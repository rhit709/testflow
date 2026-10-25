const { chromium } = require("playwright");
const { findElementWithHealing } = require("./selfHealing");

async function runBlocksLive(blocks, onStep) {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"], // required inside containers
  });
  const page = await browser.newPage();
  const results = [];
  let overallPass = true;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    let stepResult;

    try {
      let healInfo = null;

      switch (block.action) {
        case "navigate":
          await page.goto(block.value, { timeout: 15000 });
          break;

        case "click": {
          const found = await findElementWithHealing(page, block.target);
          await found.locator.click({ timeout: 15000 });
          if (found.healed) healInfo = found;
          break;
        }

        case "type": {
          const found = await findElementWithHealing(page, block.target);
          await found.locator.fill(block.value, { timeout: 15000 });
          if (found.healed) healInfo = found;
          break;
        }

        case "wait": {
          const found = await findElementWithHealing(page, block.target);
          if (found.healed) healInfo = found;
          break;
        }

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
      if (healInfo) {
        stepResult.healed = true;
        stepResult.healedStrategy = healInfo.strategyUsed;
        stepResult.healedSelector = healInfo.selectorUsed;
      }
    } catch (err) {
      stepResult = { index: i, action: block.action, status: "failed", errorMessage: err.message };
      overallPass = false;
    }

    results.push(stepResult);
    if (onStep) onStep(stepResult);
    if (stepResult.status === "failed") break;
  }

  await browser.close();
  return { overallPass, results };
}

module.exports = { runBlocksLive };