import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

/** Prints all "warning" annotations at the end. */
export default class WarningsReporter implements Reporter {
  private warnings = new Set<string>();

  onTestEnd(test: TestCase, result: TestResult) {
    for (const a of [...test.annotations, ...result.annotations]) {
      if (a.type === "warning" && a.description) this.warnings.add(a.description);
    }
  }

  onEnd() {
    if (this.warnings.size === 0) return;
    console.log(`\n⚠ Warnings (${this.warnings.size}), not failing the run:`);
    for (const w of [...this.warnings].sort()) console.log(`  - ${w}`);
  }

  printsToStdio() {
    return false;
  }
}
