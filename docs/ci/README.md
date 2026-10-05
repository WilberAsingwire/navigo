# Enabling CI

GitHub blocks automation tokens from creating workflow files, so the CI
config lives here. To enable it, move it into place and push:

```bash
mkdir -p .github/workflows
git mv docs/ci/github-actions-ci.yml .github/workflows/ci.yml
git commit -m "ci: enable GitHub Actions"
git push
```
