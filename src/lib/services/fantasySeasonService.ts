import type PocketBase from 'pocketbase';
import {
	fantasySeasonCreateSchema,
	fantasySeasonRecordSchema,
	fantasySeasonParticipantRecordSchema,
	type FantasySeasonCreateInput,
	type FantasySeason,
	type FantasySeasonParticipant
} from '$lib/schemas/fantasy';

export class FantasySeasonService {
	constructor(private pb: PocketBase) {}
	/**
	 * Create a new fantasy season owned by ownerUserId.
	 * Uses Zod to validate input from the form.
	 */
	async createSeasonForOwner(
		ownerUserId: string,
		rawInput: unknown
	): Promise<FantasySeason> {
		// Validate & clean input using Zod
		const input: FantasySeasonCreateInput = fantasySeasonCreateSchema.parse(rawInput);

		const payload = {
			...input,
			owner: ownerUserId,
			status: 'filling',
			participants_count: 1,
			schedule_generated: false
		};

		const created = await this.pb.collection('fantasy_seasons').create(payload);
		return fantasySeasonRecordSchema.parse(created);
	}

	/**
	 * Add another participant to this season.
	 * Does not allow duplicates.
	 */
	async addParticipant(
		seasonId: string,
		userId: string
	): Promise<{ season: FantasySeason; participant: FantasySeasonParticipant }> {
		const seasonRecord = await this.pb.collection('fantasy_seasons').getOne(seasonId);

		const season = fantasySeasonRecordSchema.parse(seasonRecord);

		if (season.status !== 'filling') {
			throw new Error('Season is not accepting new participants');
		}

		// Check if participant already exists
		const existing = await this.pb.collection('fantasy_season_participants').getFullList({
			filter: `season = "${seasonId}" && user = "${userId}"`
		});

		if (existing.length > 0) {
			return {
				season,
				participant: fantasySeasonParticipantRecordSchema.parse(existing[0])
			};
		}

		const participantRecord = await this.pb.collection('fantasy_season_participants').create({
			season: seasonId,
			user: userId,
			is_owner: false,
			joined_at: new Date().toISOString()
		});

		const participant = fantasySeasonParticipantRecordSchema.parse(participantRecord);

		// Reload participants count
		const allParticipants = await this.pb.collection('fantasy_season_participants').getFullList({
			filter: `season = "${seasonId}"`
		});

		const updatedSeasonRecord = await this.pb
			.collection('fantasy_seasons')
			.update(seasonId, {
				participants_count: allParticipants.length
			});

		const updatedSeason = fantasySeasonRecordSchema.parse(updatedSeasonRecord);

		return { season: updatedSeason, participant };
	}

	/**
	 * List seasons for a given owner.
	 */
	async listSeasonsByOwner(ownerUserId: string): Promise<FantasySeason[]> {
		const list = await this.pb.collection('fantasy_seasons').getFullList({
			filter: `owner = "${ownerUserId}"`,
			sort: '-created'
		});

		return list.map((record) => fantasySeasonRecordSchema.parse(record));
	}
}
