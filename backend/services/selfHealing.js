// services/selfHealing.js
// Rule-based self-healing: if the original selector fails, try a fixed
// priority list of alternate CSS strategies before giving up.

function extractKeyword(selector) {
  // Strip CSS syntax (#, ., [], quotes) to get the core identifying word
  // e.g. "#loginBtn" -> "loginBtn", ".search-input" -> "search-input"
  const cleaned = selector.replace(/^[#.]/, "").replace(/[\[\]="']/g, "");
  const match = cleaned.match(/[a-zA-Z0-9_-]+/);
  return match ? match[0] : null;
}

async function findElementWithHealing(page, originalSelector, timeout = 15000) {
  // Strategy 0: try the original selector first, untouched
  try {
    const el = page.locator(originalSelector).first();
    await el.waitFor({ state: "visible", timeout: 3000 });
    return { locator: el, healed: false, strategyUsed: "original", selectorUsed: originalSelector };
  } catch {
    // fall through to healing
  }

  const keyword = extractKeyword(originalSelector);
  if (!keyword) {
    throw new Error(`Element not found: "${originalSelector}" (no keyword to heal with)`);
  }

  const strategies = [
    { name: "id contains keyword", selector: `[id*="${keyword}" i]` },
    { name: "name attribute contains keyword", selector: `[name*="${keyword}" i]` },
    { name: "data-testid contains keyword", selector: `[data-testid*="${keyword}" i]` },
    { name: "aria-label contains keyword", selector: `[aria-label*="${keyword}" i]` },
    { name: "class contains keyword", selector: `[class*="${keyword}" i]` },
    { name: "placeholder contains keyword", selector: `[placeholder*="${keyword}" i]` },
    { name: "visible text match", selector: `text=${keyword}` },
  ];

  for (const strategy of strategies) {
    try {
      const el = page.locator(strategy.selector).first();
      await el.waitFor({ state: "visible", timeout: 2000 });
      return { locator: el, healed: true, strategyUsed: strategy.name, selectorUsed: strategy.selector };
    } catch {
      continue; // try the next strategy
    }
  }

  throw new Error(
    `Element not found: "${originalSelector}" — self-healing tried ${strategies.length} fallback strategies, none matched`
  );
}

module.exports = { findElementWithHealing, extractKeyword };