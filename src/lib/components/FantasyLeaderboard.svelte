<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { formatScoreToPar, getScoreColorClass, getScoreColorClassLight } from '$lib/scoring/scoreUtils';
	import { rankParticipantsByPoints } from '$lib/fantasy/fantasyUtils';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Users from '@lucide/svelte/icons/users';
	import Crown from '@lucide/svelte/icons/crown';
	import Medal from '@lucide/svelte/icons/medal';
	import Award from '@lucide/svelte/icons/award';
	import TrendingUp from '@lucide/svelte/icons/trending-up';

	interface FantasyPrize {
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

	interface FantasyTeam {
		id: string;
		fantasy_tournament: string;
		user: string;
		golfers: string[];
		total_score: number;
		expand?: {
			user?: {
				id: string;
				name: string;
				email: string;
			};
			golfers?: Array<{
				id: string;
				name: string;
			}>;
		};
	}

	interface GolferScore {
		id: string;
		golfer: string;
		score: number;
		current_hole?: number;
	}

	interface FantasyTeamWithScore {
		team: FantasyTeam;
		calculatedScore: number;
		golferScores: Array<{
			golferId: string;
			golferName: string;
			score: number;
			currentHole?: number;
		}>;
		rank: number;
	}

	interface Props {
		fantasyTournamentId?: string;
		fantasyLeagueId?: string;
		showTicker?: boolean;
		compact?: boolean;
	}

	let { fantasyTournamentId, fantasyLeagueId, showTicker = false, compact = false }: Props = $props();

	let teams: FantasyTeamWithScore[] = $state([]);
	let prizes: FantasyPrize[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);
	let unsubscribe: (() => void) | null = null;
	let loadTimeout: ReturnType<typeof setTimeout> | null = null;
	let tournamentTitle = $state('');
	let activeTournamentId = $state<string | null>(null);

	// Generate unique request keys to prevent auto-cancellation
	let requestId = 0;
	
	async function loadFantasyScores() {
		const currentRequestId = ++requestId;
		
		try {
			loading = true;
			error = null;

			let filter = '';
			let tournamentIdForPrizes: string | null = null;
			
			if (fantasyTournamentId) {
				filter = `fantasy_tournament = "${fantasyTournamentId}"`;
				tournamentIdForPrizes = fantasyTournamentId;
			} else if (fantasyLeagueId) {
				// Get fantasy tournaments for this league - prioritize completed drafts, then in_progress
				const tournaments = await pb.collection('fantasy_tournament').getFullList({
					filter: `fantasy_league = "${fantasyLeagueId}"`,
					sort: '-created',
					requestKey: `fantasy_tournaments_${currentRequestId}`
				});
				
				// Find tournaments with completed drafts first, then in_progress
				// Check both draft_status and status fields for compatibility
				const completedDrafts = tournaments.filter(t => t.draft_status === 'completed' || t.status === 'complete');
				const inProgressDrafts = tournaments.filter(t => t.draft_status === 'in_progress');
				const activeTournaments = completedDrafts.length > 0 ? completedDrafts : inProgressDrafts;
				
				if (activeTournaments.length > 0) {
					// Use the most recent tournament with a completed/in_progress draft
					const tournamentIds = activeTournaments.map(t => `"${t.id}"`).join(',');
					filter = `fantasy_tournament ?~ ${tournamentIds}`;
					tournamentTitle = activeTournaments[0].title || 'Current Tournament';
					tournamentIdForPrizes = activeTournaments[0].id;
				} else {
					teams = [];
					loading = false;
					return;
				}
			}
			
			activeTournamentId = tournamentIdForPrizes;
			
			// Load prizes for this tournament
			if (tournamentIdForPrizes) {
				try {
					prizes = await pb.collection('fantasy_prize').getFullList<FantasyPrize>({
						filter: `fantasy_tournament = "${tournamentIdForPrizes}"`,
						sort: 'position',
						requestKey: `fantasy_prizes_${currentRequestId}`
					});
					console.log(`🏆 Loaded ${prizes.length} prizes for tournament ${tournamentIdForPrizes}:`, prizes);
				} catch (err: any) {
					// Prize collection might not exist yet
					if (err.status !== 404 && err.status !== 0) {
						console.log('No prizes found for tournament');
					}
					prizes = [];
				}
			}

			// Get fantasy teams
			const fantasyTeams = await pb.collection('fantasy_team').getFullList<FantasyTeam>({
				filter,
				expand: 'user',
				requestKey: `fantasy_teams_${currentRequestId}`
			});

			if (fantasyTeams.length === 0) {
				teams = [];
				loading = false;
				return;
			}

			// Get all golfer IDs from all teams
			const allGolferIds = [...new Set(fantasyTeams.flatMap(t => t.golfers || []))];
			
			// Get current scores for all golfers
			let golferScores: GolferScore[] = [];
			if (allGolferIds.length > 0) {
				try {
					golferScores = await pb.collection('golfer_scores').getFullList<GolferScore>({
						filter: allGolferIds.map(id => `golfer = "${id}"`).join(' || '),
						requestKey: `golfer_scores_${currentRequestId}`
					});
				} catch (err: any) {
					// Scores might not exist yet, or request was cancelled
					if (err.status !== 0) {
						console.log('No golfer scores found');
					}
				}
			}

			// Get golfer names
			let golferNames: Record<string, string> = {};
			if (allGolferIds.length > 0) {
				try {
					const golfers = await pb.collection('golfers').getFullList({
						filter: allGolferIds.map(id => `id = "${id}"`).join(' || '),
						requestKey: `golfers_${currentRequestId}`
					});
					golferNames = Object.fromEntries(golfers.map(g => [g.id, g.name]));
				} catch (err: any) {
					if (err.status !== 0) {
						console.log('Could not fetch golfer names');
					}
				}
			}

			// Create score lookup
			const scoreMap = new Map(golferScores.map(s => [s.golfer, s]));

			// Calculate scores for each team
			const teamsWithScores: FantasyTeamWithScore[] = fantasyTeams.map(team => {
				const golferScoreDetails = (team.golfers || []).map(golferId => {
					const scoreRecord = scoreMap.get(golferId);
					return {
						golferId,
						golferName: golferNames[golferId] || 'Unknown',
						score: scoreRecord?.score || 0,
						currentHole: scoreRecord?.current_hole
					};
				});

				const calculatedScore = golferScoreDetails.reduce((sum, g) => sum + g.score, 0);

				return {
					team,
					calculatedScore,
					golferScores: golferScoreDetails,
					rank: 0
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

			teams = teamsWithScores;
		} catch (err: any) {
			// Silently ignore auto-cancelled requests (status 0) and 404s
			if (err.status !== 404 && err.status !== 0) {
				console.error('Error loading fantasy scores:', err);
				error = err.message;
			}
		} finally {
			loading = false;
		}
	}

	let interval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		loadFantasyScores();

		// Subscribe to score updates
		pb.collection('golfer_scores').subscribe('*', async () => {
			if (loadTimeout) clearTimeout(loadTimeout);
			loadTimeout = setTimeout(async () => {
				await loadFantasyScores();
			}, 500);
		}).then(unsub => {
			unsubscribe = unsub;
		}).catch((err: any) => {
			if (err.status !== 404 && err.status !== 0) {
				console.error('Error subscribing to scores:', err);
			}
		});

		interval = setInterval(loadFantasyScores, 30000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (loadTimeout) clearTimeout(loadTimeout);
		if (unsubscribe) {
			unsubscribe();
		}
	});

	function getRankBadge(rank: number) {
		if (rank === 1) return { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-100', border: 'border-yellow-400' };
		if (rank === 2) return { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-100', border: 'border-gray-300' };
		if (rank === 3) return { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-400' };
		return null;
	}

	function getPrizeForRank(rank: number): FantasyPrize | undefined {
		return prizes.find(p => p.position === rank);
	}

	function getPrizeDisplay(prize: FantasyPrize): string {
		if (prize.prize_label) return prize.prize_label;
		if (prize.prize_type === 'points' && prize.prize_value) return `${prize.prize_value} pts`;
		if (prize.prize_type === 'money' && prize.prize_value) return `$${prize.prize_value}`;
		return '';
	}

	function getDefaultPrizeLabel(rank: number): string {
		if (rank === 1) return '🥇 Champion';
		if (rank === 2) return '🥈 Runner-up';
		if (rank === 3) return '🥉 Third';
		return '';
	}
</script>

{#if showTicker}
	<!-- Ticker Mode for Fantasy Scores -->
	<div class="fantasy-ticker bg-gradient-to-r from-[#2F91F6] to-blue-700 text-white py-2 overflow-hidden">
		<div class="container mx-auto px-4">
			{#if loading && teams.length === 0}
				<div class="flex items-center justify-center">
					<div class="animate-pulse text-sm">Loading fantasy scores...</div>
				</div>
			{:else if error}
				<div class="text-center text-red-200 text-sm">Unable to load fantasy scores</div>
			{:else if teams.length === 0}
				<div class="text-center text-blue-200 text-sm">No fantasy scores available</div>
			{:else}
				<div class="ticker-wrapper">
					<div class="ticker-content flex items-center">
						<span class="flex items-center gap-2 mr-6 text-white font-bold">
							<Users class="h-4 w-4" />
							FANTASY STANDINGS
						</span>
						{#each teams as teamData}
							<div class="ticker-item inline-flex items-center mx-4 gap-2">
								<span class="px-2 py-0.5 rounded text-xs font-bold {teamData.rank === 1 ? 'bg-yellow-400 text-yellow-900' : teamData.rank === 2 ? 'bg-gray-300 text-gray-800' : teamData.rank === 3 ? 'bg-amber-400 text-amber-900' : 'bg-white/20'}">
									{teamData.rank === 1 ? '🥇' : teamData.rank === 2 ? '🥈' : teamData.rank === 3 ? '🥉' : teamData.rank}
								</span>
								<span class="font-medium">
									{teamData.team.expand?.user?.name || 'Unknown'}
								</span>
								<span class="{getScoreColorClass(teamData.calculatedScore)} font-bold">
									{formatScoreToPar(teamData.calculatedScore)}
								</span>
							</div>
						{/each}
						<!-- Duplicate for seamless loop -->
						{#each teams as teamData}
							<div class="ticker-item inline-flex items-center mx-4 gap-2">
								<span class="px-2 py-0.5 rounded text-xs font-bold {teamData.rank === 1 ? 'bg-yellow-400 text-yellow-900' : teamData.rank === 2 ? 'bg-gray-300 text-gray-800' : teamData.rank === 3 ? 'bg-amber-400 text-amber-900' : 'bg-white/20'}">
									{teamData.rank === 1 ? '🥇' : teamData.rank === 2 ? '🥈' : teamData.rank === 3 ? '🥉' : teamData.rank}
								</span>
								<span class="font-medium">
									{teamData.team.expand?.user?.name || 'Unknown'}
								</span>
								<span class="{getScoreColorClass(teamData.calculatedScore)} font-bold">
									{formatScoreToPar(teamData.calculatedScore)}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<!-- Full Leaderboard Mode -->
	<div class="fantasy-leaderboard bg-white rounded-xl shadow-xl overflow-hidden">
		<div class="bg-[#2F91F6] text-white px-6 py-4 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<Users class="h-6 w-6" />
				<div>
					<h2 class="text-xl font-bold">Fantasy Leaderboard</h2>
					{#if tournamentTitle}
						<p class="text-blue-100 text-sm">{tournamentTitle}</p>
					{/if}
				</div>
			</div>
			{#if !loading}
				<div class="flex items-center gap-2">
					<span class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
					<span class="text-xs text-blue-100">Live</span>
				</div>
			{/if}
		</div>

		{#if loading && teams.length === 0}
			<div class="p-8 text-center">
				<div class="animate-pulse text-gray-500">Loading fantasy scores...</div>
			</div>
		{:else if error}
			<div class="p-8 text-center text-red-500">
				Unable to load fantasy scores
			</div>
		{:else if teams.length === 0}
			<div class="p-8 text-center text-gray-500">
				<Users class="h-12 w-12 mx-auto mb-3 text-gray-300" />
				<p>No fantasy teams found</p>
				<p class="text-sm text-gray-400 mt-1">Teams will appear after the draft</p>
			</div>
		{:else}
			<div class="divide-y divide-gray-200">
				{#each teams as teamData, i}
					{@const badge = getRankBadge(teamData.rank)}
					{@const prize = getPrizeForRank(teamData.rank)}
					{@const isPrizePosition = teamData.rank <= 3}
					{@const isEvenRow = i % 2 === 0}
					<div class="p-4 hover:bg-blue-50 transition-colors {isEvenRow ? 'bg-white' : 'bg-gray-50'} {isPrizePosition ? 'border-l-4 ' + (badge?.border || 'border-yellow-400') : ''}">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<!-- Rank Badge -->
								<div class="w-12 h-12 flex items-center justify-center rounded-full {badge?.bg || 'bg-gray-100'} {badge ? 'ring-2 ring-offset-1 ' + badge.border : ''}">
									{#if badge}
										{@const BadgeIcon = badge.icon}
										<BadgeIcon class="h-6 w-6 {badge.color}" />
									{:else}
										<span class="font-bold text-gray-600 text-lg">{teamData.rank}</span>
									{/if}
								</div>

								<!-- Team Info -->
								<div>
									<div class="flex items-center gap-2">
										<span class="font-semibold text-black text-lg">
											{teamData.team.expand?.user?.name || 'Unknown Player'}
										</span>
										{#if prize}
											<span class="px-2 py-0.5 text-xs font-bold rounded-full {teamData.rank === 1 ? 'bg-yellow-400 text-yellow-900' : teamData.rank === 2 ? 'bg-gray-300 text-gray-800' : 'bg-amber-400 text-amber-900'}">
												{getPrizeDisplay(prize)}
											</span>
										{:else if teamData.rank <= 3}
											<span class="px-2 py-0.5 text-xs font-bold rounded-full {teamData.rank === 1 ? 'bg-yellow-400 text-yellow-900' : teamData.rank === 2 ? 'bg-gray-300 text-gray-800' : 'bg-amber-400 text-amber-900'}">
												{getDefaultPrizeLabel(teamData.rank)}
											</span>
										{/if}
									</div>
									{#if !compact}
										<div class="text-xs text-gray-500 mt-1 flex items-center gap-2">
											<span>{teamData.golferScores.length} golfers</span>
											{#if teamData.rank === 1}
												<span class="text-yellow-600 font-semibold">🏆 Leader</span>
											{/if}
										</div>
									{/if}
								</div>
							</div>

							<!-- Score -->
							<div class="text-right">
								<div class="{getScoreColorClassLight(teamData.calculatedScore)} font-bold text-2xl px-4 py-2 rounded-lg {isPrizePosition ? 'ring-2 ring-offset-1 ' + (badge?.border || '') : ''}">
									{formatScoreToPar(teamData.calculatedScore)}
								</div>
								{#if prize && prize.prize_type === 'points' && prize.prize_value}
									<div class="text-xs text-green-600 font-semibold mt-1">
										+{prize.prize_value} pts
									</div>
								{:else if teamData.rank === 1}
									<div class="text-xs text-green-600 font-semibold mt-1">
										+100 pts
									</div>
								{:else if teamData.rank === 2}
									<div class="text-xs text-green-600 font-semibold mt-1">
										+50 pts
									</div>
								{:else if teamData.rank === 3}
									<div class="text-xs text-green-600 font-semibold mt-1">
										+25 pts
									</div>
								{/if}
							</div>
						</div>

						{#if !compact && teamData.golferScores.length > 0}
							<!-- Golfer Breakdown -->
							<div class="mt-3 ml-16 flex flex-wrap gap-2">
								{#each teamData.golferScores as golfer}
									<div class="inline-flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded text-xs shadow-sm">
										<span class="text-gray-700 font-medium">{golfer.golferName}</span>
										<span class="{getScoreColorClassLight(golfer.score)} font-bold px-1.5 py-0.5 rounded">
											{formatScoreToPar(golfer.score)}
										</span>
										{#if golfer.currentHole}
											<span class="text-gray-400">({golfer.currentHole})</span>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
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
		animation: scroll 40s linear infinite;
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
