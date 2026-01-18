<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { formatScoreToPar, getScoreColorClass, getScoreColorClassLight, formatPosition } from '$lib/scoring/scoreUtils';
	import Trophy from '@lucide/svelte/icons/trophy';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import Minus from '@lucide/svelte/icons/minus';

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
				team?: string;
			};
			tournament?: {
				id: string;
				name: string;
				holes?: number;
			};
		};
	}

	interface Props {
		tournamentId?: string;
		limit?: number;
		showTicker?: boolean;
	}

	let { tournamentId, limit = 20, showTicker = false }: Props = $props();

	let scores: GolferScore[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);
	let unsubscribe: (() => void) | null = null;
	let loadTimeout: ReturnType<typeof setTimeout> | null = null;
	let tournamentName = $state('');

	function getPositionChange(position: number): 'up' | 'down' | 'same' {
		// Placeholder - in real implementation, compare with previous position
		return 'same';
	}

	function formatHoleStatus(score: GolferScore): string {
		if (!score.current_hole) return '';
		const totalHoles = score.expand?.tournament?.holes || 18;
		if (score.current_hole >= totalHoles) return 'F';
		return `${score.current_hole}`;
	}

	// Generate unique request keys to prevent auto-cancellation
	let requestId = 0;
	
	async function loadScores() {
		const currentRequestId = ++requestId;
		
		try {
			loading = true;
			error = null;

			let filter = 'is_cut = false';
			if (tournamentId) {
				filter += ` && tournament = "${tournamentId}"`;
			}

			const records = await pb.collection('golfer_scores').getFullList<GolferScore>({
				sort: 'score,position',
				expand: 'golfer,tournament',
				filter,
				requestKey: `master_leaderboard_${currentRequestId}`
			});

			scores = limit ? records.slice(0, limit) : records;
			
			if (records.length > 0 && records[0].expand?.tournament) {
				tournamentName = records[0].expand.tournament.name;
			}
		} catch (err: any) {
			// Silently ignore auto-cancelled requests (status 0) and 404s
			if (err.status !== 404 && err.status !== 0) {
				console.error('Error loading leaderboard:', err);
				error = err.message;
			}
		} finally {
			loading = false;
		}
	}

	let interval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		loadScores();

		pb.collection('golfer_scores').subscribe('*', async () => {
			if (loadTimeout) clearTimeout(loadTimeout);
			loadTimeout = setTimeout(async () => {
				await loadScores();
			}, 500);
		}).then(unsub => {
			unsubscribe = unsub;
		}).catch((err: any) => {
			if (err.status !== 404 && err.status !== 0) {
				console.error('Error subscribing to scores:', err);
			}
		});

		interval = setInterval(loadScores, 30000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (loadTimeout) clearTimeout(loadTimeout);
		if (unsubscribe) {
			unsubscribe();
		}
	});
</script>

