/**
 * Fantasy league utilities
 */

export type ParticipantStatus = 'pending' | 'approved' | 'rejected';

export interface FantasyParticipant {
	id: string;
	user: string;
	league?: string;
	status: ParticipantStatus;
	is_owner: boolean;
	joined_at: string;
	approved_at?: string;
	total_points?: number;
}

export interface FantasyLeagueSettings {
	start_pause_interval: number; // seconds between picks
	rounds: number; // number of draft rounds
	check_gender: boolean; // whether to enforce gender balance
	min_participants: number; // minimum to start
	auto_generate_tournaments: boolean;
}

export const DEFAULT_FANTASY_SETTINGS: FantasyLeagueSettings = {
	start_pause_interval: 60,
	rounds: 5,
	check_gender: false,
	min_participants: 6,
	auto_generate_tournaments: true
};

/**
 * Generate a league code from league ID
 * @param leagueId - The full league ID
 * @returns 4-character uppercase code
 */
export function generateLeagueCode(leagueId: string): string {
	return leagueId.slice(-4).toUpperCase();
}

/**
 * Generate league title from username and league ID
 * @param userName - The owner's display name
 * @param leagueId - The league ID
 * @returns Formatted title (e.g., "John's League - ABC1")
 */
export function generateLeagueTitle(userName: string, leagueId: string): string {
	const code = generateLeagueCode(leagueId);
	return `${userName}'s League - ${code}`;
}

/**
 * Check if a league has enough participants to start
 * @param approvedCount - Number of approved participants
 * @param minParticipants - Minimum required participants
 * @returns Whether the league can start
 */
export function hasMinimumParticipants(
	approvedCount: number,
	minParticipants: number = DEFAULT_FANTASY_SETTINGS.min_participants
): boolean {
	return approvedCount >= minParticipants;
}

/**
 * Filter participants by status
 * @param participants - Array of participants
 * @param status - Status to filter by
 * @returns Filtered participants
 */
export function filterParticipantsByStatus(
	participants: FantasyParticipant[],
	status: ParticipantStatus
): FantasyParticipant[] {
	return participants.filter((p) => p.status === status);
}

/**
 * Get approved participants from a list
 * @param participants - Array of participants
 * @returns Approved participants only
 */
export function getApprovedParticipants(
	participants: FantasyParticipant[]
): FantasyParticipant[] {
	return filterParticipantsByStatus(participants, 'approved');
}

/**
 * Get pending participants from a list
 * @param participants - Array of participants
 * @returns Pending participants only
 */
export function getPendingParticipants(
	participants: FantasyParticipant[]
): FantasyParticipant[] {
	return filterParticipantsByStatus(participants, 'pending');
}

/**
 * Check if user is the league owner
 * @param participants - Array of participants
 * @param userId - User ID to check
 * @returns Whether the user is the owner
 */
export function isLeagueOwner(
	participants: FantasyParticipant[],
	userId: string
): boolean {
	return participants.some((p) => p.user === userId && p.is_owner);
}

/**
 * Get user's participation status in a league
 * @param participants - Array of participants
 * @param userId - User ID to check
 * @returns The participant record or null
 */
export function getUserParticipation(
	participants: FantasyParticipant[],
	userId: string
): FantasyParticipant | null {
	return participants.find((p) => p.user === userId) || null;
}

/**
 * Check if user can join a league
 * @param participants - Array of participants
 * @param userId - User ID to check
 * @returns Whether the user can request to join
 */
export function canUserJoinLeague(
	participants: FantasyParticipant[],
	userId: string
): boolean {
	const existing = getUserParticipation(participants, userId);
	// Can join if no existing participation or if previously rejected
	return !existing || existing.status === 'rejected';
}

/**
 * Calculate total points for a participant across tournaments
 * @param tournamentPoints - Array of points from each tournament
 * @returns Total points
 */
export function calculateTotalPoints(tournamentPoints: number[]): number {
	return tournamentPoints.reduce((sum, points) => sum + points, 0);
}

/**
 * Rank participants by total points
 * @param participants - Array of participants with total_points
 * @returns Sorted array with rank added
 */
export function rankParticipantsByPoints<T extends { total_points?: number }>(
	participants: T[]
): (T & { rank: number })[] {
	const sorted = [...participants].sort(
		(a, b) => (b.total_points || 0) - (a.total_points || 0)
	);

	let currentRank = 1;
	let previousPoints: number | null = null;

	return sorted.map((p, index) => {
		const points = p.total_points || 0;
		if (previousPoints !== null && points < previousPoints) {
			currentRank = index + 1;
		}
		previousPoints = points;
		return { ...p, rank: currentRank };
	});
}

/**
 * Validate fantasy league settings
 * @param settings - Settings to validate
 * @returns Validation result with errors
 */
export function validateFantasySettings(
	settings: Partial<FantasyLeagueSettings>
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (settings.start_pause_interval !== undefined) {
		if (settings.start_pause_interval < 30 || settings.start_pause_interval > 300) {
			errors.push('Pick interval must be between 30 and 300 seconds');
		}
	}

	if (settings.rounds !== undefined) {
		if (settings.rounds < 1 || settings.rounds > 10) {
			errors.push('Rounds must be between 1 and 10');
		}
	}

	if (settings.min_participants !== undefined) {
		if (settings.min_participants < 2 || settings.min_participants > 100) {
			errors.push('Minimum participants must be between 2 and 100');
		}
	}

	return { valid: errors.length === 0, errors };
}
