import { describe, it, expect } from 'vitest';
import {
	formatScoreToPar,
	getScoreColorClass,
	getHoleScoreName,
	calculateTotalScore,
	calculateTotalStrokes,
	formatHoleStatus,
	calculatePositions,
	formatPosition,
	isValidHoleScore,
	calculateHoleStrokes,
	madeCut
} from './scoreUtils';

describe('Score Utilities', () => {
	describe('formatScoreToPar', () => {
		it('should format even par as "E"', () => {
			expect(formatScoreToPar(0)).toBe('E');
		});

		it('should format positive scores with plus sign', () => {
			expect(formatScoreToPar(1)).toBe('+1');
			expect(formatScoreToPar(5)).toBe('+5');
			expect(formatScoreToPar(10)).toBe('+10');
		});

		it('should format negative scores with minus sign', () => {
			expect(formatScoreToPar(-1)).toBe('-1');
			expect(formatScoreToPar(-5)).toBe('-5');
			expect(formatScoreToPar(-10)).toBe('-10');
		});
	});

	describe('getScoreColorClass', () => {
		it('should return yellow-300 for eagle or better', () => {
			expect(getScoreColorClass(-2)).toBe('text-yellow-300');
			expect(getScoreColorClass(-3)).toBe('text-yellow-300');
			expect(getScoreColorClass(-10)).toBe('text-yellow-300');
		});

		it('should return yellow-200 for birdie', () => {
			expect(getScoreColorClass(-1)).toBe('text-yellow-200');
		});

		it('should return white for par', () => {
			expect(getScoreColorClass(0)).toBe('text-white');
		});

		it('should return red-200 for bogey', () => {
			expect(getScoreColorClass(1)).toBe('text-red-200');
		});

		it('should return red-400 for double bogey or worse', () => {
			expect(getScoreColorClass(2)).toBe('text-red-400');
			expect(getScoreColorClass(5)).toBe('text-red-400');
			expect(getScoreColorClass(10)).toBe('text-red-400');
		});
	});

	describe('getHoleScoreName', () => {
		it('should return correct names for common scores', () => {
			expect(getHoleScoreName(-3)).toBe('Albatross');
			expect(getHoleScoreName(-2)).toBe('Eagle');
			expect(getHoleScoreName(-1)).toBe('Birdie');
			expect(getHoleScoreName(0)).toBe('Par');
			expect(getHoleScoreName(1)).toBe('Bogey');
			expect(getHoleScoreName(2)).toBe('Double Bogey');
			expect(getHoleScoreName(3)).toBe('Triple Bogey');
		});

		it('should return "Condor" for -4 or better', () => {
			expect(getHoleScoreName(-4)).toBe('Condor');
			expect(getHoleScoreName(-5)).toBe('Condor');
		});

		it('should return numeric format for +4 or worse', () => {
			expect(getHoleScoreName(4)).toBe('+4');
			expect(getHoleScoreName(7)).toBe('+7');
		});
	});

	describe('calculateTotalScore', () => {
		it('should sum all hole scores', () => {
			const holeScores = {
				hole1: -1, // birdie
				hole2: 0, // par
				hole3: 1, // bogey
				hole4: -2 // eagle
			};
			expect(calculateTotalScore(holeScores)).toBe(-2);
		});

		it('should return 0 for empty scores', () => {
			expect(calculateTotalScore({})).toBe(0);
		});

		it('should handle all positive scores', () => {
			const holeScores = {
				hole1: 1,
				hole2: 2,
				hole3: 1
			};
			expect(calculateTotalScore(holeScores)).toBe(4);
		});

		it('should handle all negative scores', () => {
			const holeScores = {
				hole1: -1,
				hole2: -2,
				hole3: -1
			};
			expect(calculateTotalScore(holeScores)).toBe(-4);
		});

		it('should treat undefined/null as 0', () => {
			const holeScores: Record<string, number> = {
				hole1: 1,
				hole2: 0
			};
			expect(calculateTotalScore(holeScores)).toBe(1);
		});
	});

	describe('calculateTotalStrokes', () => {
		it('should calculate total strokes from pars and scores', () => {
			const holes = [
				{ id: 'hole1', par: 4 },
				{ id: 'hole2', par: 3 },
				{ id: 'hole3', par: 5 }
			];
			const holeScores = {
				hole1: 0, // par = 4 strokes
				hole2: -1, // birdie = 2 strokes
				hole3: 1 // bogey = 6 strokes
			};
			// Total: 4 + 2 + 6 = 12 strokes
			expect(calculateTotalStrokes(holeScores, holes)).toBe(12);
		});

		it('should return sum of pars for even par round', () => {
			const holes = [
				{ id: 'hole1', par: 4 },
				{ id: 'hole2', par: 4 },
				{ id: 'hole3', par: 4 }
			];
			const holeScores = {
				hole1: 0,
				hole2: 0,
				hole3: 0
			};
			expect(calculateTotalStrokes(holeScores, holes)).toBe(12);
		});

		it('should handle missing hole scores as par', () => {
			const holes = [
				{ id: 'hole1', par: 4 },
				{ id: 'hole2', par: 3 }
			];
			const holeScores = {
				hole1: 1 // only hole1 has a score
			};
			// hole1: 4 + 1 = 5, hole2: 3 + 0 = 3
			expect(calculateTotalStrokes(holeScores, holes)).toBe(8);
		});

		it('should calculate correct strokes for full 18-hole round', () => {
			// Par 72 course (4 par-3s, 10 par-4s, 4 par-5s)
			const holes = [
				{ id: 'h1', par: 4 },
				{ id: 'h2', par: 4 },
				{ id: 'h3', par: 3 },
				{ id: 'h4', par: 5 },
				{ id: 'h5', par: 4 },
				{ id: 'h6', par: 4 },
				{ id: 'h7', par: 3 },
				{ id: 'h8', par: 5 },
				{ id: 'h9', par: 4 },
				{ id: 'h10', par: 4 },
				{ id: 'h11', par: 4 },
				{ id: 'h12', par: 3 },
				{ id: 'h13', par: 5 },
				{ id: 'h14', par: 4 },
				{ id: 'h15', par: 4 },
				{ id: 'h16', par: 3 },
				{ id: 'h17', par: 5 },
				{ id: 'h18', par: 4 }
			];

			// All pars = 72 strokes
			const parScores: Record<string, number> = {};
			holes.forEach((h) => (parScores[h.id] = 0));
			expect(calculateTotalStrokes(parScores, holes)).toBe(72);

			// 4 under par = 68 strokes
			const underParScores: Record<string, number> = {};
			holes.forEach((h, i) => (underParScores[h.id] = i < 4 ? -1 : 0));
			expect(calculateTotalStrokes(underParScores, holes)).toBe(68);
		});
	});

	describe('formatHoleStatus', () => {
		it('should return empty string for 0 or negative hole', () => {
			expect(formatHoleStatus(0)).toBe('');
			expect(formatHoleStatus(-1)).toBe('');
		});

		it('should return "Thru X" for holes in progress', () => {
			expect(formatHoleStatus(1)).toBe('Thru 1');
			expect(formatHoleStatus(9)).toBe('Thru 9');
			expect(formatHoleStatus(17)).toBe('Thru 17');
		});

		it('should return "F" for finished round (18 holes)', () => {
			expect(formatHoleStatus(18)).toBe('F');
			expect(formatHoleStatus(19)).toBe('F'); // Edge case
		});

		it('should handle custom total holes (9-hole round)', () => {
			expect(formatHoleStatus(8, 9)).toBe('Thru 8');
			expect(formatHoleStatus(9, 9)).toBe('F');
		});
	});

	describe('calculatePositions', () => {
		it('should assign positions based on score (lowest first)', () => {
			const scores = [
				{ id: 'a', score: 2 },
				{ id: 'b', score: -1 },
				{ id: 'c', score: 0 }
			];
			const result = calculatePositions(scores);

			expect(result[0].id).toBe('b');
			expect(result[0].position).toBe(1);
			expect(result[1].id).toBe('c');
			expect(result[1].position).toBe(2);
			expect(result[2].id).toBe('a');
			expect(result[2].position).toBe(3);
		});

		it('should handle ties correctly', () => {
			const scores = [
				{ id: 'a', score: 0 },
				{ id: 'b', score: -2 },
				{ id: 'c', score: 0 },
				{ id: 'd', score: 1 }
			];
			const result = calculatePositions(scores);

			// b is 1st at -2
			expect(result[0].id).toBe('b');
			expect(result[0].position).toBe(1);
			expect(result[0].tied).toBe(false);

			// a and c are tied for 2nd at E
			const tiedPlayers = result.filter((r) => r.score === 0);
			expect(tiedPlayers).toHaveLength(2);
			expect(tiedPlayers[0].position).toBe(2);
			expect(tiedPlayers[1].position).toBe(2);
			expect(tiedPlayers[0].tied).toBe(true);
			expect(tiedPlayers[1].tied).toBe(true);

			// d is 4th at +1
			expect(result[3].id).toBe('d');
			expect(result[3].position).toBe(4);
		});

		it('should handle all tied scores', () => {
			const scores = [
				{ id: 'a', score: 0 },
				{ id: 'b', score: 0 },
				{ id: 'c', score: 0 }
			];
			const result = calculatePositions(scores);

			result.forEach((r) => {
				expect(r.position).toBe(1);
				expect(r.tied).toBe(true);
			});
		});

		it('should handle empty array', () => {
			expect(calculatePositions([])).toEqual([]);
		});

		it('should handle single player', () => {
			const scores = [{ id: 'a', score: -3 }];
			const result = calculatePositions(scores);

			expect(result[0].position).toBe(1);
			expect(result[0].tied).toBe(false);
		});
	});

	describe('formatPosition', () => {
		it('should format non-tied positions without prefix', () => {
			expect(formatPosition(1)).toBe('1');
			expect(formatPosition(5)).toBe('5');
			expect(formatPosition(100)).toBe('100');
		});

		it('should format tied positions with T prefix', () => {
			expect(formatPosition(1, true)).toBe('T1');
			expect(formatPosition(5, true)).toBe('T5');
			expect(formatPosition(100, true)).toBe('T100');
		});
	});

	describe('isValidHoleScore', () => {
		it('should accept valid scores', () => {
			// Par 4: valid strokes 1-14
			expect(isValidHoleScore(0, 4)).toBe(true); // 4 strokes
			expect(isValidHoleScore(-3, 4)).toBe(true); // 1 stroke (hole-in-one)
			expect(isValidHoleScore(5, 4)).toBe(true); // 9 strokes
			expect(isValidHoleScore(10, 4)).toBe(true); // 14 strokes (max)
		});

		it('should reject impossible scores', () => {
			// Par 4: can't have 0 or negative strokes
			expect(isValidHoleScore(-4, 4)).toBe(false); // 0 strokes
			expect(isValidHoleScore(-5, 4)).toBe(false); // -1 strokes

			// Par 3: can't have 0 or negative strokes
			expect(isValidHoleScore(-3, 3)).toBe(false); // 0 strokes
		});

		it('should reject scores over par + 10', () => {
			expect(isValidHoleScore(11, 4)).toBe(false); // 15 strokes
			expect(isValidHoleScore(12, 3)).toBe(false); // 15 strokes
		});

		it('should accept hole-in-one on par 3', () => {
			expect(isValidHoleScore(-2, 3)).toBe(true); // 1 stroke
		});
	});

	describe('calculateHoleStrokes', () => {
		it('should calculate strokes from par and score', () => {
			expect(calculateHoleStrokes(0, 4)).toBe(4); // par
			expect(calculateHoleStrokes(-1, 4)).toBe(3); // birdie
			expect(calculateHoleStrokes(1, 4)).toBe(5); // bogey
			expect(calculateHoleStrokes(-2, 5)).toBe(3); // eagle on par 5
		});
	});

	describe('madeCut', () => {
		it('should return true when score is at or below cut line', () => {
			expect(madeCut(0, 2)).toBe(true); // E makes +2 cut
			expect(madeCut(-5, 0)).toBe(true); // -5 makes E cut
			expect(madeCut(2, 2)).toBe(true); // +2 makes +2 cut (exactly)
		});

		it('should return false when score is above cut line', () => {
			expect(madeCut(3, 2)).toBe(false); // +3 misses +2 cut
			expect(madeCut(1, 0)).toBe(false); // +1 misses E cut
			expect(madeCut(0, -1)).toBe(false); // E misses -1 cut
		});
	});
});
