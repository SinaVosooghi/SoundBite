# Husky Git Hooks

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/) for the SoundBite project.

## Hooks

### Pre-commit Hook (`.husky/pre-commit`)
- Runs linting and tests **only on changed files** for optimal performance
- Uses custom script `scripts/lint-changed-files.js`
- Automatically fixes ESLint issues where possible
- Runs related tests if test files exist

### Commit Message Hook (`.husky/commit-msg`)
- Validates commit messages using [commitlint](https://commitlint.js.org/)
- Enforces [Conventional Commits](https://www.conventionalcommits.org/) format
- Ensures consistent commit message style across the project

## Configuration

### Lint-staged (package.json)
```json
{
  "lint-staged": {
    "*.{ts,js,tsx,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Commitlint (commitlint.config.js)
- Enforces conventional commit format
- Supports types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Validates subject case, length, and formatting

## Usage

Hooks run automatically when you:
- `git commit` - Pre-commit hook runs linting and tests
- `git commit -m "message"` - Commit message hook validates format

## Performance Benefits

- **Changed files only**: Only lints and tests files that have been modified
- **Parallel execution**: Linting and testing run in parallel where possible
- **Early feedback**: Catches issues before they reach CI/CD pipeline
- **Consistent formatting**: Automatically formats code on commit

## Troubleshooting

If hooks fail:
1. Fix the linting errors shown in the output
2. Fix any failing tests
3. Ensure commit message follows conventional format
4. Re-run `git commit`

To bypass hooks (not recommended):
```bash
git commit --no-verify -m "message"
```

