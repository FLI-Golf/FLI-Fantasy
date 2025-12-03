# Real-Time Scoring System

## Overview

FLI Golf uses a centralized scoring system where ONE professional tournament affects THOUSANDS of fantasy leagues simultaneously.

## Architecture

```
Professional Tournament
  ├─ Tournament Rounds (4 rounds)
  │   ├─ Tournament Pairings (6 pairings, 2 teams each)
  │   │   └─ Scorekeeper (1 per pairing)
  │   └─ Golfer Scores (28 golfers)
  │       └─ Updated in real-time
  │
  └─ Fantasy Leagues (1000s)
      └─ Standings calculated from golfer scores
```

## Collections Created

### 1. user_profile
Extends user with role-based access.

**Fields:**
- `user` (relation to users) - The user
- `role` (select) - participant, scorekeeper, admin
- `assigned_pairing` (number 1-6) - Which pairing this scorekeeper manages

**Purpose:** Identify scorekeepers and assign them to specific pairings.

### 2. tournament_rounds
Each tournament has multiple rounds (typically 4).

**Fields:**
- `tournament` (relation) - The professional tournament
- `round_number` (number 1-4) - Which round
- `round_date` (date) - When this round occurs
- `status` (select) - upcoming, in_progress, completed

**Purpose:** Track rounds within a tournament for scoring.

### 3. tournament_pairings
Groups of 2 teams playing together, scored by 1 scorekeeper.

**Fields:**
- `tournament_round` (relation) - Which round
- `pairing_number` (number 1-6) - Pairing identifier
- `team1` (relation to teams) - First team (2 golfers)
- `team2` (relation to teams) - Second team (2 golfers)
- `scorekeeper` (relation to users) - Assigned scorekeeper
- `starting_hole` (number) - For shotgun starts

**Purpose:** 
- 12 teams ÷ 2 teams per pairing = 6 pairings
- Each pairing has 1 scorekeeper
- Scorekeeper enters scores for 4 golfers (2 teams × 2 golfers)

### 4. golfer_scores
**ONE record per golfer per round** - Source of truth for all fantasy leagues.

**Fields:**
- `tournament_round` (relation) - Which round
- `golfer` (relation) - Which professional golfer
- `hole_scores` (json) - Array of scores per hole: `[3, 2, 4, 3, ...]`
- `total_score` (number) - Total strokes for the round
- `score_to_par` (number) - Score relative to par (-2, +1, etc.)
- `updated_by` (relation to users) - Which scorekeeper entered this

**Purpose:** 
- Single source of truth
- Updated by scorekeepers in real-time
- All fantasy leagues calculate from this data

### 5. fantasy_league_drafts
Tracks which participant drafted which team in each tournament.

**Fields:**
- `fantasy_season` (relation) - Which fantasy league
- `tournament` (relation) - Which tournament
- `participant` (relation to users) - Who drafted
- `team` (relation to teams) - Which team they picked
- `draft_order` (number 1-6) - Their position in draft order
- `pick_number` (number 1-12) - Which overall pick (1st, 2nd, etc.)

**Purpose:** 
- Each participant drafts 2 teams per tournament
- Draft order is randomized per tournament
- Determines which golfers count for each participant's score

## Scoring Flow

### Setup Phase (Before Tournament)

1. **Create Tournament**
   - Name: "USDGC 2024"
   - Dates, venue, course
   - Status: upcoming

2. **Create 4 Rounds**
   - Round 1-4 with dates
   - Status: upcoming

3. **Create 6 Pairings per Round**
   - Pair up the 12 teams (2 teams per pairing)
   - Assign 1 scorekeeper to each pairing
   - Set starting holes (for shotgun start)

4. **Fantasy Leagues Draft**
   - When league fills (6 participants)
   - Random draft order assigned
   - Each participant picks 2 teams
   - Recorded in `fantasy_league_drafts`

### Live Scoring Phase (During Tournament)

1. **Scorekeeper Logs In**
   - Role: scorekeeper
   - Assigned to pairing #3 (for example)

2. **Scorekeeper Opens Multi-Step Form**
   - Select tournament round
   - Shows their assigned pairing (2 teams = 4 golfers)
   - Enter scores hole-by-hole

3. **Scorekeeper Enters Scores**
   ```
   Pairing 3:
   - Team: Midas Touch
     - Matthew Orum: [3, 2, 4, 3, ...]
     - Ella Hansen: [3, 3, 3, 2, ...]
   - Team: Chain Seekers
     - Anthony Barela: [2, 3, 4, 3, ...]
     - Hailey King: [3, 3, 2, 4, ...]
   ```

4. **Scores Saved to Database**
   - Creates/updates `golfer_scores` records
   - ONE record per golfer per round
   - Calculates total_score and score_to_par

5. **All Fantasy Leagues Update**
   - Real-time calculation
   - Each league's standings recalculated
   - Based on which teams each participant drafted

## Scorekeeper Accounts

**Created:** 6 scorekeeper accounts

| Email | Password | Assigned Pairing |
|-------|----------|------------------|
| scorekeeper1@fligolf.com | scorekeeper123 | Pairing 1 |
| scorekeeper2@fligolf.com | scorekeeper123 | Pairing 2 |
| scorekeeper3@fligolf.com | scorekeeper123 | Pairing 3 |
| scorekeeper4@fligolf.com | scorekeeper123 | Pairing 4 |
| scorekeeper5@fligolf.com | scorekeeper123 | Pairing 5 |
| scorekeeper6@fligolf.com | scorekeeper123 | Pairing 6 |

## Example: How It All Works Together

### Tournament: "USDGC 2024"

**Round 1, Pairing 3:**
- Team: Midas Touch (Matthew Orum + Ella Hansen)
- Team: Chain Seekers (Anthony Barela + Hailey King)
- Scorekeeper: scorekeeper3@fligolf.com

**Fantasy League "John's League":**
- Participant 1 drafted: Midas Touch
- Participant 2 drafted: Chain Seekers
- Participant 3 drafted: Hyzer Heros
- ... etc

**When Scorekeeper 3 enters scores:**
1. Matthew Orum scores 54 (Par 3 × 18 holes = 54 par)
2. Ella Hansen scores 52 (-2 under par)
3. Saved to `golfer_scores`

**Fantasy League Standings Update:**
- Participant 1's score includes Matthew + Ella's scores
- Participant 2's score includes Anthony + Hailey's scores
- All calculated in real-time from `golfer_scores`

## Benefits

✅ **Scalability** - One tournament, unlimited fantasy leagues  
✅ **Real-time** - Scores update instantly across all leagues  
✅ **Single Source** - No duplicate data, one truth  
✅ **Distributed Scoring** - 6 scorekeepers work simultaneously  
✅ **Accountability** - Track who entered each score  

## Next Steps

1. Build scorekeeper multi-step form
2. Implement real-time updates (WebSocket/polling)
3. Create fantasy league standings calculator
4. Build participant dashboard
5. Add tournament/round management UI

---

**Status:** ✅ All collections created and ready for development!
