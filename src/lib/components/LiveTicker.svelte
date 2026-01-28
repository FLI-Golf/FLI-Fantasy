<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { pb } from '$lib/pocketbase';

	// ============ TYPES ============
	type TickerMode = 'live_scores' | 'ticker_items' | 'loading';

	interface GolferScore {
		id: string;
		score: number;
		total_strokes: number;
		position: number;
		is_cut: boolean;
		current_hole?: number;
		golfer: string;
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

	interface Team {
		id: string;
		name: string;
		logo: string;
		mini_logo: string;
		male_golfer: string;
		female_golfer: string;
		collectionId: string;
	}

	interface GolferWithGender extends GolferScore {
		isMale: boolean;
	}

	interface TeamScore {
		team: Team;
		golfers: GolferWithGender[];
		combinedScore: number;
	}

	interface Tournament {
		id: string;
		name: string;
		status: string;
		start_date: string;
		end_date: string;
		location?: { name?: string };
	}

	interface TickerItem {
		id: string;
		type: 'announcement' | 'promotion' | 'countdown' | 'fantasy' | 'custom';
		title: string;
		message: string;
		link_url?: string;
		link_text?: string;
		icon?: string;
		priority: number;
		starts_at?: string;
		expires_at?: string;
		is_active: boolean;
		bg_color?: string;
		text_color?: string;
	}

	// ============ STATE ============
	let mode: TickerMode = 'loading';
	let teamScores: TeamScore[] = [];
	let tickerItems: TickerItem[] = [];
	let activeTournament: Tournament | null = null;
	let nextTournament: Tournament | null = null;
	let countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
	let loading = true;
	let error: string | null = null;
	let unsubscribeScores: (() => void) | null = null;
	let unsubscribeItems: (() => void) | null = null;
	let loadTimeout: ReturnType<typeof setTimeout> | null = null;
	let countdownInterval: ReturnType<typeof setInterval> | null = null;
	let requestId = 0;

	// ============ SCORE HELPERS ============
	function formatScoreToPar(score: number): string {
		if (score === 0) return 'E';
		return score > 0 ? `+${score}` : `${score}`;
	}

	function getScoreColor(score: number): string {
		if (score < -2) return 'text-yellow-300 font-bold';
		if (score < 0) return 'text-yellow-200 font-bold';
		if (score === 0) return 'text-white font-semibold';
		return 'text-red-300 font-semibold';
	}

	function formatHoleStatus(score: GolferScore): string {
		if (!score.current_hole) return '';
		const totalHoles = 18;
		if (score.current_hole >= totalHoles) return 'F';
		return `thru ${score.current_hole}`;
	}

	function getTeamLogoUrl(team: Team): string {
		if (!team.mini_logo) return '';
		return `https://pocketbase-production-e678.up.railway.app/api/files/${team.collectionId}/${team.id}/${team.mini_logo}`;
	}

	function groupScoresByTeam(scores: GolferScore[], teams: Team[]): TeamScore[] {
		const golferToTeam = new Map<string, Team>();
		const maleGolfers = new Set<string>();
		
		teams.forEach(team => {
			if (team.male_golfer) {
				golferToTeam.set(team.male_golfer, team);
				maleGolfers.add(team.male_golfer);
			}
			if (team.female_golfer) {
				golferToTeam.set(team.female_golfer, team);
			}
		});

		const teamScoreMap = new Map<string, TeamScore>();
		
		scores.forEach(score => {
			const golferId = score.golfer || score.expand?.golfer?.id;
			if (!golferId) return;
			
			const team = golferToTeam.get(golferId);
			if (!team) return;
			
			if (!teamScoreMap.has(team.id)) {
				teamScoreMap.set(team.id, {
					team,
					golfers: [],
					combinedScore: 0
				});
			}
			
			const teamScore = teamScoreMap.get(team.id)!;
			const golferWithGender: GolferWithGender = {
				...score,
				isMale: maleGolfers.has(golferId)
			};
			teamScore.golfers.push(golferWithGender);
			teamScore.combinedScore += score.score;
		});

		return Array.from(teamScoreMap.values()).sort((a, b) => a.combinedScore - b.combinedScore);
	}

	// ============ TICKER ITEM HELPERS ============
	function getIconComponent(iconName: string | undefined): string {
		// Return emoji fallbacks for common icons
		const iconMap: Record<string, string> = {
			'ticket': '🎟️',
			'trophy': '🏆',
			'users': '👥',
			'shopping-bag': '🛍️',
			'calendar': '📅',
			'star': '⭐',
			'bell': '🔔',
			'info': 'ℹ️'
		};
		return iconMap[iconName || ''] || '📢';
	}

	function isItemActive(item: TickerItem): boolean {
		if (!item.is_active) return false;
		
		const now = new Date();
		if (item.starts_at && new Date(item.starts_at) > now) return false;
		if (item.expires_at && new Date(item.expires_at) < now) return false;
		
		return true;
	}

	// ============ COUNTDOWN ============
	function updateCountdown() {
		if (!nextTournament) return;
		
		const tournamentDate = new Date(nextTournament.start_date);
		const now = new Date();
		const diff = tournamentDate.getTime() - now.getTime();
		
		if (diff <= 0) {
			countdown = { days: 0, hours: 0, minutes: 0, seconds: 0 };
			return;
		}
		
		countdown = {
			days: Math.floor(diff / (1000 * 60 * 60 * 24)),
			hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
			minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
			seconds: Math.floor((diff % (1000 * 60)) / 1000)
		};
	}

	// ============ DATA LOADING ============
	async function loadData() {
		const currentRequestId = ++requestId;
		
		try {
			loading = true;
			error = null;

			// Check for active tournament (in_progress status)
			const tournaments = await pb.collection('tournaments').getFullList<Tournament>({
				filter: 'status = "in_progress"',
				requestKey: `ticker_tournaments_${currentRequestId}`
			});

			activeTournament = tournaments.length > 0 ? tournaments[0] : null;
			
			// If no active tournament, get next upcoming
			if (!activeTournament) {
				const upcomingTournaments = await pb.collection('tournaments').getList<Tournament>(1, 1, {
					filter: 'status = "upcoming"',
					sort: 'start_date',
					requestKey: `ticker_upcoming_${currentRequestId}`
				});
				nextTournament = upcomingTournaments.items[0] || null;
				
				if (nextTournament) {
					updateCountdown();
					if (!countdownInterval) {
						countdownInterval = setInterval(updateCountdown, 1000);
					}
				}
			} else {
				nextTournament = null;
				if (countdownInterval) {
					clearInterval(countdownInterval);
					countdownInterval = null;
				}
			}

			if (activeTournament) {
				// Load live scores
				const [scoresRecords, teamsRecords] = await Promise.all([
					pb.collection('golfer_scores').getFullList<GolferScore>({
						sort: 'score,position',
						expand: 'golfer,tournament',
						filter: 'is_cut = false',
						requestKey: `ticker_scores_${currentRequestId}`
					}),
					pb.collection('teams').getFullList<Team>({
						filter: 'reserves = false',
						requestKey: `ticker_teams_${currentRequestId}`
					})
				]);

				teamScores = groupScoresByTeam(scoresRecords, teamsRecords);
				mode = teamScores.length > 0 ? 'live_scores' : 'ticker_items';
			} else {
				mode = 'ticker_items';
			}

			// Always load ticker items as fallback
			const items = await pb.collection('ticker_items').getFullList<TickerItem>({
				sort: '-priority',
				requestKey: `ticker_items_${currentRequestId}`
			});
			tickerItems = items.filter(isItemActive);

			

		} catch (err: any) {
			if (err.status !== 404 && err.status !== 0) {
				console.error('Error loading ticker data:', err);
				error = err.message;
			}
		} finally {
			loading = false;
		}
	}

	// ============ LIFECYCLE ============
	onMount(async () => {
		await loadData();

		// Subscribe to real-time updates
		try {
			unsubscribeScores = await pb.collection('golfer_scores').subscribe('*', async () => {
				if (loadTimeout) clearTimeout(loadTimeout);
				loadTimeout = setTimeout(loadData, 500);
			});
		} catch (err: any) {
			if (err.status !== 404 && err.status !== 0) {
				console.error('Error subscribing to scores:', err);
			}
		}

		try {
			unsubscribeItems = await pb.collection('ticker_items').subscribe('*', async () => {
				if (loadTimeout) clearTimeout(loadTimeout);
				loadTimeout = setTimeout(loadData, 500);
			});
		} catch (err: any) {
			if (err.status !== 404 && err.status !== 0) {
				console.error('Error subscribing to ticker items:', err);
			}
		}

		// Refresh every 30 seconds
		const interval = setInterval(loadData, 30000);

		return () => {
			clearInterval(interval);
			if (loadTimeout) clearTimeout(loadTimeout);
		};
	});

	onDestroy(() => {
		if (unsubscribeScores) unsubscribeScores();
		if (unsubscribeItems) unsubscribeItems();
		if (countdownInterval) clearInterval(countdownInterval);
	});
</script>

<div class="live-ticker bg-gradient-to-r from-green-800 to-green-900 text-white py-4 overflow-hidden">
	<div class="container mx-auto px-4">
		{#if loading && mode === 'loading'}
			<div class="flex items-center justify-center">
				<div class="animate-pulse">Loading...</div>
			</div>
		{:else if error}
			<div class="text-center text-red-300">
				<span class="text-sm">Unable to load ticker</span>
			</div>
		{:else if mode === 'live_scores' && teamScores.length > 0}
			<!-- LIVE SCORES MODE -->
			<div class="ticker-wrapper">
				<div class="ticker-content">
					{#each teamScores as teamScore}
						<div class="ticker-item inline-block mx-4 align-top">
							<div class="team-card bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden w-48">
								<div class="bg-black px-3 py-2 flex items-center gap-2 border-b border-gray-700">
									{#if getTeamLogoUrl(teamScore.team)}
										<img 
											src={getTeamLogoUrl(teamScore.team)} 
											alt={teamScore.team.name}
											class="w-8 h-8 object-contain"
										/>
									{/if}
									<div class="flex-1 min-w-0">
										<div class="font-bold text-sm text-white truncate">{teamScore.team.name}</div>
										<div class={getScoreColor(teamScore.combinedScore) + ' text-xs'}>
											Team: {formatScoreToPar(teamScore.combinedScore)}
										</div>
									</div>
								</div>
								<div class="px-2 py-2 space-y-1.5">
									{#each teamScore.golfers as score}
										{#if score.expand?.golfer}
											<div 
												class="flex items-center justify-between rounded-lg px-2 py-1.5"
												style="background-color: {score.isMale ? 'rgba(37, 99, 235, 0.9)' : 'rgba(236, 72, 153, 0.9)'};"
											>
												<span class="text-sm text-white truncate flex-1 font-medium">{score.expand.golfer.name}</span>
												<div class="flex items-center gap-1.5 ml-2">
													<span class="text-white text-sm font-bold">
														{formatScoreToPar(score.score)}
													</span>
													{#if formatHoleStatus(score)}
														<span class="text-white/70 text-xs">
															{formatHoleStatus(score)}
														</span>
													{/if}
												</div>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						</div>
					{/each}
					<!-- Duplicate for seamless loop -->
					{#each teamScores as teamScore}
						<div class="ticker-item inline-block mx-4 align-top">
							<div class="team-card bg-gray-800/90 rounded-xl shadow-lg border border-gray-700 overflow-hidden w-48">
								<div class="bg-black px-3 py-2 flex items-center gap-2 border-b border-gray-700">
									{#if getTeamLogoUrl(teamScore.team)}
										<img 
											src={getTeamLogoUrl(teamScore.team)} 
											alt={teamScore.team.name}
											class="w-8 h-8 object-contain"
										/>
									{/if}
									<div class="flex-1 min-w-0">
										<div class="font-bold text-sm text-white truncate">{teamScore.team.name}</div>
										<div class={getScoreColor(teamScore.combinedScore) + ' text-xs'}>
											Team: {formatScoreToPar(teamScore.combinedScore)}
										</div>
									</div>
								</div>
								<div class="px-2 py-2 space-y-1.5">
									{#each teamScore.golfers as score}
										{#if score.expand?.golfer}
											<div 
												class="flex items-center justify-between rounded-lg px-2 py-1.5"
												style="background-color: {score.isMale ? 'rgba(37, 99, 235, 0.9)' : 'rgba(236, 72, 153, 0.9)'};"
											>
												<span class="text-sm text-white truncate flex-1 font-medium">{score.expand.golfer.name}</span>
												<div class="flex items-center gap-1.5 ml-2">
													<span class="text-white text-sm font-bold">
														{formatScoreToPar(score.score)}
													</span>
													{#if formatHoleStatus(score)}
														<span class="text-white/70 text-xs">
															{formatHoleStatus(score)}
														</span>
													{/if}
												</div>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<!-- TICKER ITEMS MODE WITH COUNTDOWN -->
			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
				<!-- Countdown Section -->
				{#if nextTournament}
					<div class="flex items-center justify-center md:justify-start gap-2 md:gap-4 bg-black/40 rounded-lg px-3 md:px-4 py-2 flex-shrink-0">
						<div class="text-center">
							<span class="text-xs text-gray-300 uppercase">Next Tournament</span>
							<div class="font-bold text-white text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{nextTournament.name}</div>
						</div>
						<div class="flex items-center gap-1 md:gap-2">
							<div class="text-center bg-white/20 rounded px-2 py-1">
								<div class="text-base md:text-lg font-bold text-white">{countdown.days}</div>
								<div class="text-xs text-gray-300">Days</div>
							</div>
							<div class="text-center bg-white/20 rounded px-2 py-1 hidden sm:block">
								<div class="text-base md:text-lg font-bold text-white">{countdown.hours}</div>
								<div class="text-xs text-gray-300">Hrs</div>
							</div>
							<div class="text-center bg-white/20 rounded px-2 py-1">
								<div class="text-base md:text-lg font-bold text-white">{countdown.minutes}</div>
								<div class="text-xs text-gray-300">Min</div>
							</div>
						</div>
						<!-- Blinking ticket button - visible on small screens -->
						<a 
							href="/shop" 
							class="sm:hidden flex items-center gap-1 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-3 py-2 rounded-lg animate-pulse"
							title="Buy Tickets"
						>
							<span class="text-lg">🎟️</span>
							<span class="text-xs">Tickets</span>
						</a>
					</div>
				{/if}
				
				<!-- Scrolling Ticker Items -->
				<div class="ticker-wrapper flex-1 overflow-hidden">
					<div class="ticker-content-items">
						{#each tickerItems as item}
							{@const isPromo = item.type === 'promotion'}
							{@const isFantasy = item.type === 'fantasy'}
							{@const isPop = isPromo || isFantasy}
							<div class="ticker-item inline-flex items-center mx-8 gap-3 rounded-lg px-5 py-3 {isPromo ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse-subtle shadow-lg shadow-yellow-500/30' : isFantasy ? 'bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse-subtle shadow-lg shadow-blue-500/30' : 'bg-black/30'}">
								<span class="text-2xl {isPop ? 'animate-bounce' : ''}">{getIconComponent(item.icon)}</span>
								<div class="flex flex-col">
									<span class="font-bold text-base {isPop ? 'text-white' : 'text-white'}">{item.title}</span>
									{#if item.message}
										<span class="text-sm {isPromo ? 'text-black/80' : isFantasy ? 'text-white/80' : 'text-gray-300'}">{item.message}</span>
									{/if}
								</div>
								{#if item.link_text}
									<span class="ml-4 px-3 py-1 rounded-full text-sm font-bold transition-colors cursor-pointer {isPromo ? 'bg-black text-yellow-400 hover:bg-gray-900' : isFantasy ? 'bg-white text-purple-600 hover:bg-gray-100' : 'bg-white/20 hover:bg-white/30'}">
										{item.link_text} →
									</span>
								{/if}
							</div>
						{/each}
						<!-- Duplicate for seamless loop -->
						{#each tickerItems as item}
							{@const isPromo = item.type === 'promotion'}
							{@const isFantasy = item.type === 'fantasy'}
							{@const isPop = isPromo || isFantasy}
							<div class="ticker-item inline-flex items-center mx-8 gap-3 rounded-lg px-5 py-3 {isPromo ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse-subtle shadow-lg shadow-yellow-500/30' : isFantasy ? 'bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse-subtle shadow-lg shadow-blue-500/30' : 'bg-black/30'}">
								<span class="text-2xl {isPop ? 'animate-bounce' : ''}">{getIconComponent(item.icon)}</span>
								<div class="flex flex-col">
									<span class="font-bold text-base {isPop ? 'text-white' : 'text-white'}">{item.title}</span>
									{#if item.message}
										<span class="text-sm {isPromo ? 'text-black/80' : isFantasy ? 'text-white/80' : 'text-gray-300'}">{item.message}</span>
									{/if}
								</div>
								{#if item.link_text}
									<span class="ml-4 px-3 py-1 rounded-full text-sm font-bold transition-colors cursor-pointer {isPromo ? 'bg-black text-yellow-400 hover:bg-gray-900' : isFantasy ? 'bg-white text-purple-600 hover:bg-gray-100' : 'bg-white/20 hover:bg-white/30'}">
										{item.link_text} →
									</span>
								{/if}
							</div>
						{/each}
					</div>
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

	.ticker-content-items {
		display: inline-block;
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

	.ticker-content:hover,
	.ticker-content-items:hover {
		animation-play-state: paused;
	}

	:global(.animate-pulse-subtle) {
		animation: pulse-subtle 2s ease-in-out infinite;
	}

	@keyframes pulse-subtle {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.95;
			transform: scale(1.02);
		}
	}
</style>
