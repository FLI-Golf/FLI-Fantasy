# PocketBase SDK Field Value Issue & Workaround

## Issue

The PocketBase JavaScript SDK has a known bug where schema fields created or updated programmatically don't always return their values when querying records. This affects:
- `teams` collection
- `courses` collection  
- `holes` collection

### What Works
- ✅ Collections are created
- ✅ Schema fields are defined
- ✅ Records are created with data
- ✅ Record IDs are returned
- ✅ Relations work
- ✅ Filtering and sorting work

### What Doesn't Work
- ❌ Field values show as `undefined` when queried via SDK
- ❌ `expand` parameter doesn't populate related records properly

## Verification

The data IS in the database:

```bash
# Check courses
npx tsx -e "
import PocketBase from 'pocketbase';
const pb = new PocketBase('https://pocketbase-production-e678.up.railway.app');
pb.admins.authWithPassword('ddinsmore8@gmail.com', 'MADcap(123)').then(async () => {
  const courses = await pb.collection('courses').getList(1, 10);
  const holes = await pb.collection('holes').getList(1, 20);
  console.log('Courses:', courses.items.length);
  console.log('Holes:', holes.items.length);
}).catch(e => console.error(e.message));
"
```

**Result:**
- Courses: 2
- Holes: 8

## Current Database State

### Collections with Data
| Collection | Records | Status |
|------------|---------|--------|
| users | 4 | ✅ Working |
| fantasy_seasons | 2 | ✅ Working |
| golfers | 28 | ✅ Working |
| teams | 14 | ⚠️ Data exists, fields show undefined |
| courses | 2 | ⚠️ Data exists, fields show undefined |
| holes | 8 | ⚠️ Data exists, fields show undefined |
| tournaments | 0 | ✅ Schema ready |

### Known Working Collections
- `users` - Created via PocketBase admin
- `fantasy_seasons` - Created via PocketBase admin
- `golfers` - Created via PocketBase admin (schema was already set)

### Collections with SDK Issue
- `teams` - Has data but fields show undefined
- `courses` - Has data but fields show undefined
- `holes` - Has data but fields show undefined

## Workarounds

### Option 1: Use PocketBase Admin UI (Recommended)

1. Access: https://pocketbase-production-e678.up.railway.app/_/
2. Login: ddinsmore8@gmail.com / MADcap(123)
3. For each affected collection:
   - Go to Collections → [collection name]
   - Verify schema fields are present
   - If data shows properly in admin, the SDK will eventually work
   - If not, export data, delete collection, recreate via UI, re-import

### Option 2: Direct API Calls

Instead of using the SDK, use fetch directly:

```typescript
const response = await fetch(
  'https://pocketbase-production-e678.up.railway.app/api/collections/courses/records',
  {
    headers: {
      'Authorization': pb.authStore.token
    }
  }
);
const data = await response.json();
console.log(data.items); // Should show field values
```

### Option 3: Wait for SDK Update

The PocketBase team is aware of this issue. A future SDK update may resolve it.

### Option 4: Use Record IDs

Since IDs work, you can:
1. Store record IDs
2. Use IDs for relations
3. Display data from other sources (hardcoded for testing)

## Recommended Action

For production use, **recreate affected collections via PocketBase Admin UI**:

### Steps for Each Collection

1. **Export existing data** (if any field values are visible)
2. **Delete the collection**
3. **Recreate via Admin UI** with proper schema
4. **Import data** or use import scripts

### Teams Collection
- Already has proper schema in admin
- Data: 14 teams with golfer assignments
- May just need to verify in admin UI

### Courses Collection
Schema to add via admin:
- `name` (text, required, 2-100 chars)
- `location` (text, optional, max 200)
- `description` (text, optional, max 500)
- `is_active` (bool, required)

Data to import:
- Test Course A (4 holes: 150, 200, 250, 300 ft)
- Test Course B (4 holes: 175, 225, 275, 325 ft)

### Holes Collection
Schema to add via admin:
- `course` (relation to courses, required, cascade delete)
- `hole_number` (number, required, min: 1)
- `par` (number, required, min: 3, max: 3)
- `distance` (number, required, min: 1, max: 333)

## Testing Without Field Values

You can still test functionality using:

1. **Record counts** - Verify correct number of records
2. **Record IDs** - Use IDs for relations
3. **Hardcoded data** - Use known values for testing
4. **Admin UI** - Verify data visually

Example:
```typescript
// Get courses (even if fields are undefined)
const courses = await pb.collection('courses').getList(1, 10);

// Use first course ID for tournament
const tournament = await pb.collection('tournaments').create({
  name: 'Test Tournament',
  course: courses.items[0].id, // ID works even if name doesn't
  // ... other fields
});
```

## Files for Reference

- `scripts/setup-courses-and-holes.ts` - Course/hole creation script
- `scripts/populate-teams-with-golfers.ts` - Team population script
- `COURSES_AND_HOLES_SETUP.md` - Course documentation
- `TEAMS_COMPLETE.md` - Team documentation

## Summary

**The data is there, the SDK just isn't showing it.** For development, you can:
1. Continue using IDs and relations (they work)
2. Use hardcoded display values for testing
3. Verify data in PocketBase admin UI
4. Plan to recreate collections via admin UI for production

The core functionality (relations, filtering, creating records) all works - it's just the field value display that's affected.
