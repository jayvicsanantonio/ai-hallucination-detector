# Test Coverage Setup

## Coveralls Integration

This project uses [Coveralls](https://coveralls.io/) for test coverage reporting, which is an open source alternative that doesn't require external tokens.

### Features

- ✅ **No secrets required** for public repositories
- ✅ **Automatic coverage reporting** on every PR and push
- ✅ **Coverage trends** and history tracking
- ✅ **GitHub integration** with status checks
- ✅ **Free for open source** projects

### Setup (Optional)

For public repositories, Coveralls works automatically with the GitHub token. For private repositories or enhanced features:

1. Visit [coveralls.io](https://coveralls.io/)
2. Sign in with your GitHub account
3. Enable the repository
4. Coverage reports will appear automatically

### Local Coverage

Generate coverage reports locally:

```bash
# Run tests with coverage
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Coverage Files

- `coverage/lcov.info` - Coverage data for Coveralls
- `coverage/lcov-report/` - HTML coverage report
- `coverage/coverage-final.json` - JSON coverage data

### GitHub Actions

The workflow automatically:

1. Runs all tests with coverage
2. Generates LCOV coverage report
3. Uploads to Coveralls using GitHub token
4. Updates PR with coverage status

No additional configuration or secrets needed!
