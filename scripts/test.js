import assert from "node:assert/strict";
import test from "node:test";
import { createBrief, scoreUpdate } from "../src/brief.js";

test("scoreUpdate raises risk for major high-criticality changes", () => {
  const score = scoreUpdate({
    semverChange: "major",
    criticality: "high",
    evidence: ["breaking change noted in migration guide", "config changes required"]
  });
  assert.ok(score >= 90);
});

test("createBrief returns readable recommendation", () => {
  const brief = createBrief({
    name: "next",
    currentVersion: "14.1.0",
    targetVersion: "15.0.0",
    semverChange: "major",
    criticality: "high",
    evidence: ["breaking change noted in migration guide"]
  });
  assert.equal(brief.riskBand, "high");
  assert.ok(brief.summary.includes("next 14.1.0 -> 15.0.0"));
});
