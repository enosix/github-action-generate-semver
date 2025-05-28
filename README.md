Here’s a concise README draft for your GitHub Action, including usage and all available parameters:

---

# GitHub Action: Generate Semantic Version

**GitHub Action to automatically create SemVer tags for a repo

## Usage

Add the following step to your workflow:

```yaml
- name: Generate Semantic Version
  uses: enosix/github-action-generate-semver@v1
  with:
    bump: patch           # required: 'major', 'minor', 'patch', or 'prerelease'
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # optional
    dry_run: false        # optional, default: false
    sha:                  # optional, commit SHA to tag (default: current HEAD)
    prefix: v             # optional, default: "v"
    prerelease_version:   # optional, version to append for prerelease
```

## Inputs

| Name               | Description                                                                                 | Required | Default   |
|--------------------|--------------------------------------------------------------------------------------------|----------|-----------|
| `bump`             | The type of semantic version increment (`major`, `minor`, `patch`, `prerelease`)           | Yes      |           |
| `GITHUB_TOKEN`     | Token to use for pushing tags. Usually `${{ secrets.GITHUB_TOKEN }}`                       | No       |           |
| `dry_run`          | If `true`, only calculates the new version and exits successfully                          | No       | false     |
| `sha`              | Commit SHA to use for tag creation (if different from current HEAD)                        | No       |           |
| `prefix`           | Prefix for the version tag (e.g., empty, `v`, or `=`)                                      | No       | v         |
| `prerelease_version`| String to append for prerelease versions                                                  | No       |           |

## Outputs

| Name                 | Description                                               |
|----------------------|----------------------------------------------------------|
| `version`            | The new semantic version calculated                      |
| `version_optimistic` | The major and minor components of the new version        |
| `version_tag`        | The version string used to create the tag                |

---
