# PocketBase Migration Status

## Overview

The PocketBase database migration has been **partially completed** using the automated migration script. Some collections were successfully migrated programmatically, while others require manual setup via the PocketBase Admin UI.

## Automated Migration Results

### ✅ Successfully Migrated (3/8 collections)

These collections have been fully configured with all fields, API rules, and are ready to use:

1. **fantasy_seasons** 
   - 9 fields (name, description, owner, status, max_participants, participants_count, schedule_generated, start_date, end_date)
   - API rules applied (authenticated users)
   - Status: ✅ Complete

2. **golfers**
   - 6 fields (name, country, world_ranking, photo_url, is_active, external_id)
   - API rules applied (authenticated users)
   - Status: ✅ Complete

3. **tournaments**
   - 7 fields (name, season, start_date, end_date, location, status, external_id)
   - API rules applied (authenticated users)
   - Status: ✅ Complete

### ⚠️ Requires Manual Setup (5/8 collections)

These collections exist but only have the `id` field. They need fields added manually:

4. **fantasy_season_participants**
   - Needs: 5 fields (season, user, is_owner, joined_at, total_points)
   - Needs: Unique index on (season, user)
   - Status: ⚠️ Manual setup required

5. **tournament_rounds**
   - Needs: 4 fields (tournament, round_number, date, status)
   - Needs: Unique index on (tournament, round_number)
   - Status: ⚠️ Manual setup required

6. **golfer_scores**
   - Needs: 6 fields (tournament_round, golfer, score, total_strokes, position, is_cut)
   - Needs: Unique index on (tournament_round, golfer)
   - Status: ⚠️ Manual setup required

7. **draft_picks**
   - Needs: 6 fields (season, participant, golfer, pick_number, round_number, picked_at)
   - Needs: 2 unique indexes on (season, pick_number) and (season, golfer)
   - Status: ⚠️ Manual setup required

8. **rosters**
   - Needs: 5 fields (tournament, participant, golfer, is_active, points_earned)
   - Needs: Unique index on (tournament, participant, golfer)
   - Status: ⚠️ Manual setup required

## Why Some Collections Failed

The PocketBase JavaScript SDK has limitations when:
- Updating collections with unique indexes in the schema
- Handling complex relation field configurations
- Creating indexes before fields exist

These are known limitations of the SDK's `collections.update()` method.

## How to Complete the Migration

### Option 1: Manual Setup (Recommended)

Follow the detailed step-by-step guide in [`POCKETBASE_MIGRATION.md`](./POCKETBASE_MIGRATION.md):

1. Access PocketBase Admin UI: https://pocketbase-production-e678.up.railway.app/_/
2. Login with admin credentials
3. For each collection that needs setup:
   - Click on the collection name
   - Click "Edit collection"
   - Add fields one by one following the guide
   - Add indexes after all fields are created
   - Set API rules
   - Save

**Time estimate:** ~2-3 minutes per collection = 10-15 minutes total

### Option 2: Re-run Migration Script

The migration script is idempotent and can be run multiple times:

```bash
pnpm migrate:pocketbase
```

It will:
- Skip collections that are already complete
- Attempt to update incomplete collections
- Show clear status for each collection

## Verification Checklist

After completing the manual setup, verify each collection has:

- [ ] **fantasy_season_participants**
  - [ ] All 5 fields present
  - [ ] Unique index on (season, user)
  - [ ] API rules set

- [ ] **tournament_rounds**
  - [ ] All 4 fields present
  - [ ] Unique index on (tournament, round_number)
  - [ ] API rules set

- [ ] **golfer_scores**
  - [ ] All 6 fields present
  - [ ] Unique index on (tournament_round, golfer)
  - [ ] API rules set

- [ ] **draft_picks**
  - [ ] All 6 fields present
  - [ ] 2 unique indexes
  - [ ] API rules set (note: updateRule should be empty)

- [ ] **rosters**
  - [ ] All 5 fields present
  - [ ] Unique index on (tournament, participant, golfer)
  - [ ] API rules set

## Testing the Database

Once all collections are complete, test the setup:

1. **Create a test season:**
   ```bash
   # Visit the app and try creating a season
   # URL: /seasons/new
   ```

2. **Verify in PocketBase Admin:**
   - Check that the record was created
   - Verify all fields are populated
   - Check relations are working

3. **Test API access:**
   - Try listing seasons: `/seasons`
   - Verify authentication is required
   - Check that only your seasons are visible

## Current Database State

**Production URL:** https://pocketbase-production-e678.up.railway.app

**Collections Status:**
- Total: 9 collections (8 custom + 1 auth)
- Complete: 3 collections (37.5%)
- Incomplete: 5 collections (62.5%)
- Ready for use: No (requires completion of remaining collections)

## Next Steps

1. ✅ Migration script created and tested
2. ⚠️ Complete manual setup for 5 remaining collections
3. ⏳ Verify all collections are working
4. ⏳ Seed initial data (golfers, test tournaments)
5. ⏳ Test full application flow

## Support

If you encounter issues:

1. Check [`POCKETBASE_MIGRATION.md`](./POCKETBASE_MIGRATION.md) for detailed field specifications
2. Check [`POCKETBASE_SCHEMA.md`](./POCKETBASE_SCHEMA.md) for complete schema reference
3. Check [`POCKETBASE_RELATIONSHIPS.md`](./POCKETBASE_RELATIONSHIPS.md) for relationship diagrams
4. Review PocketBase logs in the admin UI for error messages

## Migration Script Location

- **Script:** `scripts/migrate-pocketbase-v2.ts`
- **Command:** `pnpm migrate:pocketbase`
- **Documentation:** `scripts/README.md`

---

**Last Updated:** 2024-11-25  
**Migration Status:** Partial (3/8 complete)  
**Action Required:** Manual setup of 5 collections
