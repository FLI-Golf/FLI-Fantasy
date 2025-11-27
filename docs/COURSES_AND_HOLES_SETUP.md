# Courses and Holes Setup Complete ✅

## Overview

Created courses and holes collections for tournament scoring, with 2 test courses (A and B) each having 4 holes.

## Collections Created

### 1. Courses Collection

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Auto-generated course ID |
| `name` | text | Yes | Course name (2-100 chars) |
| `location` | text | No | Course location (max 200 chars) |
| `description` | text | No | Course description (max 500 chars) |
| `is_active` | bool | Yes | Whether course is active |

### 2. Holes Collection

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | text | Yes | Auto-generated hole ID |
| `course` | relation | Yes | Reference to courses collection |
| `hole_number` | number | Yes | Hole number (1+) |
| `par` | number | Yes | Par for the hole (3 only) |
| `distance` | number | Yes | Distance in feet (1-333) |

**Note:** All holes are Par 3 with distances between 1-333 feet as specified.

### 3. Tournaments Collection (Updated)

Added new field:
- `course` (relation) - Reference to courses collection

## Relationships

```
tournaments (1) ←→ (1) courses
courses (1) ←→ (many) holes
```

## Test Courses Created

### Course A: "Test Course A"
- **Location:** Test Location A
- **Description:** Test course with 4 holes for scoring tests
- **Holes:**
  1. Hole 1: 150ft, Par 3
  2. Hole 2: 200ft, Par 3
  3. Hole 3: 250ft, Par 3
  4. Hole 4: 300ft, Par 3

### Course B: "Test Course B"
- **Location:** Test Location B
- **Description:** Test course with 4 holes for scoring tests
- **Holes:**
  1. Hole 1: 175ft, Par 3
  2. Hole 2: 225ft, Par 3
  3. Hole 3: 275ft, Par 3
  4. Hole 4: 325ft, Par 3

## How to Query

### Get all courses

```typescript
import { pb } from '$lib/pocketbase';

const courses = await pb.collection('courses').getFullList({
  filter: 'is_active = true'
});
```

### Get course with holes

```typescript
const course = await pb.collection('courses').getOne(courseId);

const holes = await pb.collection('holes').getFullList({
  filter: `course = "${courseId}"`,
  sort: 'hole_number'
});

console.log(`${course.name} has ${holes.length} holes`);
holes.forEach(hole => {
  console.log(`Hole ${hole.hole_number}: ${hole.distance}ft, Par ${hole.par}`);
});
```

### Get tournament with course and holes

```typescript
const tournament = await pb.collection('tournaments').getOne(tournamentId, {
  expand: 'course'
});

const holes = await pb.collection('holes').getFullList({
  filter: `course = "${tournament.course}"`,
  sort: 'hole_number'
});

console.log(`Tournament: ${tournament.name}`);
console.log(`Course: ${tournament.expand.course.name}`);
console.log(`Holes: ${holes.length}`);
```

### Create a tournament with a course

```typescript
const tournament = await pb.collection('tournaments').create({
  name: 'Test Tournament',
  season: seasonId,
  course: courseId, // Link to course
  start_date: '2024-06-01',
  end_date: '2024-06-02',
  location: 'Test Location',
  status: 'upcoming'
});
```

## Scoring System

With 4 holes per course, scoring tests will be quick:
- **Total Par:** 12 (4 holes × Par 3)
- **Quick Testing:** Only need to enter 4 scores per golfer
- **Expandable:** Can add more holes later for full tournaments

### Example Scoring

For a golfer playing Course A:
```typescript
const scores = [
  { hole: 1, strokes: 3 }, // Par
  { hole: 2, strokes: 2 }, // Birdie (-1)
  { hole: 3, strokes: 4 }, // Bogey (+1)
  { hole: 4, strokes: 3 }  // Par
];

// Total: 12 strokes (even par)
// Score relative to par: 0
```

## Adding More Holes

When ready for full tournaments, you can add more holes:

```typescript
// Add holes 5-9 to Course A
const additionalHoles = [
  { hole_number: 5, distance: 180, par: 3 },
  { hole_number: 6, distance: 220, par: 3 },
  { hole_number: 7, distance: 260, par: 3 },
  { hole_number: 8, distance: 290, par: 3 },
  { hole_number: 9, distance: 310, par: 3 }
];

for (const hole of additionalHoles) {
  await pb.collection('holes').create({
    course: courseAId,
    ...hole
  });
}
```

## Files Created

- `scripts/setup-courses-and-holes.ts` - Setup script
- `COURSES_AND_HOLES_SETUP.md` - This documentation

## Database Status

All collections are now ready for tournament scoring:

### Collections
- ✅ `users` (4 test users)
- ✅ `fantasy_seasons` (2 seasons)
- ✅ `fantasy_season_participants` (participants)
- ✅ `golfers` (28 golfers)
- ✅ `teams` (14 teams with golfer assignments)
- ✅ `tournaments` (with course relation)
- ✅ `courses` (2 test courses) **NEW**
- ✅ `holes` (8 holes: 4 per course) **NEW**

### Data Summary
- **Courses:** 2 (Test Course A, Test Course B)
- **Holes:** 8 (4 per course, all Par 3)
- **Distance Range:** 150-325 feet
- **Total Par per Course:** 12

## Next Steps

You can now:
1. Create tournaments linked to courses
2. Implement scoring system for golfers
3. Track scores per hole
4. Calculate tournament results
5. Display leaderboards

## Access

**Application:** https://5173--019ac382-c5c7-7e07-bc87-256e07ce3ba3.us-east-1-01.gitpod.dev  
**Login:** owner@test.com / password123  
**PocketBase Admin:** https://pocketbase-production-e678.up.railway.app/_/

## Verification

Check the setup:

```bash
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

---

**Status:** ✅ Courses and holes ready for tournament scoring tests!

**Last Updated:** 2025-11-27
