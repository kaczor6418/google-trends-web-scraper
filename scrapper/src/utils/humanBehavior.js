/**
 * Creates a randomized pause to simulate human hesitation.
 */
export const humanDelay = (min = 2000, max = 5000) =>
  new Promise(res => setTimeout(res, Math.floor(Math.random() * (Number(max) - Number(min) + 1) + Number(min))));

/**
 * Natural, randomized smooth scroll to the bottom of a container.
 */
export async function humanLikeScroll(page, selector = ".Jh24Ne") {
  await page.evaluate(async (sel) => {
    let container = document.querySelector(sel) || document.documentElement;
    await new Promise((resolve) => {
      const scrollStep = () => {
        const randomDistance = Math.floor(Math.random() * 200) + 150;
        const randomDelay = Math.floor(Math.random() * 150) + 100;
        container.scrollBy({ top: randomDistance, behavior: 'smooth' });
        const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
        if (isAtBottom) resolve();
        else setTimeout(scrollStep, randomDelay);
      };
      scrollStep();
    });
  }, selector);
}

/**
 * Mimics a physical mouse movement and click action.
 */
export async function humanClick(page, locator) {
  const box = await locator.boundingBox();
  if (box) {
    await page.mouse.move(
      box.x + box.width / 2 + (Math.random() * 10 - 5),
      box.y + box.height / 2 + (Math.random() * 10 - 5),
      { steps: 15 }
    );
    await humanDelay(600, 1200);
    await page.mouse.down();
    await humanDelay(100, 200);
    await page.mouse.up();
  } else {
    await locator.click();
  }
}