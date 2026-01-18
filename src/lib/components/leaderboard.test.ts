import { describe, it, expect } from 'vitest';
import { formatScoreToPar, getScoreColorClass, formatPosition, calculatePositions } from '$lib/scoring/scoreUtils';
import { rankParticipantsByPoints } from '$lib/fantasy/fantasyUtils';

describe('Leaderboard Utilities', () => {
	describe('formatScoreToPar', () => {
		it('should format even par as E', () => {
			expect(formatScoreToPar(0)).toBe('E');
		});

		it('should format under par with minus sign', () => {
			expect(formatScoreToPar(-3)).toBe('-3');
			expect(formatScoreToPar(-1)).toBe('-1');
		});

		it('should format over par with plus sign', () => {
			expect(formatScoreToPar(2)).toBe('+2');
			expect(formatScoreToPar(5)).toBe('+5');
		});
	});

	describe('getScoreColorClass', () => {
		it('should return yellow for eagle or better', () => {
			expect(getScoreColorClass(-2)).toBe('text-yellow-300');
			expect(getScoreColorClass(-3)).toBe('text-yellow-300');
		});

		it('should return light yellow for birdie', () => {
			expect(getScoreColorClass(-1)).toBe('text-yellow-200');
		});

		it('should return white for par', () => {
			expect(getScoreColorClass(0)).toBe('text-white');
		});

		it('should return light red for bogey', () => {
			expect(getScoreColorClass(1)).toBe('text-red-200');
		});

		it('should return red for double bogey or worse', () => {
			expect(getScoreColorClass(2)).toBe('text-red-400');
			expect(getScoreColorClass(5)).toBe('text-red-400');
		});
	});

	describe('formatPosition', () => {
		it('should format position without tie', () => {
			expect(formatPosition(1, false)).toBe('1');
			expect(formatPosition(5, false)).toBe('5');
		});

		it('should format position with tie prefix', () => {
			expect(formatPosition(1, true)).toBe('T1');
			expect(formatPosition(3, true)).toBe('T3');
		});
	});

	describe('calculatePositions', () => {
		it('should calculate positions correctly', () => {
			const scores = [
				{ score: -5 },
				{ score: -3 },
				{ score: -3 },
				{ score: 0 },
				{ score: 2 }
			];

			const result = calculatePositions(scores);

			expect(result[0].position).toBe(1);
			expect(result[0].tied).toBe(false);
			expect(result[1].position).toBe(2);
			expect(result[1].tied).toBe(true);
			expect(result[2].position).toBe(2);
			expect(result[2].tied).toBe(true);
			expect(result[3].position).toBe(4);
			expect(result[3].tied).toBe(false);
			expect(result[4].position).toBe(5);
		});

		it('should handle single player', () => {
			const scores = [{ score: -2 }];
			const result = calculatePositions(scores);

			expect(result[0].position).toBe(1);
			expect(result[0].tied).toBe(false);
		});

		it('should handle all tied scores', () => {
			const scores = [
				{ score: 0 },
				{ score: 0 },
				{ score: 0 }
			];

			const result = calculatePositions(scores);

			expect(result[0].position).toBe(1);
			expect(result[0].tied).toBe(true);
			expect(result[1].position).toBe(1);
			expect(result[1].tied).toBe(true);
			expect(result[2].position).toBe(1);
			expect(result[2].tied).toBe(true);
		});
	});

	describe('rankParticipantsByPoints (Fantasy Leaderboard)', () => {
		it('should rank participants by total points descending', () => {
			const participants = [
				{ id: '1', total_points: 50 },
				{ id: '2', total_points: 100 },
				{ id: '3', total_points: 75 }
			];

			const result = rankParticipantsByPoints(participants);

			expect(result[0].id).toBe('2');
			expect(result[0].rank).toBe(1);
			expect(result[1].id).toBe('3');
			expect(result[1].rank).toBe(2);
			expect(result[2].id).toBe('1');
			expect(result[2].rank).toBe(3);
		});

		it('should handle ties in points', () => {
			const participants = [
				{ id: '1', total_points: 50 },
				{ id: '2', total_points: 75 },
				{ id: '3', total_points: 75 }
			];

			const result = rankParticipantsByPoints(participants);

			expect(result[0].rank).toBe(1);
			expect(result[1].rank).toBe(1);
			expect(result[2].rank).toBe(3);
		});

		it('should handle undefined total_points as 0', () => {
			const participants = [
				{ id: '1', total_points: undefined },
				{ id: '2', total_points: 50 }
			];

			const result = rankParticipantsByPoints(participants);

			expect(result[0].id).toBe('2');
			expect(result[0].rank).toBe(1);
			expect(result[1].id).toBe('1');
			expect(result[1].rank).toBe(2);
		});

		it('should handle empty array', () => {
			const result = rankParticipantsByPoints([]);
			expect(result).toEqual([]);
		});
	});
});

