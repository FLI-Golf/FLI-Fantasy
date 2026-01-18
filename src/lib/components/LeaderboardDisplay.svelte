<script lang="ts">
	import MasterLeaderboard from './MasterLeaderboard.svelte';
	import FantasyLeaderboard from './FantasyLeaderboard.svelte';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Users from '@lucide/svelte/icons/users';

	interface Props {
		fantasyTournamentId?: string;
		fantasyLeagueId?: string;
		tournamentId?: string;
		showMasterTicker?: boolean;
		showFantasyTicker?: boolean;
		layout?: 'side-by-side' | 'stacked' | 'tabs';
	}

	let { 
		fantasyTournamentId, 
		fantasyLeagueId, 
		tournamentId,
		showMasterTicker = true,
		showFantasyTicker = true,
		layout = 'side-by-side'
	}: Props = $props();

	let activeTab = $state<'master' | 'fantasy'>('fantasy');
</script>

<div class="leaderboard-display space-y-4">
	<!-- Tickers -->
	{#if showMasterTicker || showFantasyTicker}
		<div class="tickers-container space-y-0">
			{#if showMasterTicker}
				<MasterLeaderboard tournamentId={tournamentId} showTicker={true} limit={10} />
			{/if}
			{#if showFantasyTicker}
				<FantasyLeaderboard 
					fantasyTournamentId={fantasyTournamentId} 
					fantasyLeagueId={fantasyLeagueId}
					showTicker={true} 
				/>
			{/if}
		</div>
	{/if}

	<!-- Main Leaderboards -->
	{#if layout === 'tabs'}
		<!-- Tab Layout -->
		<div class="bg-white rounded-xl shadow-xl overflow-hidden">
			<div class="flex border-b border-gray-200">
				<button
					onclick={() => activeTab = 'fantasy'}
					class="flex-1 px-6 py-4 flex items-center justify-center gap-2 font-semibold transition-colors
						{activeTab === 'fantasy' ? 'bg-[#2F91F6] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}"
				>
					<Users class="h-5 w-5" />
					Fantasy Standings
				</button>
				<button
					onclick={() => activeTab = 'master'}
					class="flex-1 px-6 py-4 flex items-center justify-center gap-2 font-semibold transition-colors
						{activeTab === 'master' ? 'bg-black text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}"
				>
					<Trophy class="h-5 w-5" />
					Tournament Leaderboard
				</button>
			</div>

			<div class="p-0">
				{#if activeTab === 'fantasy'}
					<FantasyLeaderboard 
						fantasyTournamentId={fantasyTournamentId} 
						fantasyLeagueId={fantasyLeagueId}
					/>
				{:else}
					<MasterLeaderboard tournamentId={tournamentId} />
				{/if}
			</div>
		</div>

	{:else if layout === 'stacked'}
		<!-- Stacked Layout -->
		<div class="space-y-6">
			<FantasyLeaderboard 
				fantasyTournamentId={fantasyTournamentId} 
				fantasyLeagueId={fantasyLeagueId}
			/>
			<MasterLeaderboard tournamentId={tournamentId} />
		</div>

	{:else}
		<!-- Side by Side Layout (default) -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<FantasyLeaderboard 
				fantasyTournamentId={fantasyTournamentId} 
				fantasyLeagueId={fantasyLeagueId}
			/>
			<MasterLeaderboard tournamentId={tournamentId} />
		</div>
	{/if}
</div>
