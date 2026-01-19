# Live Ticker Strategy

## Overview

The live ticker is a prominent, always-visible component at the top of the site. It needs to display contextually relevant content based on what's happening in the FLI ecosystem.

## Content Priority (Highest to Lowest)

1. **Live Tournament Scores** - When a tournament is `in_progress`
2. **Breaking News / Announcements** - Admin-created urgent messages
3. **Upcoming Tournament Countdown** - Days/hours until next event
4. **Ticket Sales / Promotions** - E-commerce promotions
5. **Fantasy League Updates** - Draft reminders, standings changes
6. **General Branding** - Default rotating content

## Proposed Architecture

### Option A: New `ticker_items` Collection (Recommended)

Create a dedicated collection to manage ticker content:

```
ticker_items {
  id: string
  type: 'announcement' | 'promotion' | 'countdown' | 'fantasy' | 'custom'
  title: string
  message: string
  link_url: string (optional)
  link_text: string (optional)
  icon: string (optional) - lucide icon name
  priority: number (1-100, higher = more important)
  starts_at: datetime
  expires_at: datetime
  is_active: boolean
  style: json {
    bg_color: string
    text_color: string
    accent_color: string
  }
}
```

### Option B: Smart Component Logic

Keep current structure but make the ticker component intelligent:

```typescript
// Ticker content resolution order:
1. Check tournaments.status === 'in_progress' → Show live scores
2. Check ticker_items for active announcements → Show announcements
3. Check tournaments.status === 'next' → Show countdown
4. Check products with 'featured' flag → Show promotions
5. Default → Show branding/welcome message
```

## Recommended Implementation

### Phase 1: Multi-Mode Ticker Component

Update `LiveScoreTicker.svelte` to support multiple modes:

```typescript
type TickerMode = 
  | 'live_scores'      // Current implementation
  | 'countdown'        // Next tournament countdown
  | 'announcement'     // Breaking news
  | 'promotion'        // Ticket sales, merch
  | 'fantasy'          // Draft reminders
  | 'idle';            // Default branding

interface TickerState {
  mode: TickerMode;
  data: any;
  priority: number;
}
```

### Phase 2: Create `ticker_items` Collection

PocketBase schema:

```json
{
  "name": "ticker_items",
  "type": "base",
  "schema": [
    { "name": "type", "type": "select", "options": { "values": ["announcement", "promotion", "countdown", "fantasy", "custom"] } },
    { "name": "title", "type": "text", "required": true },
    { "name": "message", "type": "text" },
    { "name": "link_url", "type": "url" },
    { "name": "link_text", "type": "text" },
    { "name": "priority", "type": "number", "min": 1, "max": 100 },
    { "name": "starts_at", "type": "date" },
    { "name": "expires_at", "type": "date" },
    { "name": "is_active", "type": "bool" },
    { "name": "bg_color", "type": "text" },
    { "name": "text_color", "type": "text" }
  ]
}
```

### Phase 3: Admin Interface

Add ticker management to `/admin`:
- Create/edit ticker items
- Preview ticker appearance
- Set scheduling (starts_at, expires_at)
- Toggle active status

## Content Type Examples

### Live Scores (Current)
```
┌─────────────────────────────────────────────────────────────┐
│ [Team Logo] Disc Devils  |  Lizotte -3  |  Ryan -3         │
│             Team: -6        thru 12        thru 12         │
└─────────────────────────────────────────────────────────────┘
```

### Countdown to Next Tournament
```
┌─────────────────────────────────────────────────────────────┐
│ 🏆 FLI Masters Championship starts in 3 days, 14 hours     │
│    April 4, 2026 • Phoenix, AZ    [Get Tickets →]          │
└─────────────────────────────────────────────────────────────┘
```

### Ticket Sales Promotion
```
┌─────────────────────────────────────────────────────────────┐
│ 🎟️ Early Bird Tickets Available! Save 20% on FLI Open     │
│    Use code EARLYBIRD at checkout    [Shop Now →]          │
└─────────────────────────────────────────────────────────────┘
```

