/**
 * Tournament Finalization Service
 * 
 * Handles:
 * 1. Tournament completion detection (all golfers finished all holes)
 * 2. Prize awarding system (update awarded_to, awarded_at on prizes)
 * 3. Season standings update (sum total_points for each participant)
 */

import type PocketBase from 'pocketbase';

export interface GolferScore {
	id: string;
	golfer: string;
	tournament: string;
	score: number;
	total_strokes: number;
	current_hole: number;
	position: number;
	is_cut: boolean;
}

export interface Hole {
	id: string;
	number: number;
	par: number;
	active: boolean;
}

export interface Tournament {
	id: string;
	name: string;
	status: string;
	course?: string;
}

export interface FantasyTournament {
	id: string;
	fantasy_league: string;
	tournament?: string;
	title?: string;
	draft_status?: string;
}

export interface FantasyTeam {
	id: string;
	fantasy_tournament: string;
	user: string;
	golfers: string[];
	total_score: number;
}

export interface FantasyPrize {
	id: string;
	fantasy_tournament: string;
	position: number;
	prize_type: 'points' | 'money' | 'custom';
	prize_value?: number;
	prize_label?: string;
	prize_description?: string;
	awarded_to?: string;
	awarded_at?: string;
}

export interface FantasySeasonParticipant {
	id: string;
	user: string;
	league: string;
	status: string;
	is_owner: boolean;
	total_points?: number;
}

export interface TournamentCompletionResult {
	isComplete: boolean;
	totalGolfers: number;
	completedGolfers: number;
	totalHoles: number;
	reason?: string;
}

export interface PrizeAwardResult {
	success: boolean;
	awardsGiven: Array<{
		position: number;
		userId: string;
		points: number;
		prizeId: string;
	}>;
	errors: string[];
}

export interface StandingsUpdateResult {
	success: boolean;
	updatedParticipants: Array<{
		userId: string;
		totalPoints: number;
	}>;
	errors: string[];
}

export interface FinalizationResult {
	tournamentId: string;
	fantasyTournamentId: string;
	completion: TournamentCompletionResult;
	prizes: PrizeAwardResult;
	standings: StandingsUpdateResult;
	tournamentStatusUpdated: boolean;
}

export interface SeasonPrizeConfig {
	position: number;
	prize_type: 'store_credit' | 'merch' | 'cash' | 'trophy' | 'custom';
	prize_value: number;
	prize_description: string;
}

export interface SeasonFinalizationResult {
	success: boolean;
	season: string;
	leagueId: string;
	results: Array<{
		userId: string;
		finalRank: number;
		totalPoints: number;
		tournamentsPlayed: number;
		tournamentWins: number;
		prizeType?: string;
		prizeValue?: number;
		storeCreditCode?: string;
	}>;
	errors: string[];
}

export class TournamentFinalizationService {
	constructor(private pb: PocketBase) {}

	/**
	 * Check if a tournament is complete (all golfers finished all holes)
	 */
	async checkTournamentCompletion(tournamentId: string): Promise<TournamentCompletionResult> {
		try {
			// Get all active holes for the tournament
			const holes = await this.pb.collection('holes').getFullList<Hole>({
				filter: 'active = true',
				sort: 'number'
			});

			if (holes.length === 0) {
				return {
					isComplete: false,
					totalGolfers: 0,
					completedGolfers: 0,
					totalHoles: 0,
					reason: 'No active holes found'
				};
			}

			const totalHoles = holes.length;

			// Get all golfer scores for this tournament
			const scores = await this.pb.collection('golfer_scores').getFullList<GolferScore>({
				filter: `tournament = "${tournamentId}" && is_cut = false`
			});

			if (scores.length === 0) {
				return {
					isComplete: false,
					totalGolfers: 0,
					completedGolfers: 0,
					totalHoles,
					reason: 'No golfer scores found for tournament'
				};
			}

			const totalGolfers = scores.length;
			const completedGolfers = scores.filter(s => s.current_hole >= totalHoles).length;

			return {
				isComplete: completedGolfers === totalGolfers && totalGolfers > 0,
				totalGolfers,
				completedGolfers,
				totalHoles,
				reason: completedGolfers === totalGolfers 
					? 'All golfers have completed all holes'
					: `${completedGolfers}/${totalGolfers} golfers completed`
			};
		} catch (error: any) {
			return {
				isComplete: false,
				totalGolfers: 0,
				completedGolfers: 0,
				totalHoles: 0,
				reason: `Error checking completion: ${error.message}`
			};
		}
	}

