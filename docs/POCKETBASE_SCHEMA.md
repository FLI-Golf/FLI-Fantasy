# PocketBase Collections Schema

This document defines all the collections needed for the FLI Fantasy Golf application.

## Collections Overview

1. **users** (built-in) - User authentication and profiles
2. **fantasy_seasons** - Fantasy golf seasons/leagues
3. **fantasy_season_participants** - Users participating in seasons
4. **golfers** - Professional golfers available for drafting
5. **tournaments** - Golf tournaments
6. **tournament_rounds** - Individual rounds within tournaments
7. **golfer_scores** - Scores for golfers in tournament rounds
8. **draft_picks** - Draft selections made by participants
9. **rosters** - Active rosters for each participant per tournament

---

## 1. users (Built-in Collection)

**Type:** Auth Collection

**Additional Fields to Add:**
- `name` (text, required) - Display name
- `avatar` (file, optional) - Profile picture

**Settings:**
- Email/Password authentication enabled
- Email verification: Optional (configure as needed)

---

## 2. fantasy_seasons

**Type:** Base Collection

**Purpose:** Represents a fantasy golf season/league

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `name` | text | Yes | min: 3 | Season name (e.g., "2024 Spring League") |
| `description` | text | No | - | Optional description |
| `owner` | relation | Yes | users (single) | Season creator/owner |
| `status` | select | Yes | filling, active, completed, cancelled | Current status |
| `max_participants` | number | Yes | min: 2, max: 100 | Maximum number of participants |
| `participants_count` | number | Yes | min: 0 | Current participant count |
| `schedule_generated` | bool | Yes | default: false | Whether tournament schedule is set |
| `start_date` | date | No | - | Season start date |
| `end_date` | date | No | - | Season end date |

**Indexes:**
- `owner` (for filtering by owner)
- `status` (for filtering by status)

**API Rules:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: `@request.auth.id != "" && @request.auth.id = owner`
- Update: `@request.auth.id = owner`
- Delete: `@request.auth.id = owner`

---

## 3. fantasy_season_participants

**Type:** Base Collection

**Purpose:** Links users to fantasy seasons they're participating in

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `season` | relation | Yes | fantasy_seasons (single) | The season |
| `user` | relation | Yes | users (single) | The participant |
| `is_owner` | bool | Yes | default: false | Whether this user is the season owner |
| `joined_at` | date | Yes | - | When they joined |
| `total_points` | number | No | default: 0 | Total points accumulated |

**Indexes:**
- `season` (for filtering by season)
- `user` (for filtering by user)
- Unique index on `season + user` (prevent duplicates)

**API Rules:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: `@request.auth.id != "" && @request.auth.id = user`
- Update: `season.owner = @request.auth.id || user = @request.auth.id`
- Delete: `season.owner = @request.auth.id`

---

## 4. golfers

**Type:** Base Collection

**Purpose:** Professional golfers available for drafting

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `name` | text | Yes | - | Golfer's full name |
| `country` | text | No | - | Country code (e.g., "USA") |
| `world_ranking` | number | No | - | Current world ranking |
| `photo_url` | url | No | - | Profile photo URL |
| `is_active` | bool | Yes | default: true | Whether golfer is active |
| `external_id` | text | No | - | ID from external API (if applicable) |

**Indexes:**
- `name` (for searching)
- `is_active` (for filtering)

**API Rules:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: Admin only
- Update: Admin only
- Delete: Admin only

---

## 5. tournaments

**Type:** Base Collection

**Purpose:** Golf tournaments

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `name` | text | Yes | - | Tournament name |
| `season` | relation | Yes | fantasy_seasons (single) | Associated fantasy season |
| `start_date` | date | Yes | - | Tournament start date |
| `end_date` | date | Yes | - | Tournament end date |
| `location` | text | No | - | Tournament location |
| `status` | select | Yes | upcoming, in_progress, completed | Tournament status |
| `external_id` | text | No | - | ID from external API |

**Indexes:**
- `season` (for filtering by season)
- `status` (for filtering by status)
- `start_date` (for sorting)

**API Rules:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: `season.owner = @request.auth.id`
- Update: `season.owner = @request.auth.id`
- Delete: `season.owner = @request.auth.id`

---

## 6. tournament_rounds

**Type:** Base Collection

**Purpose:** Individual rounds within tournaments (typically 4 rounds)

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `tournament` | relation | Yes | tournaments (single) | Parent tournament |
| `round_number` | number | Yes | min: 1, max: 4 | Round number (1-4) |
| `date` | date | Yes | - | Round date |
| `status` | select | Yes | upcoming, in_progress, completed | Round status |

