# FLI Fantasy Setup Instructions

## Current Status

✅ **Completed:**
- Dev server is running
- Navigation with hamburger menu (mobile responsive)
- Icons added to Shop and Fantasy links
- Login and Register modals with black text inputs
- Test users created in database
- Server-side PocketBase integration fixed

⚠️ **Needs Setup:**
- PocketBase collections for fantasy seasons

## Quick Setup (Choose One Option)

### Option 1: Automated Setup (Recommended)

Run the collection setup script with admin credentials:

```bash
npx tsx scripts/setup-collections.ts
```

You'll be prompted for:
- Admin email (from PocketBase admin panel)
- Admin password

This will automatically create the required collections.

### Option 2: Manual Setup via PocketBase Admin

1. Go to: https://pocketbase-production-e678.up.railway.app/_/
2. Login with admin credentials
3. Navigate to "Collections" → "New Collection"

#### Create `fantasy_seasons` collection:
- **Type:** Base Collection
- **Name:** fantasy_seasons
- **Fields:**
  - `name` - Text (required, min: 3)
  - `description` - Text (optional)
  - `owner` - Relation to users (single, required)
  - `status` - Select (required) - Options: filling, active, completed, cancelled
  - `max_participants` - Number (required, min: 2, max: 100)
  - `participants_count` - Number (required, min: 0)
  - `schedule_generated` - Bool (required, default: false)
  - `start_date` - Date (optional)
  - `end_date` - Date (optional)

- **API Rules:**
  - List: `@request.auth.id != ""`
  - View: `@request.auth.id != ""`
  - Create: `@request.auth.id != "" && @request.auth.id = owner`
  - Update: `@request.auth.id = owner`
  - Delete: `@request.auth.id = owner`

#### Create `fantasy_season_participants` collection:
- **Type:** Base Collection
- **Name:** fantasy_season_participants
- **Fields:**
  - `season` - Relation to fantasy_seasons (single, required, cascade delete)
  - `user` - Relation to users (single, required)
  - `is_owner` - Bool (required, default: false)
  - `joined_at` - Date (required)
  - `total_points` - Number (optional, min: 0)

- **API Rules:**
  - List: `@request.auth.id != ""`
  - View: `@request.auth.id != ""`
  - Create: `@request.auth.id != "" && @request.auth.id = user`
  - Update: `season.owner = @request.auth.id || user = @request.auth.id`
  - Delete: `season.owner = @request.auth.id`

- **Indexes:**
  - Unique index on `season + user` (prevents duplicate participants)

## After Collections Are Created

Run the seed script to populate test data:

```bash
npx tsx scripts/seed-data.ts
```

This creates:
- 4 fantasy seasons (Spring, Summer, Fall, Winter)
- Participants linked to each season
- Various statuses (filling, active, completed)

## Test the Application

1. **Start dev server** (if not running):
   ```bash
   pnpm dev
   ```

2. **Login with test credentials:**
   - Email: `owner@test.com`
   - Password: `password123`

3. **Navigate to:**
   - Home: https://5173--019ac382-c5c7-7e07-bc87-256e07ce3ba3.us-east-1-01.gitpod.dev
   - Fantasy Seasons: https://5173--019ac382-c5c7-7e07-bc87-256e07ce3ba3.us-east-1-01.gitpod.dev/seasons
   - Shop: https://5173--019ac382-c5c7-7e07-bc87-256e07ce3ba3.us-east-1-01.gitpod.dev/shop

## Available Test Users

All users have password: `password123`

- `owner@test.com` - Season owner
- `player1@test.com` - Participant
- `player2@test.com` - Participant
- `player3@test.com` - Participant

## Troubleshooting

### "Failed to create record" errors
- Verify collections exist in PocketBase admin
- Check API rules allow the operation
- Ensure all required fields are defined correctly

### 500 errors on /seasons page
- Collections must be created first
- Check server logs for specific errors

### Can't login
- Verify user exists in PocketBase
- Check VITE_POCKETBASE_URL in .env file

## Additional Resources

- Full schema documentation: `docs/POCKETBASE_SCHEMA.md`
- Seed data details: `docs/SEED_DATA_INSTRUCTIONS.md`
- PocketBase relationships: `docs/POCKETBASE_RELATIONSHIPS.md`
