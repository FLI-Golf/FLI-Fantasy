import { z } from 'zod';

// Schema for creating a new fantasy season
export const fantasySeasonCreateSchema = z.object({
	name: z.string().min(3, 'Season name must be at least 3 characters'),
	description: z.string().optional(),
	max_participants: z.number().int().min(2).max(100).default(12),
	start_date: z.string().datetime().optional(),
	end_date: z.string().datetime().optional()
});

export type FantasySeasonCreateInput = z.infer<typeof fantasySeasonCreateSchema>;

// Schema for a fantasy season record from PocketBase
export const fantasySeasonRecordSchema = z.object({
	id: z.string(),
	collectionId: z.string().optional(),
	collectionName: z.string().optional(),
	created: z.string(),
	updated: z.string(),
	name: z.string(),
	description: z.string().optional(),
	owner: z.string(),
	status: z.enum(['filling', 'active', 'completed', 'cancelled']),
	max_participants: z.number(),
	participants_count: z.number(),
	schedule_generated: z.boolean(),
	start_date: z.string().optional(),
	end_date: z.string().optional()
});

export type FantasySeason = z.infer<typeof fantasySeasonRecordSchema>;

// Schema for a fantasy season participant record
export const fantasySeasonParticipantRecordSchema = z.object({
	id: z.string(),
	collectionId: z.string().optional(),
	collectionName: z.string().optional(),
	created: z.string(),
	updated: z.string(),
	season: z.string(),
	user: z.string(),
	is_owner: z.boolean(),
	joined_at: z.string(),
	total_points: z.number().optional()
});

export type FantasySeasonParticipant = z.infer<typeof fantasySeasonParticipantRecordSchema>;
