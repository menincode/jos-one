---
name: testing-automation
description: Best practices and patterns for test automation, CI/CD integration, and test orchestration
---

# Test Automation

## Description

Test automation patterns for CI/CD integration, test orchestration, parallel execution, and automated test reporting. Strategies for maintaining reliable automated test suites.

## When to Use

- CI/CD pipeline integration
- Automated test execution
- Test reporting and analytics
- Parallel test execution
- Test data management
- Test environment management

---

## Core Patterns

### CI/CD Integration - GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Test Scripts Configuration

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

### Parallel Test Execution

```typescript
// jest.config.js
module.exports = {
  maxWorkers: process.env.CI ? 2 : '50%',
  testTimeout: 10000,
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testEnvironment: 'node',
    },
  ],
};
```

### Test Sharding

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  workers: process.env.CI ? 2 : undefined,
  shard: {
    total: parseInt(process.env.SHARD_TOTAL || '1'),
    current: parseInt(process.env.SHARD_CURRENT || '0'),
  },
});
```

### Test Data Management

```typescript
// test-data/factory.ts
export class UserFactory {
  static create(overrides?: Partial<User>): User {
    return {
      id: faker.datatype.number(),
      email: faker.internet.email(),
      name: faker.name.fullName(),
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createMany(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

// Usage in tests
const user = UserFactory.create({ email: 'test@example.com' });
const users = UserFactory.createMany(10);
```

### Test Environment Configuration

```typescript
// config/test-env.ts
export const testConfig = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
  apiUrl: process.env.TEST_API_URL || 'http://localhost:8000',
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    name: process.env.TEST_DB_NAME || 'testdb',
    user: process.env.TEST_DB_USER || 'test',
    password: process.env.TEST_DB_PASSWORD || 'test',
  },
  timeout: {
    short: 5000,
    medium: 10000,
    long: 30000,
  },
};
```

### Test Reporting

```typescript
// jest.config.js
module.exports = {
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-results',
        filename: 'report.html',
        expand: true,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: './test-results',
        outputName: 'junit.xml',
      },
    ],
  ],
  coverageReporters: ['text', 'lcov', 'html', 'json'],
};
```

### Test Retry Strategy

```typescript
// retry-config.ts
export const retryConfig = {
  unit: {
    retries: 0,
    timeout: 5000,
  },
  integration: {
    retries: 1,
    timeout: 10000,
  },
  e2e: {
    retries: process.env.CI ? 2 : 0,
    timeout: 30000,
  },
};
```

### Test Tags and Filtering

```typescript
// test-tags.ts
export const TestTags = {
  UNIT: '@unit',
  INTEGRATION: '@integration',
  E2E: '@e2e',
  SLOW: '@slow',
  SMOKE: '@smoke',
  REGRESSION: '@regression',
} as const;

// Usage
test('should create user @unit @smoke', () => {
  // Test implementation
});

// Run only smoke tests
// npm run test -- --grep "@smoke"
```

### Test Database Management

```typescript
// test-db.ts
import { Pool } from 'pg';

export class TestDatabase {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.TEST_DB_HOST,
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME,
      user: process.env.TEST_DB_USER,
      password: process.env.TEST_DB_PASSWORD,
    });
  }

  async setup() {
    await this.pool.query('BEGIN');
  }

  async cleanup() {
    await this.pool.query('ROLLBACK');
  }

  async close() {
    await this.pool.end();
  }

  async seed(data: any) {
    // Seed test data
  }

  async truncate(tables: string[]) {
    await this.pool.query(`TRUNCATE TABLE ${tables.join(', ')} CASCADE`);
  }
}
```

### Test Monitoring and Alerts

```typescript
// test-monitor.ts
export class TestMonitor {
  async trackTestRun(testName: string, duration: number, status: 'pass' | 'fail') {
    // Send metrics to monitoring service
    await fetch('https://monitoring.example.com/metrics', {
      method: 'POST',
      body: JSON.stringify({
        test: testName,
        duration,
        status,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  async alertOnFailure(testName: string, error: Error) {
    // Send alert on test failure
    // Integration with Slack, email, etc.
  }
}
```

## Best Practices

1. **CI/CD Integration**
   - Run tests on every commit
   - Use test result artifacts
   - Fail fast on critical tests
   - Parallelize test execution

2. **Test Organization**
   - Use test tags for filtering
   - Separate unit, integration, and E2E tests
   - Use test factories for data
   - Keep tests independent

3. **Performance**
   - Run tests in parallel
   - Use test sharding for large suites
   - Optimize test execution time
   - Cache dependencies

4. **Reliability**
   - Implement retry strategies
   - Use proper timeouts
   - Clean up test data
   - Isolate test environments

5. **Reporting**
   - Generate test reports
   - Track test metrics
   - Monitor test trends
   - Alert on failures

6. **Environment Management**
   - Use environment variables
   - Separate test environments
   - Use containers for services
   - Clean up after tests

## Common Pitfalls

- **No parallelization**: Run tests in parallel
- **Slow tests**: Optimize test execution
- **Flaky tests**: Ensure proper isolation
- **No reporting**: Generate test reports
- **Shared test data**: Use unique test data
- **No cleanup**: Clean up after tests
- **Hardcoded values**: Use configuration

## Advanced Patterns

### Test Matrix Strategy

```yaml
# .github/workflows/test-matrix.yml
strategy:
  matrix:
    node-version: [16, 18, 20]
    os: [ubuntu-latest, windows-latest, macos-latest]
```

### Test Result Aggregation

```typescript
// aggregate-results.ts
export async function aggregateTestResults(results: TestResult[]) {
  return {
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    duration: results.reduce((sum, r) => sum + r.duration, 0),
    coverage: calculateCoverage(results),
  };
}
```

### Test Execution Orchestration

```typescript
// test-orchestrator.ts
export class TestOrchestrator {
  async runTestSuite() {
    const results = {
      unit: await this.runUnitTests(),
      integration: await this.runIntegrationTests(),
      e2e: await this.runE2ETests(),
    };

    return this.generateReport(results);
  }
}
```