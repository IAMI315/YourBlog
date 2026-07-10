import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DEPCRUISE_CLI = resolve(
  REPOSITORY_ROOT,
  "node_modules/dependency-cruiser/bin/dependency-cruise.mjs",
);
const CONFIG = resolve(REPOSITORY_ROOT, "dependency-cruiser.cjs");
const TSCONFIG = resolve(REPOSITORY_ROOT, "tsconfig.json");
const FIXTURES_ROOT = resolve(REPOSITORY_ROOT, "tests/fixtures/architecture");

type CruiseResult = {
  summary: {
    error: number;
    totalCruised: number;
    violations: Array<{ rule: { name: string } }>;
  };
};

function cruiseFixture(fixtureName: string) {
  const processResult = spawnSync(
    process.execPath,
    [
      DEPCRUISE_CLI,
      "src",
      "--config",
      CONFIG,
      "--ts-config",
      TSCONFIG,
      "--output-type",
      "json",
    ],
    {
      cwd: resolve(FIXTURES_ROOT, fixtureName),
      encoding: "utf8",
    },
  );

  if (!processResult.stdout) {
    throw new Error(processResult.stderr || "dependency-cruiser produced no JSON output");
  }

  return {
    status: processResult.status,
    result: JSON.parse(processResult.stdout) as CruiseResult,
  };
}

describe("architecture boundaries", () => {
  it.each([
    ["cycle", "no-circular"],
    ["cross-feature", "no-cross-feature-internals"],
  ])("rejects the %s fixture", (fixtureName, ruleName) => {
    const cruise = cruiseFixture(fixtureName);

    expect(cruise.result.summary.totalCruised).toBeGreaterThan(0);
    expect(cruise.result.summary.error).toBeGreaterThan(0);
    expect(cruise.result.summary.violations.map((violation) => violation.rule.name)).toContain(
      ruleName,
    );
  });

  it("rejects all forbidden domain dependencies", () => {
    const cruise = cruiseFixture("domain-purity");
    const domainViolations = cruise.result.summary.violations.filter(
      (violation) => violation.rule.name === "domain-stays-pure",
    );

    expect(cruise.result.summary.totalCruised).toBeGreaterThan(0);
    expect(domainViolations).toHaveLength(9);
  });

  it("allows imports through another feature's public module", () => {
    const cruise = cruiseFixture("public-import");

    expect(cruise.status).toBe(0);
    expect(cruise.result.summary.totalCruised).toBeGreaterThan(0);
    expect(cruise.result.summary.error).toBe(0);
    expect(cruise.result.summary.violations).toEqual([]);
  });
});
