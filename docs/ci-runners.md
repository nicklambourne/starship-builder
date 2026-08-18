# CI runners

CI for this repository is designed to run on **ubox**, the self-hosted
Actions Runner Controller (ARC) cluster, the same way `byteling` and
`everyscreen` do — with one deliberate difference, described below.

## Why this repo is a special case

Every other repo on the ubox cluster is **private**. This one is public.

The ubox box runs MicroK8s on the LAN and holds production credentials. The
threat a public repo introduces is a pull request from a fork: without care,
GitHub would happily execute a contributor's workflow changes on that box. The
cluster's own `arc.tf` records this policy explicitly — the public
`nicklambourne` profile repo has no scale set for exactly this reason.

The mitigation here is a runner split enforced in the workflows:

```yaml
runs-on: ${{ (github.event.pull_request.head.repo.fork && 'ubuntu-latest') || vars.SELF_HOSTED_RUNNER || 'ubuntu-latest' }}
```

- **Fork PRs** → GitHub-hosted runners, always. Untrusted code never reaches
  the LAN.
- **Pushes to `main`, manual dispatches, and PRs from branches in this repo**
  → the ubox scale set.
- **No `SELF_HOSTED_RUNNER` variable set** → GitHub-hosted, so CI works before
  the runner exists and degrades gracefully if it is ever removed.

If that split is ever removed from the workflows, the scale set should be
removed from the cluster at the same time.

## Enabling the self-hosted runner

Three steps, all requiring access this repository's tooling does not have
(cluster credentials, the GitHub App, and repository settings).

### 1. Install the ARC GitHub App on this repository

The `arc-github-app` secret in the `arc-runners` namespace authenticates every
scale set. Its GitHub App must be installed on `nicklambourne/starship-builder`
in addition to the existing private repos. No secret needs to change — only the
App's repository access list.

Note the ARC README currently describes the App as installed on "the four
private repos"; that line needs updating once this repo is added.

### 2. Add the scale set to the cluster

In `noodle`, add the values file
`state/ci-cluster/values/starship-builder-values.yaml`:

```yaml
githubConfigUrl: "https://github.com/nicklambourne/starship-builder"
githubConfigSecret: arc-github-app

minRunners: 0
maxRunners: 2

containerMode:
  type: "kubernetes"
  kubernetesModeWorkVolumeClaim:
    accessModes: ["ReadWriteOnce"]
    storageClassName: "microk8s-hostpath"
    resources:
      requests:
        # A pnpm install plus a Next static export; far smaller than the
        # native-toolchain projects on this cluster.
        storage: 10Gi

template:
  spec:
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:2.336.0
        imagePullPolicy: IfNotPresent
        command: ["/home/runner/run.sh"]
        env:
          - name: ACTIONS_RUNNER_REQUIRE_JOB_CONTAINER
            value: "false"
          - name: ACTIONS_RUNNER_CONTAINER_HOOK_TEMPLATE
            value: /home/runner/pod-template/pod-template.yaml
        volumeMounts:
          - name: pod-template
            mountPath: /home/runner/pod-template
            readOnly: true
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
    volumes:
      - name: pod-template
        configMap:
          name: runner-pod-template
```

and register it in `state/ci-cluster/arc.tf`, keeping the reasoning next to the
existing policy comment:

```hcl
  # starship-builder is also public, and is the one deliberate exception. The
  # risk a public repo carries is a fork PR executing attacker-controlled code
  # on a LAN box; that is fenced off workflow-side rather than here. Every job
  # in that repo selects its runner from
  # `github.event.pull_request.head.repo.fork`, so fork PRs are routed to
  # GitHub-hosted runners and never reach this cluster, and the repo requires
  # approval for all outside contributors. If that split is ever removed from
  # the workflows, remove this scale set with it.
  scale_sets = {
    ndlau-deploy     = "${path.module}/values/ndlau-deploy-values.yaml"
    kairno           = "${path.module}/values/kairno-values.yaml"
    everyscreen      = "${path.module}/values/everyscreen-values.yaml"
    byteling         = "${path.module}/values/byteling-values.yaml"
    starship-builder = "${path.module}/values/starship-builder-values.yaml"
  }
```

Then `terraform apply` from `state/ci-cluster/`.

### 3. Point the workflows at it

Once runners register, set the repository variable:

```bash
gh variable set SELF_HOSTED_RUNNER --repo nicklambourne/starship-builder --body starship-builder
```

The value is the **Helm release name** — ARC matches the scale set's
installation name, never a label array. Unsetting the variable moves CI back to
GitHub-hosted runners with no code change.

Also confirm fork-PR approval is at its strictest:

```bash
gh api -X PUT repos/nicklambourne/starship-builder/actions/permissions/workflow \
  -F default_workflow_permissions=read
```

and, in **Settings → Actions → General → Fork pull request workflows**, select
*Require approval for all external contributors*.

## Toolchain notes

ARC runs in Kubernetes container mode with no Docker-in-Docker, so the
`actions/setup-*` actions do not work on these runners. Both workflows
therefore pin their toolchain with a job container (`node:22-bookworm`) and
enable pnpm through corepack. Add tools to the container image rather than
reaching for a setup action.

The default shell in those job containers is `sh` (dash), which cannot
`set -o pipefail`; both workflows set `defaults.run.shell: bash`.
