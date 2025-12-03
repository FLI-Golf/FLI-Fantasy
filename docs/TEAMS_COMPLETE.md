# Teams Setup Complete ✅

## Overview

The teams collection has been successfully configured with direct golfer relations and all 14 teams have been populated with their assigned golfers.

## Collection Schema

### Teams Collection Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Auto-generated team ID |
| `name` | text | Yes | Team name (1-100 chars) |
| `male_golfer` | relation | No | Reference to male golfer |
| `female_golfer` | relation | No | Reference to female golfer |
| `male_reserve_used` | bool | No | Whether male reserve has been used |
| `female_reserve_used` | bool | No | Whether female reserve has been used |

### Relationship Structure

```
teams (1) ←→ (1) golfers (male_golfer)
teams (1) ←→ (1) golfers (female_golfer)
```

This is a direct 1-to-1 relationship - each team has exactly one male and one female golfer assigned.

## Team Roster

**Total:** 12 actual teams + 2 reserve player pools

### Actual Teams (12 teams)

| # | Team Name | Male Golfer | Female Golfer |
|---|-----------|-------------|---------------|
| 1 | Hyzer Heros | Gannon Buhr (#1) | Kristin Tattar (#1) |
| 2 | Huk-a-Mania | Ricky Wysocki (#2) | Evelina Salonen (#2) |
| 3 | Flight Squad | Calvin Heimburg (#3) | Ohn Scoggins (#3) |
| 4 | Birdie Storm | Isaac Robinson (#4) | Missy Gannon (#4) |
| 5 | Chain Breakers | Paul McBeth (#5) | Holyn Handley (#5) |
| 6 | Disc Jesters | Kyle Klein (#6) | Silva Saarinen (#7) |
| 7 | Midas Touch | Matthew Orum (#7) | Ella Hansen (#8) |
| 8 | Chain Seekers | Anthony Barela (#8) | Hailey King (#9) |
| 9 | Fairway Bombers | Niklas Anttila (#9) | Heidi Laine (#10) |
| 10 | Disc Dynasty | Chris Dickerson (#10) | Paige Pierce (#11) |
| 11 | Ace Makers | Simon Lizotte (#11) | Kat Mertsch (#12) |
| 12 | Glide Masters | Ezra Robinson (#12) | Natalie Ryan (#12) |

### Reserve Player Pools (2 pools - NOT actual teams)

| # | Pool Name | Reserve Golfers |
|---|-----------|-----------------|
| 13 | Reserve Males | Eagle McMahon (#13), Joel Freeman (#14) |
| 14 | Reserve Females | Henna Blomroos (#13), Valerie Mandujano (#13) |

**Important:** These are NOT actual teams - they are reserve player pools. When a primary golfer gets injured during play, you substitute in a reserve of the correct gender from these pools. The 12 actual teams can use these reserves when needed.

## How to Query

### Get all teams with golfers

```typescript
import { pb } from '$lib/pocketbase';

const teams = await pb.collection('teams').getFullList({
  expand: 'male_golfer,female_golfer',
  sort: 'name'
});

teams.forEach(team => {
  console.log(team.name);
  console.log('  Male:', team.expand.male_golfer.name);
  console.log('  Female:', team.expand.female_golfer.name);
});
```

### Get a specific team

```typescript
const team = await pb.collection('teams').getFirstListItem(
  'name = "Hyzer Heros"',
  { expand: 'male_golfer,female_golfer' }
);

console.log(team.name);
console.log('Male:', team.expand.male_golfer.name);
console.log('Female:', team.expand.female_golfer.name);
```

### Find team by golfer

```typescript
// Find team with a specific male golfer
const team = await pb.collection('teams').getFirstListItem(
  `male_golfer = "${golferId}"`,
  { expand: 'male_golfer,female_golfer' }
);

// Find team with a specific female golfer
const team = await pb.collection('teams').getFirstListItem(
  `female_golfer = "${golferId}"`,
  { expand: 'male_golfer,female_golfer' }
);
```

### Get reserve teams

```typescript
const reserveTeams = await pb.collection('teams').getFullList({
  filter: 'name ~ "Reserve"',
  expand: 'male_golfer,female_golfer'
});
```

## Reserve System

FLI Golf has **12 actual teams** and **2 reserve player pools** (not teams):
- Reserve Males pool: 2 male golfers
- Reserve Females pool: 2 female golfers

### How Reserves Work

When a primary golfer gets injured during play:
1. The team substitutes in a reserve of the correct gender from the reserve pool
2. The `male_reserve_used` or `female_reserve_used` flag is set to `true`
3. Each team can only use one reserve per gender per season

### Using a Reserve

```typescript
// When a team's male golfer gets injured, substitute a reserve male
await pb.collection('teams').update(teamId, {
  male_golfer: reserveMaleGolferId, // From Reserve Males pool
  male_reserve_used: true
});

// When a team's female golfer gets injured, substitute a reserve female
await pb.collection('teams').update(teamId, {
  female_golfer: reserveFemaleGolferId, // From Reserve Females pool
  female_reserve_used: true
});
```

**Important:** The reserve pools (entries 13 & 14 in the teams collection) are just data structures to hold reserve golfers - they don't compete as teams.

## Files Created

- `scripts/populate-teams-with-golfers.ts` - Population script
- `TEAMS_COMPLETE.md` - This documentation

## Complete Database Status

All collections are now fully configured and populated:

### Collections
- ✅ `users` (4 test users)
- ✅ `fantasy_seasons` (2 seasons)
- ✅ `fantasy_season_participants` (participants)
- ✅ `golfers` (28 golfers: 14 male + 14 female)
- ✅ `teams` (14 teams with golfer assignments)

### Data Summary
- **Users:** 4 test users
- **Fantasy Seasons:** 2 seasons
- **Golfers:** 28 (14 male + 14 female)
- **Teams:** 14 (12 regular + 2 reserve)
- **Golfer Assignments:** Direct relations (1 male + 1 female per team)

## Removed Collections

The `team_golfers` junction table is no longer needed since we're using direct relations. It can be safely deleted from PocketBase admin if it still exists.

## Next Steps

You can now:
1. Display team rosters in the UI
2. Implement reserve substitution logic
3. Create tournament scoring based on team golfers
4. Build team standings and leaderboards
5. Show golfer profiles with their team assignment

## Access

**Application:** https://5173--019ac382-c5c7-7e07-bc87-256e07ce3ba3.us-east-1-01.gitpod.dev  
**Login:** owner@test.com / password123  
**PocketBase Admin:** https://pocketbase-production-e678.up.railway.app/_/

## Verification

Test the setup:

```bash
npx tsx -e "
import PocketBase from 'pocketbase';
const pb = new PocketBase('https://pocketbase-production-e678.up.railway.app');
pb.collection('users').authWithPassword('owner@test.com', 'password123').then(() => {
  return pb.collection('teams').getList(1, 5, { expand: 'male_golfer,female_golfer' });
}).then(teams => {
  teams.items.forEach(t => {
    console.log(t.name + ':', t.expand.male_golfer.name, '+', t.expand.female_golfer.name);
  });
}).catch(e => console.error(e.message));
"
```

---

**Status:** ✅ Teams fully configured with direct golfer relations!

**Last Updated:** 2025-11-27
