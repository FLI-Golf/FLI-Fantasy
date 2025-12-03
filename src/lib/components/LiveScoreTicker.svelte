<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { pb } from '$lib/pocketbase';

	interface GolferScore {
		id: string;
		score: number;
		total_strokes: number;
		position: number;
		is_cut: boolean;
		expand?: {
			golfer?: {
				id: string;
				name: string;
				country: string;
			};
			tournament_rounds?: {
				id: string;
				round_number: number;
			};
		};
	}

	let scores: GolferScore[] = [];
	let loading = true;
	let error: string | null = null;
	let unsubscribe: (() => void) | null = null;

	// Format score to par display
	function formatScoreToPar(score: number): string {
		if (score === 0) return 'E';
		return score > 0 ? `+${score}` : `${score}`;
	}

	// Get color class based on score
	function getScoreColor(score: number): string {
		if (score < -2) return 'text-red-600 font-bold'; // Eagle or better
		if (score < 0) return 'text-red-500'; // Birdie
		if (score === 0) return 'text-white'; // Par
		return 'text-blue-400'; // Bogey or worse
	}

	async function loadScores() {
		try {
			loading = true;
			error = null;

			const records = await pb.collection('golfer_scores').getFullList<GolferScore>({
				sort: 'score,position',
				expand: 'golfer,tournament_rounds',
				filter: 'is_cut = false'
			});

			scores = records;
		} catch (err: any) {
			console.error('Error loading live scores:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await loadScores();

		// Subscribe to real-time updates
		try {
			unsubscribe = await pb.collection('golfer_scores').subscribe('*', async (e) => {
				// Reload all scores to get updated expand data
				await loadScores();
			});
		} catch (err) {
			console.error('Error subscribing to live scores:', err);
		}

		// Refresh scores every 30 seconds as fallback
		const interval = setInterval(loadScores, 30000);

		return () => {
			clearInterval(interval);
		};
	});

	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});
</script>

<div class="live-score-ticker bg-gradient-to-r from-green-800 to-green-900 text-white py-3 overflow-hidden">
	<div class="container mx-auto px-4">
		{#if loading && scores.length === 0}
			<div class="flex items-center justify-center">
				<div class="animate-pulse">Loading live scores...</div>
			</div>
		{:else if error}
			<div class="text-center text-red-300">
				<span class="text-sm">Unable to load live scores</span>
			</div>
		{:else if scores.length === 0}
			<div class="text-center text-gray-300">
				<span class="text-sm">No live scores available</span>
			</div>
		{:else}
			<div class="ticker-wrapper">
				<div class="ticker-content">
					{#each scores as score}
						{#if score.expand?.golfer}
							<div class="ticker-item inline-flex items-center mx-6">
								<span class="font-semibold">{score.expand.golfer.name}</span>
								{#if score.expand.golfer.country}
									<span class="mx-1 text-xs text-gray-300">({score.expand.golfer.country})</span>
								{/if}
								<span class="mx-2">•</span>
								<span class={getScoreColor(score.score)}>
									{formatScoreToPar(score.score)}
								</span>
								<span class="mx-2 text-gray-300 text-sm">
									{#if score.position}
										T{score.position}
									{/if}
								</span>
							</div>
						{/if}
					{/each}
					<!-- Duplicate for seamless loop -->
					{#each scores as score}
						{#if score.expand?.golfer}
							<div class="ticker-item inline-flex items-center mx-6">
								<span class="font-semibold">{score.expand.golfer.name}</span>
								{#if score.expand.golfer.country}
									<span class="mx-1 text-xs text-gray-300">({score.expand.golfer.country})</span>
								{/if}
								<span class="mx-2">•</span>
								<span class={getScoreColor(score.score)}>
									{formatScoreToPar(score.score)}
								</span>
								<span class="mx-2 text-gray-300 text-sm">
									{#if score.position}
										T{score.position}
									{/if}
								</span>
							</div>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.ticker-wrapper {
		overflow: hidden;
		white-space: nowrap;
	}

	.ticker-content {
		display: inline-block;
		animation: scroll 60s linear infinite;
	}

	@keyframes scroll {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}

	.ticker-content:hover {
		animation-play-state: paused;
	}
</style>
