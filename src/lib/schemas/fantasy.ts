import { z } from 'zod';

// Schema for creating a new fantasy league
export const fantasyLeagueCreateSchema = z.object({
	season: z.enum(['2026', '2027', '2028']).default('2026')
});

export type FantasyLeagueCreateInput = z.infer<typeof fantasyLeagueCreateSchema>;

// Aliases for backward compatibility with fantasySeasonService
export const fantasySeasonCreateSchema = fantasyLeagueCreateSchema;
export type FantasySeasonCreateInput = FantasyLeagueCreateInput;

// Schema for a fantasy league record from PocketBase
export const fantasyLeagueRecordSchema = z.object({
	id: z.string(),
	collectionId: z.string().optional(),
	collectionName: z.string().optional(),
	created: z.string(),
	updated: z.string(),
	title: z.string(),
	league_owner: z.string(),
	fantasy_participants: z.string().optional(),
	season: z.enum(['2026', '2027', '2028']).optional(),
	fantasy_tournaments: z.array(z.string()).optional(), // Array of fantasy_tournament IDs
	tournaments: z.union([z.string(), z.array(z.string())]).optional(), // Can be string or array
	settings: z.any().optional() // JSON field for settings
});

export type FantasyLeague = z.infer<typeof fantasyLeagueRecordSchema>;

// Aliases for backward compatibility with fantasySeasonService
export const fantasySeasonRecordSchema = fantasyLeagueRecordSchema;
export type FantasySeason = FantasyLeague;

// Schema for fantasy season participant
export const fantasySeasonParticipantSchema = z.object({
	id: z.string(),
	collectionId: z.string().optional(),
	collectionName: z.string().optional(),
	created: z.string(),
	updated: z.string(),
	user: z.string(),
	league: z.string().optional(), // Link to fantasy_league
	status: z.enum(['pending', 'approved', 'rejected']).optional(),
	is_owner: z.boolean(),
	joined_at: z.string(),
	approved_at: z.string().optional(),
	total_points: z.number().optional()
});

export type FantasySeasonParticipant = z.infer<typeof fantasySeasonParticipantSchema>;

// Alias for backward compatibility
export const fantasySeasonParticipantRecordSchema = fantasySeasonParticipantSchema;

// Schema for tournament record
export const tournamentSchema = z.object({
	id: z.string(),
	name: z.string(),
	start_date: z.string(),
	end_date: z.string(),
	status: z.enum(['next', 'upcoming', 'in_progress', 'completed']).optional(),
	season: z.enum(['2026', '2027', '2028']).optional(),
	location: z.any().optional(),
	course: z.string().optional()
});

export type Tournament = z.infer<typeof tournamentSchema>;

// Schema for fantasy tournament
export const fantasyTournamentSchema = z.object({
	id: z.string(),
	collectionId: z.string().optional(),
	collectionName: z.string().optional(),
	created: z.string(),
	updated: z.string(),
	draft_order: z.array(z.string()).optional(),
	fantasy_league: z.string(),
	draft_results: z.any().optional(),
	tournament: z.string().optional(), // Reference to actual tournament
	name: z.string().optional(), // Name from the tournament
	title: z.string().optional() // Formatted title with date and tournament name
});

export type FantasyTournament = z.infer<typeof fantasyTournamentSchema>;

// Schema for fantasy league settings
export const fantasySettingsSchema = z.object({
	start_pause_interval: z.number().int().min(30).max(300).default(60), // seconds between picks
	rounds: z.number().int().min(1).max(10).default(5), // number of draft rounds
	check_gender: z.boolean().default(false), // whether to enforce gender balance
	min_participants: z.number().int().min(2).max(100).default(6), // minimum to start (owner + 5)
	auto_generate_tournaments: z.boolean().default(true) // auto-create fantasy tournaments when ready
});

export type FantasySettings = z.infer<typeof fantasySettingsSchema>;
