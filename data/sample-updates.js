export const sampleUpdates = [
  {
    name: "next",
    currentVersion: "14.1.0",
    targetVersion: "15.0.0",
    semverChange: "major",
    criticality: "high",
    evidence: ["breaking change noted in migration guide", "config changes required"]
  },
  {
    name: "zod",
    currentVersion: "3.22.4",
    targetVersion: "3.23.0",
    semverChange: "minor",
    criticality: "medium",
    evidence: ["no reported breaking changes", "new validation helpers"]
  }
];