{#if showTicker}
	<!-- Ticker Mode -->
	<div class="master-ticker bg-gradient-to-r from-black to-gray-900 text-white py-2 overflow-hidden border-b border-gray-700">
		<div class="container mx-auto px-4">
			{#if loading && scores.length === 0}
				<div class="flex items-center justify-center">
					<div class="animate-pulse text-sm">Loading leaderboard...</div>
				</div>
			{:else if error}
				<div class="text-center text-red-300 text-sm">Unable to load leaderboard</div>
			{:else if scores.length === 0}
				<div class="text-center text-gray-400 text-sm">No scores available</div>
			{:else}
				<div class="ticker-wrapper">
					<div class="ticker-content flex items-center">
						<span class="flex items-center gap-2 mr-6 text-yellow-400 font-bold">
							<Trophy class="h-4 w-4" />
							LEADERBOARD
						</span>
						{#each scores as score, i}
							{#if score.expand?.golfer}
								<div class="ticker-item inline-flex items-center mx-4 gap-2">
									<span class="text-yellow-400 font-bold text-sm">{formatPosition(score.position, false)}</span>
									<span class="font-medium">{score.expand.golfer.name}</span>
									<span class={getScoreColorClass(score.score) + ' font-bold'}>
										{formatScoreToPar(score.score)}
									</span>
									{#if formatHoleStatus(score)}
										<span class="text-gray-400 text-xs">({formatHoleStatus(score)})</span>
									{/if}
								</div>
							{/if}
						{/each}
						<!-- Duplicate for seamless loop -->
						{#each scores as score}
							{#if score.expand?.golfer}
								<div class="ticker-item inline-flex items-center mx-4 gap-2">
									<span class="text-yellow-400 font-bold text-sm">{formatPosition(score.position, false)}</span>
									<span class="font-medium">{score.expand.golfer.name}</span>
									<span class={getScoreColorClass(score.score) + ' font-bold'}>
										{formatScoreToPar(score.score)}
									</span>
									{#if formatHoleStatus(score)}
										<span class="text-gray-400 text-xs">({formatHoleStatus(score)})</span>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<!-- Full Leaderboard Mode -->
	<div class="master-leaderboard bg-white rounded-xl shadow-xl overflow-hidden">
		<div class="bg-black text-white px-6 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<Trophy class="h-6 w-6 text-yellow-400" />
				<div>
					<h2 class="text-xl font-bold">Tournament Leaderboard</h2>
					{#if tournamentName}
						<p class="text-gray-400 text-sm">{tournamentName}</p>
					{/if}
				</div>
			</div>
			{#if !loading}
				<span class="text-xs text-gray-400">Live</span>
			{/if}
		</div>

		{#if loading && scores.length === 0}
			<div class="p-8 text-center">
				<div class="animate-pulse text-gray-500">Loading leaderboard...</div>
			</div>
		{:else if error}
			<div class="p-8 text-center text-red-500">
				Unable to load leaderboard
			</div>
		{:else if scores.length === 0}
			<div class="p-8 text-center text-gray-500">
				No scores available yet
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-100 text-gray-700 text-sm">
						<tr>
							<th class="px-4 py-3 text-left font-semibold">Pos</th>
							<th class="px-4 py-3 text-left font-semibold">Player</th>
							<th class="px-4 py-3 text-center font-semibold">Score</th>
							<th class="px-4 py-3 text-center font-semibold">Thru</th>
							<th class="px-4 py-3 text-center font-semibold">Strokes</th>
						</tr>
					</thead>
					<tbody>
						{#each scores as score, i}
							{#if score.expand?.golfer}
								{@const isEvenRow = i % 2 === 0}
								<tr class="border-b border-gray-200 hover:bg-blue-50 transition-colors {isEvenRow ? 'bg-white' : 'bg-gray-50'} {i < 3 ? 'border-l-4 ' + (i === 0 ? 'border-yellow-400' : i === 1 ? 'border-gray-400' : 'border-amber-400') : ''}">
									<td class="px-4 py-3">
										<div class="flex items-center gap-2">
											{#if i === 0}
												<span class="text-yellow-500 font-bold text-lg">1</span>
											{:else if i === 1}
												<span class="text-gray-400 font-bold text-lg">2</span>
											{:else if i === 2}
												<span class="text-amber-600 font-bold text-lg">3</span>
											{:else}
												<span class="text-gray-600 font-medium">{formatPosition(score.position, false)}</span>
											{/if}
											{#if getPositionChange(score.position) === 'up'}
												<TrendingUp class="h-3 w-3 text-green-500" />
											{:else if getPositionChange(score.position) === 'down'}
												<TrendingDown class="h-3 w-3 text-red-500" />
											{/if}
										</div>
									</td>
									<td class="px-4 py-3">
										<div class="flex flex-col">
											<span class="font-semibold text-black">{score.expand.golfer.name}</span>
											{#if score.expand.golfer.country}
												<span class="text-xs text-gray-500">{score.expand.golfer.country}</span>
											{/if}
										</div>
									</td>
									<td class="px-4 py-3 text-center">
										<span class="{getScoreColorClassLight(score.score)} font-bold text-lg px-3 py-1 rounded">
											{formatScoreToPar(score.score)}
										</span>
									</td>
									<td class="px-4 py-3 text-center text-gray-600">
										{formatHoleStatus(score) || '-'}
									</td>
									<td class="px-4 py-3 text-center text-gray-600">
										{score.total_strokes || '-'}
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}

<style>
	.ticker-wrapper {
		overflow: hidden;
		white-space: nowrap;
	}

	.ticker-content {
		display: inline-flex;
		animation: scroll 45s linear infinite;
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