	/**
	 * Calculate fantasy team rankings for a tournament
	 */
	async calculateFantasyRankings(fantasyTournamentId: string): Promise<Array<{
		team: FantasyTeam;
		calculatedScore: number;
		rank: number;
		userId: string;
	}>> {
		// Get all fantasy teams for this tournament
		const teams = await this.pb.collection('fantasy_team').getFullList<FantasyTeam>({
			filter: `fantasy_tournament = "${fantasyTournamentId}"`
		});

		if (teams.length === 0) {
			return [];
		}

		// Get all golfer IDs
		const allGolferIds = [...new Set(teams.flatMap(t => t.golfers || []))];

		// Get current scores for all golfers
		let golferScores: GolferScore[] = [];
		if (allGolferIds.length > 0) {
			golferScores = await this.pb.collection('golfer_scores').getFullList<GolferScore>({
				filter: allGolferIds.map(id => `golfer = "${id}"`).join(' || ')
			});
		}

		// Create score lookup
		const scoreMap = new Map(golferScores.map(s => [s.golfer, s.score]));

		// Calculate scores for each team
		const teamsWithScores = teams.map(team => {
			const calculatedScore = (team.golfers || []).reduce((sum, golferId) => {
				return sum + (scoreMap.get(golferId) || 0);
			}, 0);

			return {
				team,
				calculatedScore,
				rank: 0,
				userId: team.user
			};
		});

		// Sort by score (lowest is best in golf)
		teamsWithScores.sort((a, b) => a.calculatedScore - b.calculatedScore);

		// Assign ranks with tie handling
		let currentRank = 1;
		let previousScore: number | null = null;
		teamsWithScores.forEach((team, index) => {
			if (previousScore !== null && team.calculatedScore > previousScore) {
				currentRank = index + 1;
			}
			team.rank = currentRank;
			previousScore = team.calculatedScore;
		});

		return teamsWithScores;
	}

	/**
	 * Award prizes to top fantasy teams
	 */
	async awardPrizes(fantasyTournamentId: string): Promise<PrizeAwardResult> {
		const result: PrizeAwardResult = {
			success: true,
			awardsGiven: [],
			errors: []
		};

		try {
			// Get prizes for this tournament
			const prizes = await this.pb.collection('fantasy_prize').getFullList<FantasyPrize>({
				filter: `fantasy_tournament = "${fantasyTournamentId}"`,
				sort: 'position'
			});

			if (prizes.length === 0) {
				result.errors.push('No prizes defined for this tournament');
				return result;
			}

			// Get rankings
			const rankings = await this.calculateFantasyRankings(fantasyTournamentId);

			if (rankings.length === 0) {
				result.errors.push('No fantasy teams found for this tournament');
				return result;
			}

			// Award prizes based on rank
			const now = new Date().toISOString();

			for (const prize of prizes) {
				// Find team(s) at this position
				const winnersAtPosition = rankings.filter(r => r.rank === prize.position);

				if (winnersAtPosition.length === 0) {
					result.errors.push(`No team found at position ${prize.position}`);
					continue;
				}

				// Award to first team at this position (in case of ties, first alphabetically or by ID)
				const winner = winnersAtPosition[0];

				// Skip if already awarded
				if (prize.awarded_to) {
					result.errors.push(`Prize for position ${prize.position} already awarded to ${prize.awarded_to}`);
					continue;
				}

				// Update the prize record
				await this.pb.collection('fantasy_prize').update(prize.id, {
					awarded_to: winner.userId,
					awarded_at: now
				});

				// Update the fantasy team's total_score
				await this.pb.collection('fantasy_team').update(winner.team.id, {
					total_score: winner.calculatedScore
				});

				result.awardsGiven.push({
					position: prize.position,
					userId: winner.userId,
					points: prize.prize_value || 0,
					prizeId: prize.id
				});
			}

			return result;
		} catch (error: any) {
			result.success = false;
			result.errors.push(`Error awarding prizes: ${error.message}`);
			return result;
		}
	}

