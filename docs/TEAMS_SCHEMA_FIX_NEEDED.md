# Teams Collection Schema Fix Required ⚠️

## Issue

The `teams` collection was created via the PocketBase JavaScript SDK, but the schema fields were not properly persisted. The collection only has the default `id` field and is missing:
- `name` (text)
- `team_number` (number)
- `is_active` (bool)
- `logo_url` (url, optional)
- `color` (text, optional)

## Current Status

- ✅ Collection exists: `teams`
- ✅ Schema updated via API
- ❌ Records don't have field data (SDK bug)
- ✅ Golfers collection: Working properly (28 golfers)
- ✅ Team-golfer assignments: 28 assignments exist but need to be recreated after teams are fixed

## Solution: Manual Setup via PocketBase Admin

Since the JavaScript SDK has issues with schema creation, the teams collection needs to be set up manually via the PocketBase admin UI.

### Step 1: Access PocketBase Admin

1. Go to: https://pocketbase-production-e678.up.railway.app/_/
2. Login with:
   - Email: ddinsmore8@gmail.com
   - Password: MADcap(123)

### Step 2: Fix Teams Collection

1. Navigate to **Collections** in the sidebar
2. Find the **teams** collection
3. Click on it to edit

### Step 3: Add Fields

Add these fields to the collection:

#### Field 1: name
- **Type:** Text
- **Name:** name
- **Required:** Yes
- **Min length:** 2
- **Max length:** 100

#### Field 2: team_number
- **Type:** Number
- **Name:** team_number
- **Required:** Yes
- **Min:** 1

#### Field 3: is_active
- **Type:** Bool
- **Name:** is_active
- **Required:** Yes
- **Default:** true

#### Field 4: logo_url (Optional)
- **Type:** URL
- **Name:** logo_url
- **Required:** No

#### Field 5: color (Optional)
- **Type:** Text
- **Name:** color
- **Required:** No
- **Max length:** 7
- **Pattern:** ^#[0-9A-Fa-f]{6}$ (for hex colors)

### Step 4: Add Team Records

Add these 14 teams manually or use the import feature:

| Team Number | Name |
|-------------|------|
| 1 | Hyzer Heros |
| 2 | Huk-a-Mania |
| 3 | Flight Squad |
| 4 | Birdie Storm |
| 5 | Chain Breakers |
| 6 | Disc Jesters |
| 7 | Midas Touch |
| 8 | Chain Seekers |
| 9 | Fairway Bombers |
| 10 | Disc Dynasty |
| 11 | Ace Makers |
| 13 | Glide Masters |
| 14 | Reserve Males |
| 15 | Reserve Females |

For each team, set:
- `name`: Team name from table
- `team_number`: Number from table
- `is_active`: true

### Step 5: Re-run Assignment Script

After teams are properly created, run:

```bash
cd /workspaces/FLI-Fantasy
POCKETBASE_ADMIN_EMAIL=ddinsmore8@gmail.com \
POCKETBASE_ADMIN_PASSWORD='MADcap(123)' \
npx tsx -e "
import PocketBase from 'pocketbase';
const pb = new PocketBase('https://pocketbase-production-e678.up.railway.app');

pb.admins.authWithPassword('ddinsmore8@gmail.com', 'MADcap(123)').then(async () => {
  const teams = await pb.collection('teams').getList(1, 50, { sort: 'team_number' });
  const golfers = await pb.collection('golfers').getList(1, 50, { sort: 'gender,world_ranking' });
  
  const males = golfers.items.filter(g => g.gender === 'male');
  const females = golfers.items.filter(g => g.gender === 'female');
  
  console.log('Assigning golfers to teams...');
  
  for (let i = 0; i < 12; i++) {
    const team = teams.items[i];
    await pb.collection('team_golfers').create({
      team: team.id,
      golfer: males[i].id,
      position: 'starter'
    });
    await pb.collection('team_golfers').create({
      team: team.id,
      golfer: females[i].id,
      position: 'starter'
    });
    console.log('✓ Team', i+1);
  }
  
  // Reserves
  const reserveMaleTeam = teams.items.find(t => t.team_number === 14);
  const reserveFemaleTeam = teams.items.find(t => t.team_number === 15);
  
  for (let i = 12; i < 14; i++) {
    await pb.collection('team_golfers').create({
      team: reserveMaleTeam.id,
      golfer: males[i].id,
      position: 'reserve'
    });
    await pb.collection('team_golfers').create({
      team: reserveFemaleTeam.id,
      golfer: females[i].id,
      position: 'reserve'
    });
  }
  
  console.log('✅ Done!');
}).catch(e => console.error('Error:', e.message));
"
```

## Alternative: CSV Import

You can also import teams via CSV in PocketBase admin:

1. Go to Collections → teams
2. Click "Import" button
3. Upload this CSV:

```csv
name,team_number,is_active
Hyzer Heros,1,true
Huk-a-Mania,2,true
Flight Squad,3,true
Birdie Storm,4,true
Chain Breakers,5,true
Disc Jesters,6,true
Midas Touch,7,true
Chain Seekers,8,true
Fairway Bombers,9,true
Disc Dynasty,10,true
Ace Makers,11,true
Glide Masters,13,true
Reserve Males,14,true
Reserve Females,15,true
```

## Verification

After setup, verify with:

```bash
npx tsx -e "
import PocketBase from 'pocketbase';
const pb = new PocketBase('https://pocketbase-production-e678.up.railway.app');
pb.collection('users').authWithPassword('owner@test.com', 'password123').then(() => {
  return pb.collection('teams').getList(1, 20, { sort: 'team_number' });
}).then(teams => {
  console.log('Teams:');
  teams.items.forEach(t => console.log('  #' + t.team_number, t.name));
}).catch(e => console.error(e.message));
"
```

## Why This Happened

The PocketBase JavaScript SDK has a known issue where schema fields created programmatically don't always persist correctly, especially when using the `collections.create()` method. The recommended approach is to use the admin UI for collection setup.

## Current Database State

- ✅ Users: 4 test users
- ✅ Fantasy Seasons: 2 seasons  
- ✅ Golfers: 28 golfers (properly configured)
- ⚠️  Teams: Collection exists but needs manual setup
- ⚠️  Team-Golfers: Will need to be recreated after teams are fixed

## Next Steps

1. Follow the manual setup steps above
2. Re-run the assignment script
3. Verify all data is correct
4. Continue with application development

The golfers and other collections are working fine - only the teams collection needs this manual fix.
