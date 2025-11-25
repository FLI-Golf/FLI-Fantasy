# FLI Fantasy Golf

A fantasy golf application built with SvelteKit, PocketBase, and Tailwind CSS.

## Features

- 🏆 Create and manage fantasy golf seasons
- 👥 Invite participants to join leagues
- ⛳ Draft professional golfers
- 📊 Track scores and standings
- 🎨 Beautiful UI with deep blue, purple, and gold theme

## Tech Stack

- **Frontend:** SvelteKit 2 + TypeScript
- **Backend:** PocketBase (hosted on Railway)
- **Styling:** Tailwind CSS v3 + shadcn-svelte
- **Validation:** Zod
- **Testing:** Vitest
- **Dev Environment:** Gitpod with Dev Containers

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+

### Installation

1. Clone the repository:
```sh
git clone https://github.com/FLI-Golf/FLI-Fantasy.git
cd FLI-Fantasy
```

2. Install dependencies:
```sh
pnpm install
```

3. Set up environment variables:
```sh
cp .env.example .env
# Edit .env with your PocketBase credentials
```

4. Run database migration:
```sh
pnpm migrate:pocketbase
```

**Note:** The migration script will automatically set up 3 collections. You'll need to manually complete 5 additional collections via the PocketBase Admin UI. See [`docs/MIGRATION_STATUS.md`](./docs/MIGRATION_STATUS.md) for details.

5. Start the development server:
```sh
pnpm dev --host
```

Visit the preview URL shown in the terminal.

## Database Setup

The application uses PocketBase for the backend. Database migration is partially automated:

- ✅ **Automated:** 3/8 collections (fantasy_seasons, golfers, tournaments)
- ⚠️ **Manual Setup Required:** 5/8 collections

### Complete Database Setup

1. Run the automated migration:
```sh
pnpm migrate:pocketbase
```

2. Complete manual setup for remaining collections:
   - Follow the step-by-step guide in [`docs/POCKETBASE_MIGRATION.md`](./docs/POCKETBASE_MIGRATION.md)
   - Access PocketBase Admin UI at your instance URL
   - Takes ~10-15 minutes to complete

3. Verify setup:
   - Check [`docs/MIGRATION_STATUS.md`](./docs/MIGRATION_STATUS.md) for verification checklist

## Documentation

- **[Migration Status](./docs/MIGRATION_STATUS.md)** - Current database migration state
- **[Migration Guide](./docs/POCKETBASE_MIGRATION.md)** - Step-by-step setup instructions
- **[Schema Reference](./docs/POCKETBASE_SCHEMA.md)** - Complete database schema
- **[Relationships](./docs/POCKETBASE_RELATIONSHIPS.md)** - Entity relationship diagrams
- **[Theme System](./docs/THEME.md)** - Color customization guide

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm check` - Run TypeScript and Svelte checks
- `pnpm lint` - Run ESLint and Prettier checks
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run Vitest tests
- `pnpm migrate:pocketbase` - Run database migration

## Project Structure

```
FLI-Fantasy/
├── docs/                    # Documentation
├── scripts/                 # Migration and utility scripts
├── src/
│   ├── lib/
│   │   ├── components/     # Reusable components
│   │   ├── schemas/        # Zod validation schemas
│   │   ├── services/       # Business logic layer
│   │   ├── pocketbase.ts   # PocketBase client
│   │   └── theme.ts        # Theme configuration
│   └── routes/             # SvelteKit routes
├── static/                 # Static assets
└── tests/                  # Test files
```

## Environment Variables

Required environment variables (see `.env.example`):

```env
VITE_POCKETBASE_URL=https://your-pocketbase-url.com
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=your-password
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run checks: `pnpm check && pnpm lint`
4. Commit with descriptive message
5. Push and create a pull request

## License

[Add your license here]

## Support

For issues or questions, please open an issue on GitHub.
