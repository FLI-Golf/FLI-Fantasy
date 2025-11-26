# Testing Guide

This project uses **Vitest** for testing, which provides a Jest-compatible API with better Vite integration.

## Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (re-runs on file changes)
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

## Test Structure

```
src/
├── lib/
│   └── services/
│       ├── fantasySeasonService.ts
│       └── fantasySeasonService.test.ts    # Tests next to source files
└── test/
    ├── setup.ts                             # Global test setup
    ├── mocks/
    │   └── pocketbase.ts                    # Mock utilities for PocketBase
    └── fixtures/
        └── fantasy-season.ts                # Test data fixtures
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('MyService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Mocking PocketBase

```typescript
import { vi } from 'vitest';

const mockCreate = vi.fn();
const mockGetOne = vi.fn();

vi.mock('$lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      create: mockCreate,
      getOne: mockGetOne
    }))
  }
}));

// In your test
mockCreate.mockResolvedValue({ id: '123', name: 'Test' });
```

### Using Fixtures

```typescript
import { createMockSeason } from '../../test/fixtures/fantasy-season';

const season = createMockSeason({
  name: 'Custom Season Name',
  status: 'active'
});
```

## Test Coverage

Run `pnpm test:coverage` to generate a coverage report. The report will be available in:
- Terminal output (text format)
- `coverage/index.html` (HTML format)

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how it does it
2. **Use descriptive test names** - Test names should clearly describe what is being tested
3. **Arrange-Act-Assert** - Structure tests with setup, execution, and verification
4. **Mock external dependencies** - Mock PocketBase, APIs, and other external services
5. **Keep tests isolated** - Each test should be independent and not rely on others
6. **Use fixtures for test data** - Reuse common test data through fixtures

## Vitest vs Jest

Vitest uses the same API as Jest, so most Jest documentation applies:

- `describe()` - Group related tests
- `it()` / `test()` - Define individual tests
- `expect()` - Make assertions
- `beforeEach()` / `afterEach()` - Setup/teardown
- `vi.fn()` - Create mock functions (equivalent to `jest.fn()`)
- `vi.mock()` - Mock modules (equivalent to `jest.mock()`)

Key differences:
- Vitest is faster and has better ESM support
- Vitest integrates natively with Vite
- Use `vi` instead of `jest` for mocking utilities
