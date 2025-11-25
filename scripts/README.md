# Migration Scripts

## PocketBase Database Migration

### Quick Start

Run the migration script to create all required collections in your PocketBase instance:

```bash
pnpm migrate:pocketbase
```

The script will:
- ✅ Authenticate as admin using credentials from `.env`
- ✅ Update the `users` collection with a `name` field
- ✅ Create 8 new collections for the fantasy golf app
- ✅ Skip collections that already exist
- ✅ Add unique indexes where needed

### Environment Variables

The script reads from your `.env` file:

```env
VITE_POCKETBASE_URL=https://your-pocketbase-url.com
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=your-password
```

### Collections Created

1. **fantasy_seasons** - Fantasy golf seasons/leagues
2. **fantasy_season_participants** - Users in seasons
3. **golfers** - Professional golfers database
4. **tournaments** - Golf tournaments
5. **tournament_rounds** - Individual rounds (1-4)
6. **golfer_scores** - Scores per round
7. **draft_picks** - Draft selections
8. **rosters** - Active rosters per tournament

### API Rules

Collections are created with basic authentication rules:
- **List/View**: Any authenticated user
- **Create/Update/Delete**: Any authenticated user

⚠️ **Note**: You should refine these rules in the PocketBase admin UI for production use. See `docs/POCKETBASE_MIGRATION.md` for recommended rules.

### Troubleshooting

**Authentication Failed**
- Check your admin credentials in `.env`
- Verify the PocketBase URL is correct
- Ensure you have admin access

**Collection Already Exists**
- The script will skip existing collections
- This is safe and expected on subsequent runs

**Index Creation Failed**
- Indexes are created after the collection
- If this fails, you can add them manually in the admin UI

### Manual Configuration

After running the migration, you may want to:

1. **Refine API Rules** - Set proper permissions in PocketBase admin
2. **Add Validation Rules** - Add custom validation for fields
3. **Seed Data** - Add initial golfers and test data
4. **Configure Backups** - Set up automated backups

See `docs/POCKETBASE_MIGRATION.md` for detailed instructions.

### Re-running the Migration

The script is idempotent - you can run it multiple times safely:
- Existing collections will be skipped
- New collections will be created
- No data will be lost

### Rollback

To remove all collections and start over:

1. Go to PocketBase admin UI
2. Delete collections in reverse order (to avoid foreign key issues):
   - rosters
   - draft_picks
   - golfer_scores
   - tournament_rounds
   - tournaments
   - golfers
   - fantasy_season_participants
   - fantasy_seasons
3. Re-run the migration script

⚠️ **Warning**: This will delete all data in these collections!
