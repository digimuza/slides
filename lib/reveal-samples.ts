import type { Slide } from "./deck";

const flowParts = [
  { label: "Developer", line: 'Developer["Developer"]' },
  {
    label: "Commits to branch",
    line: 'Developer --> Commit["Commits to branch"]',
  },
  {
    label: "GitHub Actions triggered",
    line: 'Commit --> Trigger["GitHub Actions triggered"]',
  },
  {
    label: "Checks out the repository",
    line: 'Trigger --> Checkout["Checkout repository"]',
  },
  {
    label: "Installs dependencies",
    line: 'Checkout --> Install["Install dependencies"]',
  },
  { label: "Runs tests", line: 'Install --> Tests{"Tests pass?"}' },
  {
    label: "Reports a failed check",
    line: 'Tests -->|No| Failed["Report failed check"]',
  },
  {
    label: "Builds the application",
    line: 'Tests -->|Yes| Build["Build application"]',
  },
  {
    label: "Publishes the build artifact",
    line: 'Build --> Artifact["Upload build artifact"]',
  },
];
export const legacyFlowSource =
  "flowchart LR\n" + flowParts.map((p) => p.line).join("\n");
export const legacyFlowSteps = flowParts.map((p, i) => ({
  label: p.label,
  mermaid:
    "flowchart LR\n" +
    flowParts
      .slice(0, i + 1)
      .map((p) => p.line)
      .join("\n"),
}));
const nodeIds = [
  "developer",
  "commit",
  "trigger",
  "checkout",
  "install",
  "tests",
  "failed",
  "build",
  "artifact",
];
const labels = [
  "Developer",
  "Commits to branch",
  "GitHub Actions triggered",
  "Checkout repository",
  "Install dependencies",
  "Tests pass?",
  "Report failed check",
  "Build application",
  "Upload build artifact",
];
export const flowRevealSlide: Slide = {
  id: "github-flow",
  layout: "flowchart",
  eyebrow: "DEVELOPER WORKFLOW · ONE STEP AT A TIME",
  title: "From commit to a passing build.",
  description:
    "Right reveals the next step. Left goes back. Drag to pan and scroll to zoom.",
  notes:
    "Reveal each handoff, then explain the tests-pass decision. Left or Back step reverses the reveal. After the last step, Next moves to the next slide.",
  steps: flowParts.map((p) => ({ label: p.label })),
  flow: {
    nodes: nodeIds.map((id, step) => ({
      id,
      label: labels[step],
      step,
      kind: step === 5 ? "decision" : "process",
      position: {
        x: (step < 6 ? step : step === 8 ? 7 : 6) * 260,
        y: step === 6 ? -100 : step >= 7 ? 100 : 0,
      },
    })),
    edges: [
      { id: "e1", source: "developer", target: "commit" },
      { id: "e2", source: "commit", target: "trigger" },
      { id: "e3", source: "trigger", target: "checkout" },
      { id: "e4", source: "checkout", target: "install" },
      { id: "e5", source: "install", target: "tests" },
      { id: "e6", source: "tests", target: "failed", label: "No" },
      { id: "e7", source: "tests", target: "build", label: "Yes" },
      { id: "e8", source: "build", target: "artifact" },
    ],
  },
};
export const codeRevealSlide: Slide = {
  id: "github-code",
  layout: "code",
  eyebrow: "GITHUB ACTIONS · BUILD THE WORKFLOW",
  title: "A workflow, revealed line by line.",
  description:
    "Each click adds the next block. Explain the code at your own pace.",
  notes:
    "This illustrative CI workflow assumes an npm project with test and build scripts. Update runtime and action versions for your repository.",
  fileName: ".github/workflows/ci.yml",
  language: "yaml",
  steps: [
    { label: "Name the workflow", code: "name: Branch CI\n" },
    {
      label: "Trigger on branch pushes",
      code: "\non:\n  push:\n    branches: ['**']\n\npermissions:\n  contents: read\n",
    },
    {
      label: "Choose a runner",
      code: "\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n",
    },
    {
      label: "Check out the code",
      code: "      - name: Checkout repository\n        uses: actions/checkout@v4\n",
    },
    {
      label: "Prepare Node.js",
      code: "      - name: Set up Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n          cache: npm\n",
    },
    {
      label: "Install, test, and build",
      code: "      - run: npm ci\n      - run: npm test\n      - run: npm run build\n",
    },
  ],
};
