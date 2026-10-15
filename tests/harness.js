// A tiny test harness with no dependencies, so the same tests run in Node and in a browser.
export function assertEqual(actual, expected, message = "") {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message ? message + ": " : ""}expected ${e}, got ${a}`);
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runTests(tests) {
  return tests.map(({ name, fn }) => {
    try {
      fn();
      return { name, passed: true };
    } catch (error) {
      return { name, passed: false, error: error.message };
    }
  });
}
