// Copies only the public site files into dist/ for Cloudflare Pages.
// Everything else in the project (tests, PDF, .claude/, node_modules) stays out of the upload.
import { cpSync, rmSync } from "node:fs";

const SITE_FILES = ["index.html", "styles.css", "src"];

rmSync("dist", { recursive: true, force: true });
for (const path of SITE_FILES) {
  cpSync(path, `dist/${path}`, { recursive: true });
}
console.log(`Built dist/ with: ${SITE_FILES.join(", ")}`);
