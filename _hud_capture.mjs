import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto("http://localhost:3000", { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(5000);

// Inject status bars and hide menus so HUD is clearly visible
await page.evaluate(() => {
  const stack = document.querySelector(".mc-hotbar-stack");
  if (!stack) return;
  const inventory = stack.querySelector(".collected-inventory");
  if (!inventory) return;

  const bars = document.createElement("div");
  bars.className = "mc-status-bars";
  bars.innerHTML = `
    <div class="mc-status-bars-row">
      <div class="mc-status-icons">
        ${Array(10).fill('<img src="/textures/UI/heart-full.svg" alt="" width="18" height="18" class="mc-status-icon" />').join("")}
      </div>
      <div class="mc-status-icons mc-status-icons--hunger">
        ${Array(9).fill('<img src="/textures/UI/hunger-full.svg" alt="" width="18" height="18" class="mc-status-icon" />').join("")}
        <img src="/textures/UI/hunger-half.svg" alt="" width="18" height="18" class="mc-status-icon" />
      </div>
    </div>
    <div class="mc-xp-wrapper">
      <div class="mc-xp-level">0</div>
      <div class="mc-xp-track">
        <div class="mc-xp-fill" style="width: 0%"></div>
      </div>
    </div>
  `;
  stack.insertBefore(bars, inventory);
  document.querySelectorAll(".mc-title-dim, .mc-menu-root").forEach(el => el.style.display = "none");
});

await page.waitForTimeout(2000);

// Take full page screenshot
await page.screenshot({ path: "hud_preview.png", fullPage: false });

// Take cropped HUD screenshot
await page.screenshot({
  path: "hud_preview_cropped.png",
  clip: { x: 250, y: 420, width: 780, height: 300 },
});

console.log("Done");
await browser.close();
