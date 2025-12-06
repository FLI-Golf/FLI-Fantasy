import type PocketBase from 'pocketbase';
import {
	fantasyLeagueCreateSchema,
	fantasyLeagueRecordSchema,
	fantasySeasonParticipantSchema,
	fantasyTournamentSchema,
	tournamentSchema,
	fantasySettingsSchema,
	type FantasyLeagueCreateInput,
	type FantasyLeague,
	type FantasySeasonParticipant,
	type FantasyTournament,
	type Tournament,
	type FantasySettings
} from '$lib/schemas/fantasy';

export class FantasyLeagueService {
	constructor(private pb: PocketBase) {}

	/**
	 * Shuffle array using Fisher-Yates algorithm
	 */
	private shuffleArray<T>(array: T[]): T[] {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	/**
	 * Create a new fantasy league owned by ownerUserId
	 */
	async createFantasyLeague(
		ownerUserId: string,
		rawInput: any
	): Promise<{ league: FantasyLeague; participant: FantasySeasonParticipant; tournaments: FantasyTournament[] }> {
		const { userName, season } = rawInput;

		// Check if participant record already exists for this user
		const existingParticipants = await this.pb
			.collection('fantasy_season_participants')
			.getFullList({
				filter: `user = "${ownerUserId}"`
			});

		let participant: FantasySeasonParticipant;

		if (existingParticipants.length > 0) {
			console.log('Reusing existing participant record');
			participant = fantasySeasonParticipantSchema.parse(existingParticipants[0]);
		} else {
			console.log('Creating new participant record');
			// Create owner participant record (will link to league after league is created)
			const tempParticipantPayload = {
				user: ownerUserId,
				is_owner: true,
				status: 'approved', // Owner is auto-approved
				joined_at: new Date().toISOString(),
				approved_at: new Date().toISOString(),
				total_points: 0
			};

			const createdParticipant = await this.pb
				.collection('fantasy_season_participants')
				.create(tempParticipantPayload);
			participant = fantasySeasonParticipantSchema.parse(createdParticipant);
		}

		// Fetch tournaments for the selected season
		let tournaments: Tournament[] = [];
		
		if (season) {
			try {
				const tournamentRecords = await this.pb.collection('tournaments').getFullList({
					filter: `season = "${season}"`,
					sort: 'start_date'
				});
				tournaments = tournamentRecords.map(t => tournamentSchema.parse(t));
				console.log(`Found ${tournaments.length} tournaments for season ${season}`);
			} catch (error) {
				console.error('Error fetching tournaments:', error);
				// Continue without tournaments if they don't exist
			}
		}

		// Create default settings
		const defaultSettings: FantasySettings = {
			start_pause_interval: 60, // 60 seconds between picks
			rounds: 5, // 5 rounds of drafting
			check_gender: false, // don't check gender by default
			min_participants: 6, // owner + 5 more
			auto_generate_tournaments: true
		};

		// Create the league with temporary title (without fantasy_tournaments yet)
		const leaguePayload: any = {
			title: 'Creating...', // Temporary title
			league_owner: ownerUserId,
			season,
			fantasy_participants: participant.id,
			settings: defaultSettings,
			tournaments: '' // Empty string for single relation field
		};

		const createdLeague = await this.pb.collection('fantasy_league').create(leaguePayload);
		console.log('League created with ID:', createdLeague.id);
		
		// Update participant to link to this league
		const updatedParticipant = await this.pb
			.collection('fantasy_season_participants')
			.update(participant.id, {
				league: createdLeague.id
			});
		participant = fantasySeasonParticipantSchema.parse(updatedParticipant);
		console.log('Participant linked to league');
		
		// TODO: Create fantasy_tournament records once permissions are set up
		// For now, skip tournament creation due to permission restrictions
		const fantasyTournaments: FantasyTournament[] = [];
		const fantasyTournamentIds: string[] = [];
		
		console.log(`Skipping fantasy tournament creation (${tournaments.length} tournaments found) - permissions needed`);
		
		// Generate title using league ID: "UserName's League - ABC1"
		const leagueCode = createdLeague.id.slice(-4).toUpperCase();
		const finalTitle = `${userName}'s League - ${leagueCode}`;
		
		// Update league with final title and fantasy_tournaments array
		const updatePayload: any = {
			title: finalTitle
		};
		
		// Only add fantasy_tournaments if we have any
		if (fantasyTournamentIds.length > 0) {
			updatePayload.fantasy_tournaments = fantasyTournamentIds;
		}
		
		const updatedLeague = await this.pb.collection('fantasy_league').update(createdLeague.id, updatePayload);
		
		const league = fantasyLeagueRecordSchema.parse(updatedLeague);

		return { league, participant, tournaments: fantasyTournaments };
	}

	/**
	 * Get league by ID with expanded relations
	 */
	async getLeague(leagueId: string): Promise<FantasyLeague> {
		const record = await this.pb.collection('fantasy_league').getOne(leagueId, {
			expand: 'league_owner,season,participants'
		});
		return fantasyLeagueRecordSchema.parse(record);
	}

	/**
	 * List all leagues for a user (as owner or participant)
	 */
	async listLeaguesForUser(userId: string): Promise<FantasyLeague[]> {
		const list = await this.pb.collection('fantasy_league').getFullList({
			filter: `league_owner = "${userId}" || participants ~ "${userId}"`,
			sort: '-created',
			expand: 'league_owner,season'
		});

		return list.map((record) => fantasyLeagueRecordSchema.parse(record));
	}

	/**
	 * Request to join a league (creates pending participant)
	 */
	async requestToJoin(leagueId: string, userId: string): Promise<FantasySeasonParticipant> {
		console.log('🎯 REQUEST TO JOIN');
		console.log('League ID:', leagueId);
		console.log('User ID:', userId);
		
		// Check if user already has a participant record for this league
		const existing = await this.pb.collection('fantasy_season_participants').getFullList({
			filter: `user = "${userId}" && league = "${leagueId}"`
		});

		if (existing.length > 0) {
			console.log('✅ User already has a participant record');
			return fantasySeasonParticipantSchema.parse(existing[0]);
		}

		// Create new participant record with pending status
		const participantPayload: any = {
			user: userId,
			league: leagueId,
			status: 'pending',
			is_owner: false as boolean,  // Explicitly cast to boolean
			joined_at: new Date().toISOString(),
			total_points: 0
		};

		console.log('📝 Creating participant record in collection: fantasy_season_participants');
		console.log('Payload:', JSON.stringify(participantPayload, null, 2));

		try {
			const created = await this.pb.collection('fantasy_season_participants').create(participantPayload);
			console.log('✅ Participant record created:', created.id);
			return fantasySeasonParticipantSchema.parse(created);
		} catch (error: any) {
			console.error('❌ Error creating participant record in fantasy_season_participants:');
			console.error('Error type:', typeof error);
			console.error('Error message:', error.message);
			console.error('Error status:', error.status);
			
			// Log the detailed validation errors from PocketBase
			if (error.data) {
				console.error('Validation errors:');
				console.error(JSON.stringify(error.data, null, 2));
			}
			
			if (error.response) {
				console.error('Response:');
				console.error(JSON.stringify(error.response, null, 2));
			}
			
			// Log the original error object
			console.error('Original error object:', error);
			
			// Extract specific field errors if available
			if (error.data?.data) {
				console.error('\n🔍 Field-specific errors:');
				Object.keys(error.data.data).forEach(field => {
					console.error(`  ${field}:`, error.data.data[field]);
				});
			}
			
			// Re-throw with more context
			const detailedMessage = error.data?.message || error.message || 'Unknown error';
			throw new Error(`Failed to create participant record: ${detailedMessage}`);
		}
	}

	/**
	 * Approve a participant and check if we should generate tournaments
	 */
	async approveParticipant(
		leagueId: string,
		participantId: string
	): Promise<{ participant: FantasySeasonParticipant; tournamentsGenerated: boolean }> {
		console.log('═══════════════════════════════════════');
		console.log('🎯 APPROVING PARTICIPANT');
		console.log('League ID:', leagueId);
		console.log('Participant ID:', participantId);
		
		// Mark participant as approved
		const updated = await this.pb.collection('fantasy_season_participants').update(participantId, {
			status: 'approved',
			approved_at: new Date().toISOString()
		});
		const participant = fantasySeasonParticipantSchema.parse(updated);
		console.log('✅ Participant approved:', participant.user);

		// Check if we should generate fantasy tournaments
		const league = await this.pb.collection('fantasy_league').getOne(leagueId);
		
		// Default settings if not set
		const defaultSettings: FantasySettings = {
			start_pause_interval: 60,
			rounds: 5,
			check_gender: false,
			min_participants: 6,
			auto_generate_tournaments: true
		};
		
		const settings = (league.settings as FantasySettings) || defaultSettings;
		console.log('League settings:', JSON.stringify(settings, null, 2));

		// IMPORTANT: Re-fetch the participant we just approved to ensure it's in the count
		// There might be a timing issue where the update hasn't propagated yet
		await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure DB consistency
		
		// Count approved participants
		const approvedParticipants = await this.pb.collection('fantasy_season_participants').getFullList({
			filter: `league = "${leagueId}" && status = "approved"`
		});
		
		// Also get all participants to debug
		const allParticipants = await this.pb.collection('fantasy_season_participants').getFullList({
			filter: `league = "${leagueId}"`
		});
		
		console.log(`Total participants in league: ${allParticipants.length}`);
		console.log('Participant statuses:', allParticipants.map(p => ({ user: p.user, status: p.status, is_owner: p.is_owner })));
		console.log(`Approved participants: ${approvedParticipants.length}/${settings.min_participants || 6}`);
		console.log('Approved participant IDs:', approvedParticipants.map(p => p.id));
		console.log('Current fantasy_tournaments:', league.fantasy_tournaments);
		console.log('Auto-generate enabled:', settings.auto_generate_tournaments);

		let tournamentsGenerated = false;

		const minParticipants = settings.min_participants || 6;
		const autoGenerate = settings.auto_generate_tournaments !== false; // Default to true

		// If we've reached minimum and auto-generate is on, create tournaments
		if (approvedParticipants.length >= minParticipants && 
		    autoGenerate &&
		    (!league.fantasy_tournaments || league.fantasy_tournaments.length === 0)) {
			console.log('🚀 TRIGGERING TOURNAMENT GENERATION!');
			console.log(`Minimum participants reached (${approvedParticipants.length}/${minParticipants})`);
			await this.generateFantasyTournaments(leagueId);
			tournamentsGenerated = true;
		} else {
			console.log('❌ NOT generating tournaments:');
			console.log('  - Enough participants?', approvedParticipants.length >= minParticipants);
			console.log('  - Auto-generate on?', autoGenerate);
			console.log('  - No tournaments yet?', !league.fantasy_tournaments || league.fantasy_tournaments.length === 0);
		}
		console.log('═══════════════════════════════════════');

		return { participant, tournamentsGenerated };
	}

	/**
	 * Reject a participant request
	 */
	async rejectParticipant(participantId: string): Promise<void> {
		console.log('❌ REJECTING PARTICIPANT');
		console.log('Participant ID:', participantId);
		
		// Update participant status to rejected
		await this.pb.collection('fantasy_season_participants').update(participantId, {
			status: 'rejected'
		});
		
		console.log('✅ Participant rejected');
	}

	/**
	 * Get all participants for a league
	 */
	async getLeagueParticipants(leagueId: string): Promise<FantasySeasonParticipant[]> {
		const participants: FantasySeasonParticipant[] = [];
		
		try {
			// Try to query by league field (if it exists in DB)
			const records = await this.pb
				.collection('fantasy_season_participants')
				.getFullList({
					filter: `league = "${leagueId}"`,
					expand: 'user'
				});
			
			return records.map(r => fantasySeasonParticipantSchema.parse(r));
		} catch (error: any) {
			// If league field doesn't exist, fall back to using fantasy_participants field
			console.log('League field not available, using fantasy_participants field');
			
			const league = await this.pb.collection('fantasy_league').getOne(leagueId);
			
			if (league.fantasy_participants) {
				try {
					const participant = await this.pb
						.collection('fantasy_season_participants')
						.getOne(league.fantasy_participants, { expand: 'user' });
					participants.push(fantasySeasonParticipantSchema.parse(participant));
				} catch (error) {
					console.error('Error fetching participant:', error);
				}
			}
			
			return participants;
		}
	}

	/**
	 * Check if user is league owner
	 */
	async isLeagueOwner(leagueId: string, userId: string): Promise<boolean> {
		const league = await this.pb.collection('fantasy_league').getOne(leagueId);
		return league.league_owner === userId;
	}

	/**
	 * Get user's participation status in a league
	 */
	async getUserParticipationStatus(
		leagueId: string,
		userId: string
	): Promise<FantasySeasonParticipant | null> {
		try {
			// Check if user has a participant record for this league
			const participants = await this.pb.collection('fantasy_season_participants').getFullList({
				filter: `league = "${leagueId}" && user = "${userId}"`
			});

			if (participants.length > 0) {
				return fantasySeasonParticipantSchema.parse(participants[0]);
			}

			return null;
		} catch (error) {
			console.error('Error getting user participation status:', error);
			return null;
		}
	}

	/**
	 * Get fantasy tournaments for a league
	 */
	async getLeagueTournaments(leagueId: string): Promise<FantasyTournament[]> {
		const list = await this.pb.collection('fantasy_tournament').getFullList({
			filter: `fantasy_league = "${leagueId}"`,
			sort: 'created'
		});

		return list.map((record) => fantasyTournamentSchema.parse(record));
	}

	/**
	 * Generate fantasy tournaments for a league when minimum participants reached
	 */
	async generateFantasyTournaments(leagueId: string): Promise<FantasyTournament[]> {
		const league = await this.pb.collection('fantasy_league').getOne(leagueId);
		const settings = league.settings as FantasySettings;
		
		// Get all approved participants for this league
		const approvedParticipants = await this.pb.collection('fantasy_season_participants').getFullList({
			filter: `league = "${leagueId}" && status = "approved"`
		});

		const approvedUserIds = approvedParticipants.map(p => p.user);
		console.log(`Found ${approvedUserIds.length} approved participants`);
		
		// Check if we have minimum participants
		if (approvedUserIds.length < settings.min_participants) {
			console.log(`Not enough participants: ${approvedUserIds.length}/${settings.min_participants}`);
			return [];
		}

		// Get "next" and "upcoming" tournaments for the season
		console.log('═══════════════════════════════════════');
		console.log('🔍 FETCHING TOURNAMENTS');
		console.log('Season:', league.season);
		console.log('Filter:', `season = "${league.season}" && (status = "next" || status = "upcoming")`);
		
		const tournaments = await this.pb.collection('tournaments').getFullList({
			filter: `season = "${league.season}" && (status = "next" || status = "upcoming")`,
			sort: 'start_date'
		});

		console.log(`Found ${tournaments.length} tournaments (next/upcoming)`);
		if (tournaments.length === 0) {
			console.log('⚠️ WARNING: No tournaments found! Check:');
			console.log('  1. Do tournaments exist in the database?');
			console.log('  2. Do they have season = "' + league.season + '"?');
			console.log('  3. Do they have status = "next" or "upcoming"?');
		} else {
			tournaments.forEach((t, i) => {
				console.log(`  ${i + 1}. ${t.name}`);
				console.log(`     - ID: ${t.id}`);
				console.log(`     - Status: ${t.status}`);
				console.log(`     - Season: ${t.season}`);
				console.log(`     - Full object:`, JSON.stringify(t, null, 2));
			});
		}
		console.log('═══════════════════════════════════════');

		const fantasyTournaments: FantasyTournament[] = [];
		const fantasyTournamentIds: string[] = [];

		for (const tournament of tournaments) {
			try {
				// Randomize draft order for this tournament
				const draftOrder = this.shuffleArray(approvedUserIds);

				const payload: any = {
					fantasy_league: leagueId,
					draft_order: draftOrder,
					draft_results: null
				};

				// Add tournament reference if field exists
				if (tournament.id) {
					payload.tournament = tournament.id;
					console.log('🔗 Adding tournament reference:', tournament.id);
				}

				// Add tournament name if field exists
				if (tournament.name) {
					payload.name = tournament.name;
					console.log('📝 Adding tournament name:', tournament.name);
				}

				console.log('═══════════════════════════════════════');
				console.log(`🎯 Creating fantasy tournament for: ${tournament.name}`);
				console.log('Tournament details:');
				console.log('  - ID:', tournament.id);
				console.log('  - Name:', tournament.name);
				console.log('  - Status:', tournament.status);
				console.log('  - Season:', tournament.season);
				console.log('Payload being sent to PocketBase:');
				console.log(JSON.stringify(payload, null, 2));
				console.log('═══════════════════════════════════════');
				
				const created = await this.pb.collection('fantasy_tournament').create(payload);
				
				console.log('═══════════════════════════════════════');
				console.log('✅ FANTASY TOURNAMENT CREATED:');
				console.log('  - fantasy_tournament ID:', created.id);
				console.log('  - tournament field value:', created.tournament);
				console.log('  - tournament field type:', typeof created.tournament);
				console.log('  - name field value:', created.name);
				console.log('  - fantasy_league field:', created.fantasy_league);
				console.log('  - draft_order length:', created.draft_order?.length);
				console.log('Full created record:');
				console.log(JSON.stringify(created, null, 2));
				console.log('═══════════════════════════════════════');
				
				const parsed = fantasyTournamentSchema.parse(created);
				
				fantasyTournaments.push(parsed);
				fantasyTournamentIds.push(parsed.id);
			} catch (error: any) {
				console.error('═══════════════════════════════════════');
				console.error(`❌ Error creating fantasy tournament for ${tournament.name}`);
				console.error('Error message:', error.message);
				console.error('Error data:', JSON.stringify(error.data));
				console.error('Full error:', error);
				console.error('═══════════════════════════════════════');
			}
		}

		// Update league with fantasy tournament IDs
		const leagueUpdatePayload: any = {
			fantasy_tournaments: fantasyTournamentIds
		};
		// Explicitly don't touch the tournaments field
		
		await this.pb.collection('fantasy_league').update(leagueId, leagueUpdatePayload);

		console.log(`✅ Created ${fantasyTournaments.length} fantasy tournaments linked to real tournaments`);
		return fantasyTournaments;
	}
}
