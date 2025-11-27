# Teams Imported Successfully 🏆

## Import Summary

✅ **14 teams imported** from CSV data

### Team List

1. **Hyzer Heros** (#1)
2. **Huk-a-Mania** (#2)
3. **Flight Squad** (#3)
4. **Birdie Storm** (#4)
5. **Chain Breakers** (#5)
6. **Disc Jesters** (#6)
7. **Midas Touch** (#7)
8. **Chain Seekers** (#8)
9. **Fairway Bombers** (#9)
10. **Disc Dynasty** (#10)
11. **Ace Makers** (#11)
12. **Glide Masters** (#13)
13. **Reserve Males** (#14)
14. **Reserve Females** (#15)

## Files Created

- **`data/teams.csv`** - Source CSV file with team data
- **`scripts/import-teams.ts`** - Import script for teams
- **`TEAMS_IMPORTED.md`** - This documentation

## Database Schema

The `teams` collection has these fields:

- `name` (text, required) - Team name
- `team_number` (number, required) - Team number/identifier
- `logo_url` (url, optional) - Team logo URL
- `color` (text, optional) - Team color (hex code)
- `is_active` (bool, required) - Whether team is active

## How to Use

### Query Teams

```typescript
import { pb } from '$lib/pocketbase';

// Get all teams
const teams = await pb.collection('teams').getFullList({
  sort: 'team_number'
});

// Get a specific team
const team = await pb.collection('teams').getFirstListItem(
  'team_number = 1'
);

// Get active teams only
const activeTeams = await pb.collection('teams').getFullList({
  filter: 'is_active = true',
  sort: 'team_number'
});
```

### Add More Teams

1. Edit `data/teams.csv` to add more teams
2. Run the import script (it will skip existing teams)
3. Or add teams directly via PocketBase admin

### Update Teams

You can add logos and colors via PocketBase admin:
- **URL:** https://pocketbase-production-e678.up.railway.app/_/
- **Collection:** teams

## Integration with Fantasy Seasons

Teams can be linked to:
- Fantasy seasons (for team-based leagues)
- Participants (assign users to teams)
- Tournaments (team competitions)
- Rosters (team lineups)

## Next Steps

You can now:
1. Assign golfers to teams
2. Create team-based fantasy leagues
3. Display team standings and statistics
4. Build team management UI

## Summary

All data is now imported:
- ✅ 28 Golfers (12 male + 12 female + 4 additional)
- ✅ 14 Teams
- ✅ 4 Test Users
- ✅ 2 Fantasy Seasons

The database is ready for fantasy golf league functionality!
