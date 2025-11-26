# Testing Documentation

## Quick Start

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

## Test Framework

This project uses **Vitest** with a Jest-compatible API. If you're familiar with Jest, you already know how to use Vitest.

## Test Examples

### 1. Service Tests

See `src/lib/services/fantasySeasonService.test.ts` for examples of:
- Mocking PocketBase
- Testing async operations
- Validating business logic
- Testing error cases

### 2. Schema Validation Tests

See `src/lib/schemas/fantasy.test.ts` for examples of:
- Testing Zod schemas
- Validating input constraints
- Testing default values
- Testing optional fields

### 3. Component Tests (Example)

See `src/lib/components/SeasonCard.test.ts` for the pattern to test Svelte components.

## Writing New Tests

### 1. Create test file next to source

```
src/lib/services/
├── myService.ts
└── myService.test.ts
```

### 2. Import testing utilities

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
```

### 3. Write tests

```typescript
describe('MyService', () => {
  it('should do something', () => {
    expect(1 + 1).toBe(2);
  });
});
```

## Mocking PocketBase

```typescript
const mockCreate = vi.fn();
const mockGetOne = vi.fn();

vi.mock('$lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(() => ({
      create: mockCreate,
      getOne: mockGetOne,
      getFullList: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }))
  }
}));

// In your test
mockCreate.mockResolvedValue({ id: '123', name: 'Test' });
```

## Test Fixtures

Use fixtures for consistent test data:

```typescript
import { createMockSeason } from '../../test/fixtures/fantasy-season';

const season = createMockSeason({
  name: 'Custom Name',
  status: 'active'
});
```

## Best Practices

1. **Test behavior, not implementation**
2. **Use descriptive test names** - `it('should reject invalid email format')`
3. **Arrange-Act-Assert pattern**
4. **Mock external dependencies**
5. **Keep tests isolated and independent**
6. **Use fixtures for reusable test data**

## Coverage Goals

- Aim for >80% coverage on services and utilities
- Focus on critical business logic
- Don't obsess over 100% coverage

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment checks

## Troubleshooting

### Tests not running?
```bash
# Clear cache and retry
rm -rf node_modules/.vite
pnpm test
```

### Mock not working?
- Ensure `vi.clearAllMocks()` in `beforeEach()`
- Check mock is defined before the test runs
- Verify import paths match exactly

### Type errors in tests?
- Install `@types/jest` for better IDE support
- Use `as any` sparingly for complex mocks

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/svelte-testing-library/intro/)
- [Jest API Reference](https://jestjs.io/docs/api) (compatible with Vitest)
