/**
 * Open the local app URL in the default browser (Windows / macOS / Linux).
 * Default matches `npm run dev`: http://127.0.0.1:5173/
 */
import { exec } from "node:child_process";

const url = process.env.DEV_URL ?? "http://127.0.0.1:5173/";

function openBrowser() {
  if (process.platform === "win32") {
    exec(`start ${url}`, { shell: true });
  } else if (process.platform === "darwin") {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

openBrowser();
