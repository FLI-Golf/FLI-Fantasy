# PocketBase Database Migration Guide

This guide walks you through setting up all required collections in your production PocketBase instance.

## Prerequisites

- Access to PocketBase Admin UI: https://pocketbase-production-e678.up.railway.app/_/
- Admin credentials: `ddinsmore8@gmail.com` / `MADcap(123)`

---

## Step 1: Update Users Collection

The `users` collection already exists. We just need to add the `name` field.

1. Go to **Collections** → **users**
2. Click **Edit collection**
3. Add new field:
   - **Name:** `name`
   - **Type:** Text
   - **Required:** Yes
   - **Min length:** 2
4. Click **Save**

---

## Step 2: Create fantasy_seasons Collection

1. Click **New collection** → **Base collection**
2. **Name:** `fantasy_seasons`
3. Add fields:

### Fields:

**name** (Text)
- Required: ✓
- Min: 3
- Max: 100

**description** (Text)
- Required: ✗
- Max: 500

**owner** (Relation)
- Required: ✓
- Collection: `users`
- Type: Single
- Display fields: `name`, `email`

**status** (Select - Single)
- Required: ✓
- Values: `filling`, `active`, `completed`, `cancelled`
- Default: `filling`

**max_participants** (Number)
- Required: ✓
- Min: 2
- Max: 100
- Default: 12

**participants_count** (Number)
- Required: ✓
- Min: 0
- Default: 1

**schedule_generated** (Bool)
- Required: ✓
- Default: false

**start_date** (Date)
- Required: ✗

**end_date** (Date)
- Required: ✗

### API Rules:

```javascript
// List/Search
@request.auth.id != ""

// View
@request.auth.id != ""

// Create
@request.auth.id != "" && @request.auth.id = owner

// Update
@request.auth.id = owner

// Delete
@request.auth.id = owner
```

4. Click **Save**

---

## Step 3: Create fantasy_season_participants Collection

1. Click **New collection** → **Base collection**
2. **Name:** `fantasy_season_participants`
3. Add fields:

### Fields:

**season** (Relation)
- Required: ✓
- Collection: `fantasy_seasons`
- Type: Single
- Cascade delete: ✓

**user** (Relation)
- Required: ✓
- Collection: `users`
- Type: Single
- Display fields: `name`, `email`

**is_owner** (Bool)
- Required: ✓
- Default: false

**joined_at** (Date)
- Required: ✓

**total_points** (Number)
- Required: ✗
- Default: 0

### Indexes:
- Create unique index on: `season` + `user`

### API Rules:

```javascript
// List/Search
@request.auth.id != ""

// View
@request.auth.id != ""

// Create
@request.auth.id != "" && @request.auth.id = user

// Update
season.owner = @request.auth.id || user = @request.auth.id

// Delete
season.owner = @request.auth.id
```

4. Click **Save**

---

## Step 4: Create golfers Collection

1. Click **New collection** → **Base collection**
2. **Name:** `golfers`
3. Add fields:

### Fields:

**name** (Text)
- Required: ✓
- Min: 2
- Max: 100

**country** (Text)
- Required: ✗
- Max: 3
- Pattern: `^[A-Z]{2,3}$` (optional)

**world_ranking** (Number)
- Required: ✗
- Min: 1

**photo_url** (URL)
- Required: ✗

**is_active** (Bool)
- Required: ✓
- Default: true

**external_id** (Text)
- Required: ✗
- Max: 100

### API Rules:

```javascript
// List/Search
@request.auth.id != ""

// View
@request.auth.id != ""

// Create
@request.auth.id != "" && @request.auth.verified = true

// Update
@request.auth.id != "" && @request.auth.verified = true

// Delete
@request.auth.id != "" && @request.auth.verified = true
```

4. Click **Save**

---

## Step 5: Create tournaments Collection

1. Click **New collection** → **Base collection**
2. **Name:** `tournaments`
3. Add fields:

### Fields:

**name** (Text)
- Required: ✓
- Min: 3
- Max: 200

**season** (Relation)
- Required: ✓
- Collection: `fantasy_seasons`
- Type: Single
- Cascade delete: ✓

**start_date** (Date)
- Required: ✓

**end_date** (Date)
- Required: ✓

**location** (Text)
- Required: ✗
- Max: 200

**status** (Select - Single)
- Required: ✓
- Values: `upcoming`, `in_progress`, `completed`
- Default: `upcoming`

**external_id** (Text)
- Required: ✗
- Max: 100

### API Rules:

```javascript
// List/Search
@request.auth.id != ""

// View
@request.auth.id != ""

// Create
season.owner = @request.auth.id

// Update
season.owner = @request.auth.id

// Delete
season.owner = @request.auth.id
```

4. Click **Save**

---

## Step 6: Create tournament_rounds Collection

1. Click **New collection** → **Base collection**
2. **Name:** `tournament_rounds`
3. Add fields:

### Fields:

**tournament** (Relation)
- Required: ✓
- Collection: `tournaments`
- Type: Single
- Cascade delete: ✓

**round_number** (Number)
- Required: ✓
- Min: 1
- Max: 4

**date** (Date)
- Required: ✓

