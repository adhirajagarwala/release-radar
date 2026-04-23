export function scoreUpdate(update) {
  let score = 0;

  if (update.semverChange === "major") score += 50;
  if (update.semverChange === "minor") score += 20;
  if (update.criticality === "high") score += 30;
  if (update.evidence.some((item) => item.includes("breaking"))) score += 20;
  if (update.evidence.some((item) => item.includes("config"))) score += 10;

  return Math.min(score, 100);
}

export function createBrief(update) {
  const riskScore = scoreUpdate(update);
  const riskBand = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

  return {
    ...update,
    riskScore,
    riskBand,
    summary: `${update.name} ${update.currentVersion} -> ${update.targetVersion} is a ${riskBand}-risk update.`,
    recommendation:
      riskBand === "high"
        ? "Roll out behind a checklist and verify config changes before merging."
        : "Safe to evaluate in a normal upgrade cycle."
  };
}
