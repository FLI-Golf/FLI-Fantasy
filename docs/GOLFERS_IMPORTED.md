# Golfers Imported Successfully ⛳

## Import Summary

✅ **28 golfers imported** from CSV data

### 👨 Male Golfers (14 total)
Top 12 starters + 2 additional:

1. Gannon Buhr (#1)
2. Ricky Wysocki (#2)
3. Calvin Heimburg (#3)
4. Isaac Robinson (#4)
5. Paul McBeth (#5)
6. Kyle Klein (#6)
7. Matthew Orum (#7)
8. Anthony Barela (#8)
9. Niklas Anttila (#9)
10. Chris Dickerson (#10)
11. Simon Lizotte (#11)
12. Ezra Robinson (#12)
13. Eagle McMahon (#13) *
14. Joel Freeman (#14) *

### 👩 Female Golfers (14 total)
Top 12 starters + 2 additional:

1. Kristin Tattar (#1)
2. Evelina Salonen (#2)
3. Ohn Scoggins (#3)
4. Missy Gannon (#4)
5. Holyn Handley (#5)
6. Silva Saarinen (#7)
7. Ella Hansen (#8)
8. Hailey King (#9)
9. Heidi Laine (#10)
10. Paige Pierce (#11)
11. Kat Mertsch (#12)
12. Natalie Ryan (#12)
13. Henna Blomroos (#13) *
14. Valerie Mandujano (#13) *

\* Can be used as reserves or additional starters

## Files Created

- **`data/golfers.csv`** - Source CSV file with all golfer data
- **`scripts/import-golfers.ts`** - Import script for golfers
- **`GOLFERS_IMPORTED.md`** - This documentation

## How to Use

### View Golfers
You can query golfers from the application:

```typescript
import { pb } from '$lib/pocketbase';

// Get all golfers
const golfers = await pb.collection('golfers').getFullList({
  sort: 'gender,world_ranking'
});

// Get male golfers only
const males = await pb.collection('golfers').getFullList({
  filter: 'gender = "male"',
  sort: 'world_ranking'
});

// Get female golfers only
const females = await pb.collection('golfers').getFullList({
  filter: 'gender = "female"',
  sort: 'world_ranking'
});
```

### Re-import Golfers

If you need to re-import (will skip existing golfers):

```bash
POCKETBASE_ADMIN_EMAIL=ddinsmore8@gmail.com \
POCKETBASE_ADMIN_PASSWORD='MADcap(123)' \
npx tsx scripts/import-golfers.ts
```

### Add More Golfers

1. Edit `data/golfers.csv` to add more golfers
2. Run the import script again
3. Only new golfers will be added (existing ones are skipped)

## Database Schema

The `golfers` collection has these fields:

- `name` (text, required) - Golfer's full name
- `gender` (select, required) - "male" or "female"
- `world_ranking` (number) - World ranking position
- `country` (text) - Country code
- `photo_url` (url) - Profile photo URL
- `is_active` (bool) - Whether golfer is active
- `external_id` (text) - ID from external API

## Next Steps

You can now:
1. Use golfers in fantasy drafts
2. Create draft pick functionality
3. Build roster management
4. Display golfer profiles in the UI

## PocketBase Admin

View/edit golfers at:
- **URL:** https://pocketbase-production-e678.up.railway.app/_/
- **Collection:** golfers