describe('Fantasy Score Calculation', () => {
	it('should calculate team score from golfer scores', () => {
		const golferScores = [
			{ golferId: 'g1', score: -3 },
			{ golferId: 'g2', score: -1 },
			{ golferId: 'g3', score: 2 },
			{ golferId: 'g4', score: 0 },
			{ golferId: 'g5', score: -2 }
		];

		const totalScore = golferScores.reduce((sum, g) => sum + g.score, 0);
		expect(totalScore).toBe(-4); // -3 + -1 + 2 + 0 + -2 = -4
	});

	it('should rank teams by total score (lowest is best)', () => {
		const teams = [
			{ name: 'Team A', score: -10 },
			{ name: 'Team B', score: -5 },
			{ name: 'Team C', score: -15 },
			{ name: 'Team D', score: 0 }
		];

		const sorted = [...teams].sort((a, b) => a.score - b.score);

		expect(sorted[0].name).toBe('Team C'); // -15 (best)
		expect(sorted[1].name).toBe('Team A'); // -10
		expect(sorted[2].name).toBe('Team B'); // -5
		expect(sorted[3].name).toBe('Team D'); // 0 (worst)
	});

	it('should handle teams with same score (ties)', () => {
		const teams = [
			{ name: 'Team A', score: -5 },
			{ name: 'Team B', score: -5 },
			{ name: 'Team C', score: -3 }
		];

		const sorted = [...teams].sort((a, b) => a.score - b.score);

		// Assign ranks with tie handling
		let currentRank = 1;
		let previousScore: number | null = null;
		const ranked = sorted.map((team, index) => {
			if (previousScore !== null && team.score > previousScore) {
				currentRank = index + 1;
			}
			previousScore = team.score;
			return { ...team, rank: currentRank };
		});

		expect(ranked[0].rank).toBe(1);
		expect(ranked[1].rank).toBe(1); // Tied with first
		expect(ranked[2].rank).toBe(3); // Skips rank 2
	});
});

describe('Hole Status Formatting', () => {
	it('should show hole number when in progress', () => {
		const formatHoleStatus = (currentHole: number, totalHoles: number = 18): string => {
			if (!currentHole || currentHole <= 0) return '';
			if (currentHole >= totalHoles) return 'F';
			return `${currentHole}`;
		};

		expect(formatHoleStatus(9)).toBe('9');
		expect(formatHoleStatus(1)).toBe('1');
	});

	it('should show F when finished', () => {
		const formatHoleStatus = (currentHole: number, totalHoles: number = 18): string => {
			if (!currentHole || currentHole <= 0) return '';
			if (currentHole >= totalHoles) return 'F';
			return `${currentHole}`;
		};

		expect(formatHoleStatus(18)).toBe('F');
		expect(formatHoleStatus(4, 4)).toBe('F'); // 4-hole test course
	});

	it('should return empty for no hole data', () => {
		const formatHoleStatus = (currentHole: number, totalHoles: number = 18): string => {
			if (!currentHole || currentHole <= 0) return '';
			if (currentHole >= totalHoles) return 'F';
			return `${currentHole}`;
		};

		expect(formatHoleStatus(0)).toBe('');
		expect(formatHoleStatus(-1)).toBe('');
	});
});
