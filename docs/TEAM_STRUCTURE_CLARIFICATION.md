# FLI Golf Team Structure Clarification

## Correct Structure

FLI Golf has:
- **12 actual competing teams**
- **2 reserve player pools** (NOT teams)

## The 12 Actual Teams

Each team has exactly 1 male golfer + 1 female golfer:

1. **Hyzer Heros** - Gannon Buhr + Kristin Tattar
2. **Huk-a-Mania** - Ricky Wysocki + Evelina Salonen
3. **Flight Squad** - Calvin Heimburg + Ohn Scoggins
4. **Birdie Storm** - Isaac Robinson + Missy Gannon
5. **Chain Breakers** - Paul McBeth + Holyn Handley
6. **Disc Jesters** - Kyle Klein + Silva Saarinen
7. **Midas Touch** - Matthew Orum + Ella Hansen
8. **Chain Seekers** - Anthony Barela + Hailey King
9. **Fairway Bombers** - Niklas Anttila + Heidi Laine
10. **Disc Dynasty** - Chris Dickerson + Paige Pierce
11. **Ace Makers** - Simon Lizotte + Kat Mertsch
12. **Glide Masters** - Ezra Robinson + Natalie Ryan

## Reserve Player Pools (NOT Teams)

These are placeholders for injury substitutions:

### Reserve Males Pool
- Eagle McMahon (#13)
- Joel Freeman (#14)

### Reserve Females Pool
- Henna Blomroos (#13)
- Valerie Mandujano (#13)

## How Reserves Work

**Purpose:** When a primary golfer gets injured during play, teams can substitute in a reserve of the correct gender.

**Rules:**
1. Only substitute when a golfer is injured during play
2. Must use a reserve of the same gender
3. Each team can only use one reserve per gender per season
4. Tracked via `male_reserve_used` and `female_reserve_used` boolean fields

**Example:**
If Paul McBeth (male golfer on Chain Breakers) gets injured:
- Chain Breakers can substitute Eagle McMahon or Joel Freeman from the Reserve Males pool
- Set `male_reserve_used = true` for Chain Breakers
- Chain Breakers cannot use another male reserve for the rest of the season

## Database Structure

In the `teams` collection:
- Records 1-12: Actual competing teams
- Records 13-14: Reserve player pools (data structures, not competing teams)

The reserve pools use the same collection structure for convenience, but they don't compete in tournaments - they're just holding areas for substitute players.

## Key Points

✅ **12 teams compete** in tournaments  
✅ **2 reserve pools** provide substitutes  
❌ Reserve pools do NOT compete as teams  
❌ Reserve pools do NOT have standings  
❌ Reserve pools do NOT score points  

The reserve pools exist solely to provide injury replacements for the 12 actual teams.
