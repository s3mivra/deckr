// Renders client/og/og-source.html to client/public/og.png at 1200x630 using
// whichever Chrome or Edge is installed. Run with: npm run og
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = pathToFileURL(resolve(here, 'og-source.html')).href;
const out = resolve(here, '..', 'public', 'og.png');

const candidates = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  console.error('No Chrome or Edge found. Install one, or open og-source.html and screenshot it at 1200x630.');
  process.exit(1);
}

execFileSync(browser, [
  '--headless',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1200,630',
  `--screenshot=${out}`,
  '--virtual-time-budget=6000',
  src,
], { stdio: 'ignore' });

if (!existsSync(out)) { console.error('Render failed'); process.exit(1); }
console.log(`og.png written (${statSync(out).size} bytes)`);