	/**
	 * Update season standings (total points for each participant)
	 */
	async updateSeasonStandings(fantasyLeagueId: string): Promise<StandingsUpdateResult> {
		const result: StandingsUpdateResult = {
			success: true,
			updatedParticipants: [],
			errors: []
		};

		try {
			// Get all fantasy tournaments for this league
			const tournaments = await this.pb.collection('fantasy_tournament').getFullList<FantasyTournament>({
				filter: `fantasy_league = "${fantasyLeagueId}"`
			});

			const tournamentIds = tournaments.map(t => t.id);

			if (tournamentIds.length === 0) {
				result.errors.push('No tournaments found for this league');
				return result;
			}

			// Get all awarded prizes for these tournaments
			const allPrizes = await this.pb.collection('fantasy_prize').getFullList<FantasyPrize>({
				filter: tournamentIds.map(id => `fantasy_tournament = "${id}"`).join(' || ')
			});

			// Calculate total points per user
			const userPoints = new Map<string, number>();

			for (const prize of allPrizes) {
				if (prize.awarded_to && prize.prize_value) {
					const current = userPoints.get(prize.awarded_to) || 0;
					userPoints.set(prize.awarded_to, current + prize.prize_value);
				}
			}

			// Get participants for this league
			let participants: FantasySeasonParticipant[] = [];
			try {
				participants = await this.pb.collection('fantasy_season_participants').getFullList<FantasySeasonParticipant>({
					filter: `league = "${fantasyLeagueId}"`
				});
			} catch (err: any) {
				// Collection might not exist or be empty
				if (err.status !== 404) {
					result.errors.push(`Could not fetch participants: ${err.message}`);
				}
			}

			// Update each participant's total points
			for (const participant of participants) {
				const totalPoints = userPoints.get(participant.user) || 0;

				try {
					await this.pb.collection('fantasy_season_participants').update(participant.id, {
						total_points: totalPoints
					});

					result.updatedParticipants.push({
						userId: participant.user,
						totalPoints
					});
				} catch (err: any) {
					result.errors.push(`Failed to update participant ${participant.user}: ${err.message}`);
				}
			}

			// If no participants collection, log the calculated points
			if (participants.length === 0 && userPoints.size > 0) {
				result.errors.push('No participants found in fantasy_season_participants collection');
				// Still report what would have been updated
				for (const [userId, points] of userPoints) {
					result.updatedParticipants.push({ userId, totalPoints: points });
				}
			}

			return result;
		} catch (error: any) {
			result.success = false;
			result.errors.push(`Error updating standings: ${error.message}`);
			return result;
		}
	}

	/**
	 * Update tournament status to completed
	 */
	async markTournamentCompleted(tournamentId: string): Promise<boolean> {
		try {
			await this.pb.collection('tournaments').update(tournamentId, {
				status: 'completed'
			});
			return true;
		} catch (error: any) {
			console.error('Failed to update tournament status:', error);
			return false;
		}
	}