**Indexes:**
- `tournament` (for filtering by tournament)
- `tournament + round_number` (unique)

**API Rules:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: `tournament.season.owner = @request.auth.id`
- Update: `tournament.season.owner = @request.auth.id`
- Delete: `tournament.season.owner = @request.auth.id`

---

## 7. golfer_scores

**Type:** Base Collection

**Purpose:** Scores for golfers in specific tournament rounds

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `tournament_round` | relation | Yes | tournament_rounds (single) | The round |
| `golfer` | relation | Yes | golfers (single) | The golfer |
| `score` | number | No | - | Score relative to par (e.g., -2, +3) |
| `total_strokes` | number | No | - | Total strokes for the round |
| `position` | number | No | - | Current position/rank |
| `is_cut` | bool | Yes | default: false | Whether golfer made the cut |

**Indexes:**
- `tournament_round` (for filtering by round)
- `golfer` (for filtering by golfer)
- `tournament_round + golfer` (unique)

**API Rules:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: Admin only (or automated scoring system)
- Update: Admin only
- Delete: Admin only

---

## 8. draft_picks

**Type:** Base Collection

**Purpose:** Draft selections made by participants

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `season` | relation | Yes | fantasy_seasons (single) | The season |
| `participant` | relation | Yes | fantasy_season_participants (single) | Who made the pick |
| `golfer` | relation | Yes | golfers (single) | Golfer selected |
| `pick_number` | number | Yes | min: 1 | Overall pick number in draft |
| `round_number` | number | Yes | min: 1 | Draft round number |
| `picked_at` | date | Yes | - | When the pick was made |

**Indexes:**
- `season` (for filtering by season)
- `participant` (for filtering by participant)
- `season + pick_number` (unique)
- `season + golfer` (unique - can't draft same golfer twice)

**API Rules:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: `participant.user = @request.auth.id`
- Update: None (picks are immutable)
- Delete: `season.owner = @request.auth.id` (only owner can undo picks)

---

## 9. rosters

**Type:** Base Collection

**Purpose:** Active rosters for each participant per tournament

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `tournament` | relation | Yes | tournaments (single) | The tournament |
| `participant` | relation | Yes | fantasy_season_participants (single) | The participant |
| `golfer` | relation | Yes | golfers (single) | Golfer in the roster |
| `is_active` | bool | Yes | default: true | Whether golfer is active this week |
| `points_earned` | number | No | default: 0 | Points earned in this tournament |

**Indexes:**
- `tournament` (for filtering by tournament)
- `participant` (for filtering by participant)
- `tournament + participant + golfer` (unique)

**API Rules:**
- List: `@request.auth.id != ""`
- View: `@request.auth.id != ""`
- Create: `participant.user = @request.auth.id`
- Update: `participant.user = @request.auth.id`
- Delete: `participant.user = @request.auth.id`

---

## Setup Instructions

### Option 1: Manual Setup via PocketBase Admin UI

1. Access your PocketBase admin at: https://pocketbase-production-e678.up.railway.app/_/
2. Login with: `ddinsmore8@gmail.com` / `MADcap(123)`
3. Go to "Collections" in the sidebar
4. For each collection above:
   - Click "New collection"
   - Set the name and type
   - Add all fields with their types and options
   - Configure API rules
   - Add indexes

### Option 2: Import via JSON (Recommended)

Create a `pb_schema.json` file with all collections and import it via the PocketBase admin UI.

### Option 3: Programmatic Setup

Use the PocketBase SDK to create collections programmatically (requires admin authentication).

---

## Migration Checklist

- [ ] Update `users` collection with `name` field
- [ ] Create `fantasy_seasons` collection
- [ ] Create `fantasy_season_participants` collection
- [ ] Create `golfers` collection
- [ ] Create `tournaments` collection
- [ ] Create `tournament_rounds` collection
- [ ] Create `golfer_scores` collection
- [ ] Create `draft_picks` collection
- [ ] Create `rosters` collection
- [ ] Test API rules for each collection
- [ ] Seed initial data (golfers, test tournaments)

---

## Notes

- All dates should be stored in ISO 8601 format
- Relations use the record ID as the value
- API rules use PocketBase's filter syntax
- Consider adding more fields as needed (e.g., `notes`, `settings`, etc.)
- Some collections may need additional indexes based on query patterns
