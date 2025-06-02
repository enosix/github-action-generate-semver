# GitHub Action: Generate Semantic Version

**GitHub Action to automatically create SemVer tags for a repo**

## Usage

Add the following step to your workflow:

```yaml
- name: Generate Semantic Version
  uses: enosix/github-action-generate-semver@v1
  with:
    bump: patch           # required: 'major', 'minor', 'patch', or 'prerelease'
    github_token: ${{ secrets.GITHUB_TOKEN }}  # optional
    dry_run: false        # optional, default: false
    sha:                  # optional, commit SHA to tag (default: current HEAD)
    prefix: v             # optional, default: "v"
    prerelease_version:   # optional, version to append for prerelease
```

## Commit Message Detection

When `detect_bump` is enabled (default), the action scans commit messages for:
- `[major]` - Triggers a major version bump
- `[minor]` - Triggers a minor version bump
- `[patch]` - Triggers a patch version bump

This detection overrides any value specified in the `bump` input.

## Outputs

| Name                 | Description                                            |
|----------------------|--------------------------------------------------------|
| `version`            | The calculated semantic version (without prefix)       |
| `version_optimistic` | Only the major and minor components (e.g., `2.3`)      |
| `version_tag`        | The full version tag including prefix (e.g., `v2.3.0`) |

## Inputs

| Name                 | Description                                                                                                       | Required | Default |
|----------------------|-------------------------------------------------------------------------------------------------------------------|----------|---------|
| `bump`               | The type of semantic version increment (`major`, `minor`, `patch`, `prerelease`)                                  | Yes      |         |
| `github_token`       | Token to use for pushing tags. Usually `${{ secrets.GITHUB_TOKEN }}`                                              | No       |         |
| `dry_run`            | If `true`, only calculates the new version and exits successfully                                                 | No       | false   |
| `sha`                | Commit SHA to use for tag creation (if different from current HEAD)                                               | No       |         |
| `prefix`             | Prefix for the version tag (e.g., empty, `v`, or `=`)                                                             | No       | v       |
| `prerelease_version` | String to append for prerelease versions                                                                          | No       |         |
| `detect_bump`        | If `true`, automatically detect the type of bump based on commit messages. This will override the specified bump. | No       | true    |

## Outputs

| Name                 | Description                                       |
|----------------------|---------------------------------------------------|
| `version`            | The new semantic version calculated               |
| `version_optimistic` | The major and minor components of the new version |
| `version_tag`        | The version string used to create the tag         |
