# PocketBase Collections Relationships

Visual representation of how all collections relate to each other.

## Entity Relationship Diagram

```
┌─────────────────┐
│     users       │ (Built-in Auth Collection)
│─────────────────│
│ id              │
│ email           │
│ name            │
│ avatar          │
└────────┬────────┘
         │
         │ owner
         ▼
┌─────────────────────────┐
│  fantasy_seasons        │
│─────────────────────────│
│ id                      │
│ name                    │
│ description             │
│ owner → users           │◄────────┐
│ status                  │         │
│ max_participants        │         │
│ participants_count      │         │
│ schedule_generated      │         │
│ start_date              │         │
│ end_date                │         │
└────────┬────────────────┘         │
         │                          │
         │ season                   │
         ▼                          │
┌──────────────────────────────┐   │
│ fantasy_season_participants  │   │
│──────────────────────────────│   │
│ id                           │   │
│ season → fantasy_seasons     │───┘
│ user → users                 │
│ is_owner                     │
│ joined_at                    │
│ total_points                 │
└────────┬─────────────────────┘
         │
         │ participant
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
┌─────────────────┐      ┌──────────────────┐
│  draft_picks    │      │    rosters       │
│─────────────────│      │──────────────────│
│ id              │      │ id               │
│ season          │      │ tournament       │
│ participant     │      │ participant      │
│ golfer          │      │ golfer           │
│ pick_number     │      │ is_active        │
│ round_number    │      │ points_earned    │
│ picked_at       │      └──────────────────┘
└─────────────────┘               │
         │                        │
         │                        │ tournament
         │ golfer                 │
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│    golfers      │      │   tournaments    │
│─────────────────│      │──────────────────│
│ id              │      │ id               │
│ name            │      │ name             │
│ country         │      │ season           │
│ world_ranking   │      │ start_date       │
│ photo_url       │      │ end_date         │
│ is_active       │      │ location         │
│ external_id     │      │ status           │
└────────┬────────┘      │ external_id      │
         │               └────────┬─────────┘
         │                        │
         │                        │ tournament
         │                        ▼
         │               ┌──────────────────────┐
         │               │  tournament_rounds   │
         │               │──────────────────────│
         │               │ id                   │
         │               │ tournament           │
         │               │ round_number         │
         │               │ date                 │
         │               │ status               │
         │               └────────┬─────────────┘
         │                        │
         │                        │ tournament_round
         │                        ▼
         │               ┌──────────────────────┐
         │               │   golfer_scores      │
         │               │──────────────────────│
         │               │ id                   │
         │               │ tournament_round     │
         └──────────────►│ golfer               │
                         │ score                │
                         │ total_strokes        │
                         │ position             │
                         │ is_cut               │
                         └──────────────────────┘
```

## Relationship Summary

### One-to-Many Relationships

1. **users → fantasy_seasons**
   - One user can own many seasons
   - Field: `fantasy_seasons.owner`

2. **fantasy_seasons → fantasy_season_participants**
   - One season has many participants
   - Field: `fantasy_season_participants.season`

3. **users → fantasy_season_participants**
   - One user can participate in many seasons
   - Field: `fantasy_season_participants.user`

4. **fantasy_seasons → tournaments**
   - One season has many tournaments
   - Field: `tournaments.season`

5. **tournaments → tournament_rounds**
   - One tournament has many rounds (typically 4)
   - Field: `tournament_rounds.tournament`

6. **tournament_rounds → golfer_scores**
   - One round has many golfer scores
   - Field: `golfer_scores.tournament_round`

7. **golfers → golfer_scores**
   - One golfer has many scores across rounds
   - Field: `golfer_scores.golfer`

8. **fantasy_season_participants → draft_picks**
   - One participant makes many draft picks
   - Field: `draft_picks.participant`

9. **golfers → draft_picks**
   - One golfer can be drafted by one participant per season
   - Field: `draft_picks.golfer`

10. **fantasy_season_participants → rosters**
    - One participant has many roster entries
    - Field: `rosters.participant`

11. **tournaments → rosters**
    - One tournament has many roster entries
    - Field: `rosters.tournament`

12. **golfers → rosters**
    - One golfer can be on many rosters
    - Field: `rosters.golfer`

### Unique Constraints

These prevent duplicate data:

1. **fantasy_season_participants**: `season + user`
   - A user can only join a season once

2. **tournament_rounds**: `tournament + round_number`
   - Each tournament has unique round numbers

3. **golfer_scores**: `tournament_round + golfer`
   - Each golfer has one score per round

4. **draft_picks**: `season + pick_number`
   - Each pick number is unique per season

5. **draft_picks**: `season + golfer`
   - Each golfer can only be drafted once per season

6. **rosters**: `tournament + participant + golfer`
   - Each golfer appears once per participant per tournament

## Data Flow Examples

### Creating a Season and Adding Participants

```
1. User creates fantasy_season
   └─> fantasy_seasons.owner = user.id

2. User invites others
   └─> fantasy_season_participants.season = fantasy_season.id
   └─> fantasy_season_participants.user = invited_user.id

3. Update participant count
   └─> fantasy_seasons.participants_count++
```

### Draft Process

```
1. Season owner starts draft
   └─> fantasy_seasons.status = "active"

2. Participants make picks in order
   └─> draft_picks.participant = current_participant.id
   └─> draft_picks.golfer = selected_golfer.id
   └─> draft_picks.pick_number = current_pick
   └─> draft_picks.round_number = current_round
```

### Tournament Scoring

```
1. Create tournament
   └─> tournaments.season = fantasy_season.id

2. Create rounds (1-4)
   └─> tournament_rounds.tournament = tournament.id
   └─> tournament_rounds.round_number = 1..4

3. Record golfer scores
   └─> golfer_scores.tournament_round = round.id
   └─> golfer_scores.golfer = golfer.id
   └─> golfer_scores.score = actual_score

4. Calculate roster points
   └─> rosters.points_earned = sum(golfer_scores)
   └─> fantasy_season_participants.total_points += points_earned
```

## Query Patterns

### Get all participants in a season

```javascript
const participants = await pb.collection('fantasy_season_participants').getFullList({
  filter: `season = "${seasonId}"`,
  expand: 'user'
});
```

### Get user's drafted golfers

```javascript
const picks = await pb.collection('draft_picks').getFullList({
  filter: `season = "${seasonId}" && participant.user = "${userId}"`,
  expand: 'golfer',
  sort: 'pick_number'
});
```

### Get tournament leaderboard

```javascript
const scores = await pb.collection('golfer_scores').getFullList({
  filter: `tournament_round.tournament = "${tournamentId}"`,
  expand: 'golfer',
  sort: 'position'
});
```

### Get participant's roster for a tournament

```javascript
const roster = await pb.collection('rosters').getFullList({
  filter: `tournament = "${tournamentId}" && participant.user = "${userId}"`,
  expand: 'golfer'
});
```

## Cascade Delete Behavior

When a record is deleted, related records are also deleted:

- Delete **fantasy_season** → deletes all:
  - fantasy_season_participants
  - tournaments
  - draft_picks

- Delete **tournament** → deletes all:
  - tournament_rounds
  - rosters

- Delete **tournament_round** → deletes all:
  - golfer_scores

- Delete **fantasy_season_participant** → deletes all:
  - draft_picks
  - rosters

⚠️ **Warning**: Deleting a season will cascade delete all related data. Consider soft deletes (status = "cancelled") instead.