	/**
	 * Generate a unique store credit code
	 */
	private generateStoreCreditCode(prefix: string = 'FLI'): string {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		let code = prefix + '-';
		for (let i = 0; i < 8; i++) {
			code += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return code;
	}

	/**
	 * Finalize a season - archive results and award prizes
	 */
	async finalizeSeason(
		leagueId: string,
		season: string,
		prizeConfig: SeasonPrizeConfig[]
	): Promise<SeasonFinalizationResult> {
		const result: SeasonFinalizationResult = {
			success: true,
			season,
			leagueId,
			results: [],
			errors: []
		};

		try {
			// Get all participants for this league
			const participants = await this.pb.collection('fantasy_season_participants').getFullList<FantasySeasonParticipant>({
				filter: `league = "${leagueId}"`,
				sort: '-total_points'
			});

			if (participants.length === 0) {
				result.errors.push('No participants found for this league');
				result.success = false;
				return result;
			}

			// Get all fantasy tournaments for this league to calculate stats
			const fantasyTournaments = await this.pb.collection('fantasy_tournament').getFullList<FantasyTournament>({
				filter: `fantasy_league = "${leagueId}"`
			});

			const tournamentIds = fantasyTournaments.map(t => t.id);

			// Get all prizes to count wins per user
			let allPrizes: FantasyPrize[] = [];
			if (tournamentIds.length > 0) {
				allPrizes = await this.pb.collection('fantasy_prize').getFullList<FantasyPrize>({
					filter: tournamentIds.map(id => `fantasy_tournament = "${id}"`).join(' || ')
				});
			}

			// Count tournament wins (1st place finishes) per user
			const userWins = new Map<string, number>();
			const userTournamentsPlayed = new Map<string, number>();

			for (const prize of allPrizes) {
				if (prize.awarded_to && prize.position === 1) {
					userWins.set(prize.awarded_to, (userWins.get(prize.awarded_to) || 0) + 1);
				}
				if (prize.awarded_to) {
					userTournamentsPlayed.set(prize.awarded_to, (userTournamentsPlayed.get(prize.awarded_to) || 0) + 1);
				}
			}

			// Calculate final rankings with tie handling
			let currentRank = 1;
			let previousPoints: number | null = null;
			const now = new Date().toISOString();

			for (let i = 0; i < participants.length; i++) {
				const participant = participants[i];
				const points = participant.total_points || 0;

				// Handle ties
				if (previousPoints !== null && points < previousPoints) {
					currentRank = i + 1;
				}
				previousPoints = points;

				// Find prize for this rank
				const prizeForRank = prizeConfig.find(p => p.position === currentRank);

				// Generate store credit code if applicable
				let storeCreditCode: string | undefined;
				if (prizeForRank?.prize_type === 'store_credit') {
					storeCreditCode = this.generateStoreCreditCode(`FLI${season.slice(-2)}`);
				}

				// Build tournament results history
				const tournamentResults = allPrizes
					.filter(p => p.awarded_to === participant.user)
					.map(p => ({
						tournamentId: p.fantasy_tournament,
						position: p.position,
						points: p.prize_value || 0
					}));

				// Create the season result record
				try {
					await this.pb.collection('fantasy_season_results').create({
						league: leagueId,
						season,
						user: participant.user,
						final_rank: currentRank,
						total_points: points,
						tournaments_played: userTournamentsPlayed.get(participant.user) || 0,
						tournament_wins: userWins.get(participant.user) || 0,
						prize_type: prizeForRank?.prize_type || null,
						prize_value: prizeForRank?.prize_value || null,
						prize_description: prizeForRank?.prize_description || null,
						prize_claimed: false,
						store_credit_code: storeCreditCode || null,
						tournament_results: tournamentResults,
						finalized_at: now
					});

					result.results.push({
						userId: participant.user,
						finalRank: currentRank,
						totalPoints: points,
						tournamentsPlayed: userTournamentsPlayed.get(participant.user) || 0,
						tournamentWins: userWins.get(participant.user) || 0,
						prizeType: prizeForRank?.prize_type,
						prizeValue: prizeForRank?.prize_value,
						storeCreditCode
					});
				} catch (err: any) {
					result.errors.push(`Failed to create result for user ${participant.user}: ${err.message}`);
				}
			}

			return result;
		} catch (error: any) {
			result.success = false;
			result.errors.push(`Error finalizing season: ${error.message}`);
			return result;
		}
	}

	/**
	 * Full tournament finalization process
	 */
	async finalizeTournament(
		tournamentId: string,
		fantasyTournamentId: string,
		fantasyLeagueId: string,
		options: { force?: boolean } = {}
	): Promise<FinalizationResult> {
		const result: FinalizationResult = {
			tournamentId,
			fantasyTournamentId,
			completion: {
				isComplete: false,
				totalGolfers: 0,
				completedGolfers: 0,
				totalHoles: 0
			},
			prizes: {
				success: false,
				awardsGiven: [],
				errors: []
			},
			standings: {
				success: false,
				updatedParticipants: [],
				errors: []
			},
			tournamentStatusUpdated: false
		};

		// Step 1: Check completion
		result.completion = await this.checkTournamentCompletion(tournamentId);

		if (!result.completion.isComplete && !options.force) {
			result.completion.reason = `Tournament not complete. ${result.completion.reason}. Use force=true to finalize anyway.`;
			return result;
		}

		// Step 2: Award prizes
		result.prizes = await this.awardPrizes(fantasyTournamentId);

		// Step 3: Update season standings
		result.standings = await this.updateSeasonStandings(fantasyLeagueId);

		// Step 4: Mark tournament as completed
		result.tournamentStatusUpdated = await this.markTournamentCompleted(tournamentId);

		return result;
	}
}
