<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { pb } from '$lib/pocketbase';

	interface GolferScore {
		id: string;
		score: number;
		total_strokes: number;
		position: number;
		is_cut: boolean;
		current_hole?: number;
		expand?: {
			golfer?: {
				id: string;
				name: string;
				country: string;
			};
			tournament?: {
				id: string;
				name: string;
				holes?: number;
			};
		};
	}

	let scores: GolferScore[] = [];
	let loading = true;
	let error: string | null = null;
	let unsubscribe: (() => void) | null = null;
	let loadTimeout: ReturnType<typeof setTimeout> | null = null;

	// Format score to par display
	function formatScoreToPar(score: number): string {
		if (score === 0) return 'E';
		return score > 0 ? `+${score}` : `${score}`;
	}

	// Get color class based on score
	function getScoreColor(score: number): string {
		if (score < -2) return 'text-yellow-300 font-bold text-xl'; // Eagle or better
		if (score < 0) return 'text-yellow-200 font-bold text-xl'; // Birdie (under par)
		if (score === 0) return 'text-white font-semibold text-lg'; // Par
		return 'text-red-300 font-semibold text-lg'; // Bogey or worse (over par)
	}

	// Format hole status
	function formatHoleStatus(score: GolferScore): string {
		if (!score.current_hole) return '';
		
		// Assume 18 holes unless we have tournament data
		const totalHoles = 18;
		
		if (score.current_hole >= totalHoles) {
			return 'Final';
		}
		
		return `after hole ${score.current_hole}`;
	}

	// Generate unique request keys to prevent auto-cancellation
	let requestId = 0;

	async function loadScores() {
		const currentRequestId = ++requestId;
		
		try {
			loading = true;
			error = null;

			// Load golfer scores with golfer and tournament expanded
			const records = await pb.collection('golfer_scores').getFullList<GolferScore>({
				sort: 'score,position',
				expand: 'golfer,tournament',
				filter: 'is_cut = false',
				requestKey: `live_ticker_${currentRequestId}`
			});

			scores = records;
		} catch (err: any) {
			// Silently ignore auto-cancelled requests (status 0) and 404s
			if (err.status !== 404 && err.status !== 0) {
				console.error('Error loading live scores:', err);
				error = err.message;
			}
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		await loadScores();

		// Subscribe to real-time updates (only if collection exists)
		try {
			unsubscribe = await pb.collection('golfer_scores').subscribe('*', async (e) => {
				// Debounce rapid updates
				if (loadTimeout) clearTimeout(loadTimeout);
				loadTimeout = setTimeout(async () => {
					await loadScores();
				}, 500);
			});
		} catch (err: any) {
			// Silently fail if collection doesn't exist yet
			if (err.status !== 404 && err.status !== 0) {
				console.error('Error subscribing to live scores:', err);
			}
		}

		// Refresh scores every 30 seconds as fallback
		const interval = setInterval(loadScores, 30000);

		return () => {
			clearInterval(interval);
			if (loadTimeout) clearTimeout(loadTimeout);
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
							<div class="ticker-item inline-flex items-center mx-6 gap-2">
								<span class="font-semibold text-base">{score.expand.golfer.name}</span>
								{#if score.expand.golfer.country}
									<span class="text-xs text-gray-300">({score.expand.golfer.country})</span>
								{/if}
								<span class="text-gray-400">•</span>
								<span class={getScoreColor(score.score) + ' px-3 py-1 rounded-md bg-black/40 shadow-lg'}>
									{formatScoreToPar(score.score)}
								</span>
								{#if formatHoleStatus(score)}
									<span class="text-gray-300 text-sm italic">
										{formatHoleStatus(score)}
									</span>
								{/if}
								{#if score.position}
									<span class="text-gray-300 text-sm font-medium">
										T{score.position}
									</span>
								{/if}
							</div>
						{/if}
					{/each}
					<!-- Duplicate for seamless loop -->
					{#each scores as score}
						{#if score.expand?.golfer}
							<div class="ticker-item inline-flex items-center mx-6 gap-2">
								<span class="font-semibold text-base">{score.expand.golfer.name}</span>
								{#if score.expand.golfer.country}
									<span class="text-xs text-gray-300">({score.expand.golfer.country})</span>
								{/if}
								<span class="text-gray-400">•</span>
								<span class={getScoreColor(score.score) + ' px-3 py-1 rounded-md bg-black/40 shadow-lg'}>
									{formatScoreToPar(score.score)}
								</span>
								{#if formatHoleStatus(score)}
									<span class="text-gray-300 text-sm italic">
										{formatHoleStatus(score)}
									</span>
								{/if}
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
