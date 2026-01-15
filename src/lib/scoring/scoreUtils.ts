/**
 * Golf scoring utilities
 */

export interface HoleScore {
	holeId: string;
	par: number;
	score: number; // Relative to par (-2 = eagle, -1 = birdie, 0 = par, +1 = bogey, etc.)
}

export interface GolferRoundScores {
	golferId: string;
	holes: Record<string, number>; // holeId -> score relative to par
}

export interface GolferScoreRecord {
	id: string;
	golfer: string;
	tournament: string;
	score: number; // Total score relative to par
	total_strokes: number;
	current_hole: number;
	position?: number;
	is_cut?: boolean;
}

/**
 * Format a score relative to par for display
 * @param score - Score relative to par (negative = under par, positive = over par)
 * @returns Formatted string (e.g., "E", "+3", "-2")
 */
export function formatScoreToPar(score: number): string {
	if (score === 0) return 'E';
	return score > 0 ? `+${score}` : `${score}`;
}

/**
 * Get CSS color class based on score relative to par
 * @param score - Score relative to par
 * @returns Tailwind CSS class string
 */
export function getScoreColorClass(score: number): string {
	if (score < -1) return 'text-yellow-300'; // Eagle or better
	if (score < 0) return 'text-yellow-200'; // Birdie
	if (score === 0) return 'text-white'; // Par
	if (score === 1) return 'text-red-200'; // Bogey
	return 'text-red-400'; // Double bogey or worse
}

/**
 * Get the name of a score relative to par for a single hole
 * @param scoreRelativeToPar - Score relative to par for one hole
 * @returns Score name (e.g., "Eagle", "Birdie", "Par", "Bogey")
 */
export function getHoleScoreName(scoreRelativeToPar: number): string {
	switch (scoreRelativeToPar) {
		case -3:
			return 'Albatross';
		case -2:
			return 'Eagle';
		case -1:
			return 'Birdie';
		case 0:
			return 'Par';
		case 1:
			return 'Bogey';
		case 2:
			return 'Double Bogey';
		case 3:
			return 'Triple Bogey';
		default:
			if (scoreRelativeToPar < -3) return 'Condor';
			return `+${scoreRelativeToPar}`;
	}
}

/**
 * Calculate total score relative to par from hole scores
 * @param holeScores - Record of holeId to score relative to par
 * @returns Total score relative to par
 */
export function calculateTotalScore(holeScores: Record<string, number>): number {
	return Object.values(holeScores).reduce((sum, score) => sum + (score || 0), 0);
}

/**
 * Calculate total strokes from hole scores and pars
 * @param holeScores - Record of holeId to score relative to par
 * @param holes - Array of holes with id and par
 * @returns Total strokes
 */
export function calculateTotalStrokes(
	holeScores: Record<string, number>,
	holes: Array<{ id: string; par: number }>
): number {
	return holes.reduce((total, hole) => {
		const scoreRelativeToPar = holeScores[hole.id] || 0;
		return total + hole.par + scoreRelativeToPar;
	}, 0);
}

/**
 * Format hole status for display
 * @param currentHole - Current hole number (1-based)
 * @param totalHoles - Total holes in the round (default 18)
 * @returns Status string (e.g., "Thru 9", "F" for finished)
 */
export function formatHoleStatus(currentHole: number, totalHoles: number = 18): string {
	if (!currentHole || currentHole <= 0) return '';
	if (currentHole >= totalHoles) return 'F';
	return `Thru ${currentHole}`;
}

/**
 * Calculate position/ranking from an array of scores
 * Handles ties by assigning the same position (e.g., T1, T2)
 * @param scores - Array of golfer scores
 * @returns Array with position added
 */
export function calculatePositions<T extends { score: number }>(
	scores: T[]
): (T & { position: number; tied: boolean })[] {
	// Sort by score (lowest first)
	const sorted = [...scores].sort((a, b) => a.score - b.score);

	let currentPosition = 1;
	let previousScore: number | null = null;
	let skipCount = 0;

	return sorted.map((score, index) => {
		if (previousScore !== null && score.score === previousScore) {
			// Tied with previous
			skipCount++;
			return { ...score, position: currentPosition, tied: true };
		} else {
			// New position
			currentPosition = index + 1;
			previousScore = score.score;
			const tied = sorted[index + 1]?.score === score.score;
			skipCount = 0;
			return { ...score, position: currentPosition, tied };
		}
	});
}

/**
 * Format position for display
 * @param position - Position number
 * @param tied - Whether tied with others
 * @returns Formatted position (e.g., "1", "T2")
 */
export function formatPosition(position: number, tied: boolean = false): string {
	if (tied) return `T${position}`;
	return `${position}`;
}

/**
 * Validate a hole score is within reasonable bounds
 * @param scoreRelativeToPar - Score relative to par
 * @param par - Par for the hole
 * @returns Whether the score is valid
 */
export function isValidHoleScore(scoreRelativeToPar: number, par: number): boolean {
	const strokes = par + scoreRelativeToPar;
	// Minimum 1 stroke (hole-in-one on par 3+), maximum par + 10
	return strokes >= 1 && strokes <= par + 10;
}

/**
 * Calculate strokes for a single hole
 * @param scoreRelativeToPar - Score relative to par
 * @param par - Par for the hole
 * @returns Number of strokes
 */
export function calculateHoleStrokes(scoreRelativeToPar: number, par: number): number {
	return par + scoreRelativeToPar;
}

/**
 * Determine if a golfer made the cut based on score and cut line
 * @param score - Golfer's score relative to par
 * @param cutLine - Cut line score relative to par
 * @returns Whether the golfer made the cut
 */
export function madeCut(score: number, cutLine: number): boolean {
	return score <= cutLine;
}
