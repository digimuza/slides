# Transmit CI/CD — meeting script
Read-aloud notes for the 16-slide First Horizon deck. Approximately 12–15 minutes, allowing time for diagrams.

## 1. Transmit CI/CD. From POC to delivery.

Today I’ll walk through how we’re bringing Transmit journeys and configuration into a repeatable delivery process. I’ll start with what we’ve demonstrated in the GitHub Actions proof of concept and what is still in progress. Then I’ll show how the repository connects to our tenants, how developers can work through the portal or with AI, and how we validate and deploy changes. We’ll finish with a practical example of a week of team contributions becoming one dev release, followed by the steps needed to reach production.

## 2. Proven in the POC. Next steps underway.

Let’s establish the current position first. On GitHub Actions, the proof of concept covers five capabilities: Document, Lint, Build, Sync and Debug. Document produces diagrams and references that help us understand the journeys and configuration. That gives us the foundation for managing journeys as code. Two pieces of work are in progress: moving to Bitbucket with Ship CI/CD, and automatically running end-to-end tests after a successful tenant sync. So, when I show Playwright later, that is the verification stage we’re completing. The immediate focus is making this process work consistently for sandbox and dev, before connecting the remaining environments.

## 3. transmit-infrastructure

The repository at the center of this process is transmit-infrastructure. It brings our journeys, TypeScript modules and Transmit configuration into a shared, versioned workflow. From there, we can produce diagrams and references, run automated checks and synchronize connected tenants. It also gives us a history of changes and a way to compare sandbox with dev before a release. That shared context is useful for both engineers and AI: we can look at what changed, understand the intended behavior and investigate a problem against the same version of the configuration.

## 4. Each branch maps to a Transmit tenant.

Each environment branch maps to a Transmit tenant. The sandbox branch is connected to our Develop sandbox tenant, and the dev branch is connected to First Horizon Dev. Those are the two deployment connections we have today. The test and production branches have their intended tenants, but those connections are still planned, which is why they appear as dashed lines. Once the Bitbucket and Ship CI/CD work is complete, we need to connect those remaining environments. This makes the destination of each deployment explicit: the branch determines the tenant.

## 5. Two ways to develop. One sandbox history.

There are two ways for a developer to contribute. They can open a pull request against sandbox, or they can edit a journey directly in the sandbox portal. A code change enters sandbox through the PR workflow. A portal change is automatically captured as a sandbox commit. Portal-generated commits are excluded from the import trigger. In both cases, we get a shared history and a status for the checks associated with that change. That commit status tells us about code validation. The separate check of behavior in the deployed environment will come from the Playwright automation we’re currently adding.

## 6. Four core capabilities.

We can group the process into four capabilities. Develop is how we create and maintain journeys, using code, the portal and AI assistance. Validate is how we check those changes through linting, builds, unit tests and Transmit’s dry run. Deploy is how we import the configuration into the connected tenant; today that means sandbox and dev. Verify is how we check the behavior of the environment after synchronization, using Playwright. That final capability is in progress. I’ll now walk through these in the order an engineer encounters them.

## 7. Start in the portal. Continue with AI.

Imagine we need to adjust a step in an existing journey. We can start in the Transmit portal, where the journey is easy to inspect and edit. That change is then captured in the sandbox branch. With the configuration available as code, we can ask AI to explain the change, compare it with the requirements or help refine the behavior. The useful connection here is between the visual editing experience and the versioned code. Any further code changes follow the same pull request and validation process as other development work.

## 8. Build journeys with agents.

We can also start with a requirement and use an agent to build or update a journey. For example, we could describe a new journey branch and provide the existing configuration as context. The agent can propose the changes, which we can inspect in a sandbox pull request. The same checks then apply: linting, building where needed and validating the journey. The value is that the agent has both the intended behavior and the configuration it needs to work with. We still have a visible change set that can be reviewed before it enters the shared branch.

## 9. TypeScript modules. Automatically included.

For TypeScript modules, the pipeline handles the path from source code to journey configuration. First, we bundle the modules. Then we run automated unit tests against the built artifact—the version we will actually include. Once those tests pass, the build is included in the journeys and metadata is generated. This gives us a repeatable way to package the code and check it before import. Lint and build apply to sandbox, dev and production branches, while the tenant deployment connections currently remain limited to sandbox and dev.

## 10. Investigate issues with Dynatrace logs.

When a journey fails, the configuration tells us what was intended, and the logs help us understand what happened. With access to Dynatrace logs, we can investigate the failure and compare that evidence with the journey and its requirements. AI can help us work through that context and suggest a likely cause or a change to investigate. For example, we can examine why a journey took an unexpected path and use the logs to guide the analysis. A proposed fix then returns through the same development and validation process.

## 11. 34 rules. A shared quality standard.

Journey Man Linter is our tool for applying a consistent quality standard across journeys. It currently has 34 rules covering the conventions and standards we want to maintain. After the build has been included and metadata generated, we also check journey integrity: references, missing fields and missing branches. This helps us catch problems before a configuration is imported into a tenant. If a required check fails, the release needs to be corrected before moving forward. These checks give every contribution the same baseline, whether it came from a developer, the portal or an agent.

## 12. One more check before import.

After our own checks, we ask Transmit to validate the prepared configuration through its native journey validation endpoint. This is the dry run stage. It gives us another check before we perform the actual import. The release path is straightforward: the required pipeline checks must pass, then we review the complete set of changes before merging. If validation fails, we correct the change and run the checks again. That separates preparation of the configuration from the later step that updates the tenant.

## 13. New commit. Full configuration import.

Deployment follows the branch-to-tenant mapping. When a code commit lands on a connected target branch, the automation imports the full configuration into that tenant. For our weekly release, that means merging the sandbox-to-dev PR and updating First Horizon Dev. There is one important distinction: automatic commits generated from portal edits are excluded from the import trigger. Those changes already came from the tenant, so we capture them in version control without importing the same change back. Today, the connected deployment scope covers sandbox and dev.

## 14. Run the full Playwright suite.

A successful import tells us the configuration was synchronized. The next question is whether the journeys behave as expected in that environment. That is the role of the full Playwright test suite. The automation we’re adding will run after a successful sync, against the target environment and using the target branch. In the weekly release example, it will verify dev immediately after the import. This is still in progress. Once connected, it will give us a clear environment verification result alongside the checks we already run on the code.

## 15. One week. One PR. Into dev.

Let’s bring the process together with a week of development. Sree merges one PR into sandbox. Ram updates a journey in the portal, which produces an automatic commit. Rush merges two PRs, and Andrius merges one. All of those changes collect in sandbox with their check status.

At the end of the week, we open one PR from sandbox into dev. It shows the combined changes between the environments. The pipeline runs lint, build and validation, and AI helps review the change set. Once the checks and review are complete, we merge and import into dev. The final step shown here is the full Playwright suite after a successful sync—the verification automation that is currently in progress.

## 16. From sandbox to a verified production release.

Our starting point is the GitHub Actions proof of concept, with sandbox and dev connected and the core Document, Lint, Build, Sync and Debug capabilities demonstrated. The next milestone is to complete the Bitbucket and Ship CI/CD work and add automatic Playwright verification after synchronization. That gives us the full path from sandbox changes to a verified dev release. From there, we need to connect test and production and extend the same process. The target is a release we can trace from its source changes, through validation and review, to verified behavior in production.
