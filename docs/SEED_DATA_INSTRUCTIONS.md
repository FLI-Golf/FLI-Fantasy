# Seed Data Instructions

## Prerequisites

Before running the seed script, you need to create the required PocketBase collections.

### Access PocketBase Admin

1. Go to: https://pocketbase-production-e678.up.railway.app/_/
2. Login with the admin credentials
3. Navigate to "Collections" in the sidebar

### Required Collections

You need to create these collections (see `POCKETBASE_SCHEMA.md` for full details):

#### 1. fantasy_seasons
- Type: Base Collection
- Fields:
  - `name` (text, required)
  - `description` (text, optional)
  - `owner` (relation to users, single, required)
  - `status` (select: filling, active, completed, cancelled, required)
  - `max_participants` (number, required, min: 2, max: 100)
  - `participants_count` (number, required, min: 0)
  - `schedule_generated` (bool, required, default: false)
  - `start_date` (date, optional)
  - `end_date` (date, optional)

#### 2. fantasy_season_participants
- Type: Base Collection
- Fields:
  - `season` (relation to fantasy_seasons, single, required)
  - `user` (relation to users, single, required)
  - `is_owner` (bool, required, default: false)
  - `joined_at` (date, required)
  - `total_points` (number, optional, default: 0)

### API Rules (Important!)

For both collections, set these API rules to allow authenticated users:

**fantasy_seasons:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: `@request.auth.id != "" && @request.auth.id = owner`
- Update: `@request.auth.id = owner`
- Delete: `@request.auth.id = owner`

**fantasy_season_participants:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: `@request.auth.id != "" && @request.auth.id = user`
- Update: `season.owner = @request.auth.id || user = @request.auth.id`
- Delete: `season.owner = @request.auth.id`

## Running the Seed Script

Once the collections are created:

```bash
npx tsx scripts/seed-data.ts
```

This will create:
- 4 test users (owner@test.com, player1@test.com, player2@test.com, player3@test.com)
- 4 fantasy seasons with different statuses
- Participants linked to each season

## Test Credentials

After seeding, you can login with:
- **Email:** owner@test.com
- **Password:** password123

## Troubleshooting

If you get "Failed to create record" errors:
1. Verify the collections exist in PocketBase admin
2. Check that all required fields are defined
3. Verify API rules allow creation
4. Check that field types match the schema