**status** (Select - Single)
- Required: ✓
- Values: `upcoming`, `in_progress`, `completed`
- Default: `upcoming`

### Indexes:
- Create unique index on: `tournament` + `round_number`

### API Rules:

```javascript
// List/Search
@request.auth.id != ""

// View
@request.auth.id != ""

// Create
tournament.season.owner = @request.auth.id

// Update
tournament.season.owner = @request.auth.id

// Delete
tournament.season.owner = @request.auth.id
```

4. Click **Save**

---

## Step 7: Create golfer_scores Collection

1. Click **New collection** → **Base collection**
2. **Name:** `golfer_scores`
3. Add fields:

### Fields:

**tournament_round** (Relation)
- Required: ✓
- Collection: `tournament_rounds`
- Type: Single
- Cascade delete: ✓

**golfer** (Relation)
- Required: ✓
- Collection: `golfers`
- Type: Single

**score** (Number)
- Required: ✗
- Note: Relative to par (can be negative)

**total_strokes** (Number)
- Required: ✗
- Min: 0

**position** (Number)
- Required: ✗
- Min: 1

**is_cut** (Bool)
- Required: ✓
- Default: false

### Indexes:
- Create unique index on: `tournament_round` + `golfer`

### API Rules:

```javascript
// List/Search
@request.auth.id != ""

// View
@request.auth.id != ""

// Create
@request.auth.id != "" && @request.auth.verified = true

// Update
@request.auth.id != "" && @request.auth.verified = true

// Delete
@request.auth.id != "" && @request.auth.verified = true
```

4. Click **Save**

---

## Step 8: Create draft_picks Collection

1. Click **New collection** → **Base collection**
2. **Name:** `draft_picks`
3. Add fields:

### Fields:

**season** (Relation)
- Required: ✓
- Collection: `fantasy_seasons`
- Type: Single
- Cascade delete: ✓

**participant** (Relation)
- Required: ✓
- Collection: `fantasy_season_participants`
- Type: Single
- Cascade delete: ✓

**golfer** (Relation)
- Required: ✓
- Collection: `golfers`
- Type: Single

**pick_number** (Number)
- Required: ✓
- Min: 1

**round_number** (Number)
- Required: ✓
- Min: 1

**picked_at** (Date)
- Required: ✓

### Indexes:
- Create unique index on: `season` + `pick_number`
- Create unique index on: `season` + `golfer`

### API Rules:

```javascript
// List/Search
@request.auth.id != ""

// View
@request.auth.id != ""

// Create
participant.user = @request.auth.id

// Update
""  // No updates allowed (immutable)

// Delete
season.owner = @request.auth.id
```

4. Click **Save**

---

## Step 9: Create rosters Collection

1. Click **New collection** → **Base collection**
2. **Name:** `rosters`
3. Add fields:

### Fields:

**tournament** (Relation)
- Required: ✓
- Collection: `tournaments`
- Type: Single
- Cascade delete: ✓

**participant** (Relation)
- Required: ✓
- Collection: `fantasy_season_participants`
- Type: Single
- Cascade delete: ✓

**golfer** (Relation)
- Required: ✓
- Collection: `golfers`
- Type: Single

**is_active** (Bool)
- Required: ✓
- Default: true

**points_earned** (Number)
- Required: ✗
- Default: 0

### Indexes:
- Create unique index on: `tournament` + `participant` + `golfer`

### API Rules:

```javascript
// List/Search
@request.auth.id != ""

// View
@request.auth.id != ""

// Create
participant.user = @request.auth.id

// Update
participant.user = @request.auth.id

// Delete
participant.user = @request.auth.id
```

4. Click **Save**

---

## Verification Checklist

After creating all collections, verify:

- [ ] All 9 collections are created
- [ ] All fields have correct types and constraints
- [ ] All relations point to correct collections
- [ ] All unique indexes are created
- [ ] API rules are set for each collection
- [ ] Test creating a record in each collection via API

---

## Testing the Setup

### Test 1: Create a Season

```bash
curl -X POST https://pocketbase-production-e678.up.railway.app/api/collections/fantasy_seasons/records \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Season 2024",
    "owner": "YOUR_USER_ID",
    "status": "filling",
    "max_participants": 6,
    "participants_count": 1,
    "schedule_generated": false
  }'
```

### Test 2: List Your Seasons

```bash
curl https://pocketbase-production-e678.up.railway.app/api/collections/fantasy_seasons/records?filter=owner="YOUR_USER_ID" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

---

## Troubleshooting

**Issue:** Can't create records
- Check API rules are set correctly
- Verify you're authenticated
- Check required fields are provided

**Issue:** Relation fields not working
- Verify related collection exists
- Check relation type (single vs multiple)
- Ensure cascade delete is set if needed

**Issue:** Unique constraint violations
- Check indexes are created correctly
- Verify field combinations are unique

---

## Next Steps

After migration:
1. Seed initial golfer data
2. Test the fantasy season creation flow
3. Test participant joining
4. Set up tournament data
5. Test draft functionality

---

## Rollback

If you need to start over:
1. Delete all created collections (in reverse order)
2. Re-run this migration guide

**Note:** Deleting collections will delete all data. Make backups if needed.
