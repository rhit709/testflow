// Converts a block sequence into real Playwright code (for display/download only).

function generateScript(blocks) {
  const lines = [];

  blocks.forEach((block) => {
    switch (block.action) {
      case "navigate":
        lines.push(`await page.goto("${block.value}");`);
        break;
      case "click":
        lines.push(`await page.click("${block.target}");`);
        break;
      case "type":
        lines.push(`await page.fill("${block.target}", "${block.value}");`);
        break;
      case "wait":
        lines.push(`await page.waitForSelector("${block.target}");`);
        break;
      case "assert":
        lines.push(
          `await expect(page.locator("body")).toContainText("${block.value}");`
        );
        break;
      case "screenshot":
        lines.push(`await page.screenshot({ path: "step.png" });`);
        break;
      default:
        throw new Error(`Unknown block action: ${block.action}`);
    }
  });

  return lines.join("\n");
}

module.exports = { generateScript };