### Fantasy Draft Reminder
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Fantasy Draft for FLI Masters starts in 2 hours!        │
│    Don't miss your picks    [Go to Draft →]                │
└─────────────────────────────────────────────────────────────┘
```

### Breaking Announcement
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Weather Delay: Round 2 postponed to 2:00 PM             │
│    Check back for updates                                   │
└─────────────────────────────────────────────────────────────┘
```

## Component Structure

```
src/lib/components/
├── LiveTicker.svelte           # Main orchestrator
├── ticker/
│   ├── TickerScores.svelte     # Live tournament scores (current)
│   ├── TickerCountdown.svelte  # Next tournament countdown
│   ├── TickerPromotion.svelte  # Sales/promotions
│   ├── TickerAnnouncement.svelte # Breaking news
│   └── TickerFantasy.svelte    # Fantasy updates
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     LiveTicker.svelte                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. Check active tournament (in_progress)           │    │
│  │     → Yes: Render TickerScores                      │    │
│  │     → No: Continue                                  │    │
│  │                                                     │    │
│  │  2. Check ticker_items (active, not expired)        │    │
│  │     → Found: Render by type (highest priority)      │    │
│  │     → None: Continue                                │    │
│  │                                                     │    │
│  │  3. Check next tournament                           │    │
│  │     → Within 7 days: Render TickerCountdown         │    │
│  │     → No: Render default branding                   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Real-time Updates

- Subscribe to `golfer_scores` for live score updates
- Subscribe to `ticker_items` for admin-pushed announcements
- Subscribe to `tournaments` for status changes
- Poll every 30s as fallback

## Migration Path

1. Keep current `LiveScoreTicker` working as-is
2. Create new `LiveTicker` component with mode switching
3. Add `ticker_items` collection to PocketBase
4. Build admin UI for ticker management
5. Replace `LiveScoreTicker` with `LiveTicker` in layout

## Tournament Status Flow

```
upcoming → next → in_progress → completed
                      ↓
              Show live scores
```

Only ONE tournament should be `in_progress` at a time. The `next` tournament is the one coming up soonest.

---

# Season & Tournament Finalization

## Tournament Finalization

When a tournament ends, run:
```bash
pnpm tsx scripts/finalize-tournament.ts [--force]
```

This will:
1. Check if all golfers completed all holes
2. Award tournament prizes (points) to top 3 fantasy teams
3. Update `fantasy_season_participants.total_points`
4. Mark tournament status as `completed`

## Season Finalization

At the end of a season, run:
```bash
pnpm tsx scripts/finalize-season.ts <league_id> <season>
```

Example:
```bash
pnpm tsx scripts/finalize-season.ts nzmh5mh8xam7sag 2026
```

This will:
1. Calculate final rankings from `total_points`
2. Generate store credit codes for prize winners
3. Archive results to `fantasy_season_results` collection

### Season Prize Configuration

Default prizes (configurable in script):
- **1st Place**: $100 store credit
- **2nd Place**: $50 store credit  
- **3rd Place**: $25 store credit

### fantasy_season_results Schema

| Field | Type | Description |
|-------|------|-------------|
| league | relation | Link to fantasy league |
| season | select | 2025, 2026, 2027, 2028 |
| user | relation | Link to user |
| final_rank | number | Final position (1, 2, 3...) |
| total_points | number | Season point total |
| tournaments_played | number | Count of tournaments |
| tournament_wins | number | Count of 1st place finishes |
| prize_type | select | store_credit, merch, cash, trophy, custom |
| prize_value | number | Dollar value of prize |
| prize_description | text | Human-readable prize description |
| prize_claimed | bool | Has user claimed their prize? |
| prize_claimed_at | date | When prize was claimed |
| store_credit_code | text | Generated code like FLI26-ABC12345 |
| tournament_results | json | Array of tournament finishes |
| finalized_at | date | When season was finalized |

### Store Credit Integration

Store credit codes are generated in format: `FLI{YY}-{8 chars}`
Example: `FLI26-ABCD1234`

These codes can be validated at checkout in the shop to apply discounts.
