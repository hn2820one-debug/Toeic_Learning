/**
 * Start `next dev` then open the default browser after a short delay
 * so the first request hits a ready server.
 */
import { spawn } from "node:child_process";
import { exec } from "node:child_process";

const url = process.env.DEV_URL ?? "http://127.0.0.1:5173/";
const delayMs = Number(process.env.DEV_OPEN_DELAY_MS ?? "5000");

function openBrowser() {
  if (process.platform === "win32") {
    exec(`start ${url}`, { shell: true });
  } else if (process.platform === "darwin") {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

setTimeout(() => {
  console.log(`\n[open] ${url}\n`);
  openBrowser();
}, delayMs);

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";
const child = spawn(npmCmd, ["run", "dev"], {
  stdio: "inherit",
  shell: isWin,
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
