// Node entry point: `node tests/run.js` (or `npm test`). Exits with code 1 on any failure.
import { runTests } from "./harness.js";
import { tests } from "./pricing.tests.js";

const results = runTests(tests);
for (const r of results) {
  console.log(`${r.passed ? "PASS" : "FAIL"}  ${r.name}${r.passed ? "" : `\n      ${r.error}`}`);
}
const failed = results.filter((r) => !r.passed).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
