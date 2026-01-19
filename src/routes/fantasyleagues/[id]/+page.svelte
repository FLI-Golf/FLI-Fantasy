<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Users from '@lucide/svelte/icons/users';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Clock from '@lucide/svelte/icons/clock';
	import Crown from '@lucide/svelte/icons/crown';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Brackets from '@lucide/svelte/icons/brackets';
	import GitBranch from '@lucide/svelte/icons/git-branch';
	import BarChart from '@lucide/svelte/icons/bar-chart';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import FantasyLeaderboard from '$lib/components/FantasyLeaderboard.svelte';
	import MasterLeaderboard from '$lib/components/MasterLeaderboard.svelte';

	let { data, form } = $props();

	// Tab state for standings
	let standingsTab: 'season' | 'tournament' = $state('season');

	const approvedParticipants = $derived(
		(data.participants ?? []).filter((p) => p.status === 'approved')
	);

	// Helper to get user name from user ID
	function getUserName(userId: string): string {
		if (userId === data.currentUser?.id) return 'You';
		const participant = (data.participants ?? []).find((p) => p.user === userId);
		if (participant?.expand?.user) {
			return participant.expand.user.name || participant.expand.user.email || 'Player';
		}
		return 'Player';
	}

	// Debug logging
	$effect(() => {
		console.log('📊 Approved participants:', approvedParticipants);
		approvedParticipants.forEach((p, i) => {
			console.log(`${i + 1}. User:`, p.expand?.user);
		});
	});

	// Debug logging
	$effect(() => {
		if (form) {
			console.log('📋 Form response:', form);
			if (form.error) {
				console.error('❌ Form error:', form.error);
			}
			if (form.success) {
				console.log('✅ Form success:', form.action);
			}
		}
	});
</script>

<div class="max-w-7xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="p-3 bg-black rounded-lg shadow-lg">
				<Trophy class="h-8 w-8 text-white" />
			</div>
			<div>
				<h1 class="text-3xl font-bold text-white">{data.league.title}</h1>
				<p class="text-white/80">
					{approvedParticipants.length} / {data.league.participants?.length || 0} participants
				</p>
			</div>
		</div>

		{#if !data.userStatus && !data.isOwner && data.currentUser}
			<form 
				method="POST" 
				action="?/join" 
				use:enhance={() => {
					console.log('🚀 Submitting join request...');
					console.log('League ID:', data.league.id);
					console.log('User:', data.currentUser?.email);
					return async ({ result, update }) => {
						console.log('📥 Join request result:', result);
						await update();
						// Force reload all data to get updated userStatus
						await invalidateAll();
					};
				}}
			>
				<button 
					type="submit" 
					class="w-full md:w-auto px-12 py-8 bg-gradient-to-br from-green-500 via-emerald-600 to-green-700 hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700 text-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 border-2 border-green-400"
				>
					<div class="flex flex-col items-center gap-3">
						<Trophy class="h-12 w-12 animate-pulse" />
						<span class="text-2xl font-bold">Request to Join League</span>
						<span class="text-sm opacity-90">Click to send your join request</span>
					</div>
				</button>
			</form>
		{:else if data.userStatus?.status === 'pending'}
			<div class="px-6 py-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg shadow-lg">
				<p class="text-lg font-bold text-yellow-700 flex items-center gap-2">
					<Clock class="h-6 w-6" />
					Request Pending - Awaiting Owner Approval
				</p>
			</div>
		{:else if data.userStatus?.status === 'approved'}
			<div class="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-lg shadow-xl">
				<div class="flex items-center gap-3">
					<div class="p-2 bg-green-500 rounded-full">
						<Check class="h-6 w-6 text-white" />
					</div>
					<div>
						<p class="text-xl font-bold text-green-800">You're in this league!</p>
						<p class="text-sm text-green-600">You can now participate in all tournaments</p>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<Card.Root class="border-2 border-green-200 bg-green-50">
			<Card.Content class="p-4">
				<p class="text-green-700 flex items-center gap-2">
					{#if form.action === 'approved'}
						<Check class="h-5 w-5" />
						Participant approved successfully!
					{:else if form.action === 'rejected'}
						<X class="h-5 w-5" />
						Request rejected.
					{:else if form.action === 'requested'}
						<Clock class="h-5 w-5 animate-pulse" />
						Join request sent! Waiting for owner approval.
					{/if}
				</p>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if form?.error}
		<Card.Root class="border-2 border-red-200 bg-red-50">
			<Card.Content class="p-4">
				<p class="text-red-700">{form.error}</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Main Content -->
		<div class="lg:col-span-2 space-y-6">
			<!-- Fantasy Tournaments -->
			{#if data.fantasyTournaments && data.fantasyTournaments.length > 0}
				<Card.Root class="border-2 border-white bg-white shadow-xl">
					<Card.Header>
						<Card.Title class="text-black flex items-center gap-2">
							<Trophy class="h-5 w-5" />
							Fantasy Tournaments ({data.fantasyTournaments.length})
						</Card.Title>
						<Card.Description>Tournaments ready for drafting</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#each data.fantasyTournaments as fantasyTournament}
								{@const draftStatus = fantasyTournament.draft_status || 'pending'}
								{@const isCompleted = draftStatus === 'completed' || fantasyTournament.status === 'complete'}
								{@const isInProgress = draftStatus === 'in_progress'}
								<div class="p-4 bg-gray-50 rounded-lg border border-gray-200 {isCompleted ? 'border-green-300 bg-green-50' : ''}">
									<div class="flex items-start justify-between mb-2">
										<div>
											<h4 class="font-semibold text-black">
												{fantasyTournament.title || 'Tournament'}
											</h4>
											<p class="text-sm text-gray-600">
												{fantasyTournament.draft_order?.length || 0} participants
											</p>
										</div>
										{#if isCompleted}
											<span class="px-2 py-1 bg-green-600 text-white text-xs font-semibold rounded flex items-center gap-1">
												<Check class="h-3 w-3" />
												Draft Complete
											</span>
										{:else if isInProgress}
											<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded flex items-center gap-1">
												<Clock class="h-3 w-3" />
												Drafting
											</span>
										{:else}
											<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
												Ready to Draft
											</span>
										{/if}
									</div>
									{#if fantasyTournament.draft_order}
										<div class="mt-3 pt-3 border-t border-gray-200">
											<p class="text-xs text-gray-600 mb-2">Draft Order:</p>
											<div class="flex flex-wrap gap-2">
												{#each fantasyTournament.draft_order as oderId, index}
													<span class="px-2 py-1 bg-[#2F91F6] text-white text-xs font-semibold rounded">
														{index + 1}. {getUserName(oderId)}
													</span>
												{/each}
											</div>
										</div>
										<div class="mt-4 flex gap-2">
											{#if !isCompleted}
												<a
													href="/fantasyleagues/{fantasyTournament.id}/draft"
													class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
												>
													<ArrowRight class="h-4 w-4" />
													{isInProgress ? 'Continue Draft' : 'Go to Draft'}
												</a>
											{:else if data.isOwner}
												<a
													href="/fantasyleagues/{fantasyTournament.id}/draft"
													class="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
												>
													<ArrowRight class="h-4 w-4" />
													View Draft Results
												</a>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root class="border-2 border-white bg-white shadow-xl">
					<Card.Content class="py-12 text-center">
						<div class="flex justify-center mb-4">
							<div class="p-4 bg-gray-100 rounded-full">
								<Trophy class="h-12 w-12 text-gray-400" />
							</div>
						</div>
						<h3 class="text-xl font-semibold text-black mb-2">Waiting for Participants</h3>
						<p class="text-gray-600 mb-2">
							Need {data.league.settings?.min_participants || 6} participants to generate tournaments
						</p>
						<p class="text-sm text-gray-500 mb-4">
							Current: {data.participants?.length ?? 0} / {data.league.settings?.min_participants || 6}
						</p>
						
						{#if data.upcomingTournaments && data.upcomingTournaments.length > 0}
							<div class="mt-6 pt-6 border-t border-gray-200">
								<h4 class="text-sm font-semibold text-gray-700 mb-3">
									Tournaments Ready to Generate ({data.upcomingTournaments.length})
								</h4>
								<div class="space-y-2 text-left max-h-60 overflow-y-auto">
									{#each data.upcomingTournaments as tournament}
										<div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
											<span class="font-medium text-black">{tournament.name}</span>
											<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
												{tournament.status}
											</span>
										</div>
									{/each}
								</div>
								<p class="text-xs text-gray-500 mt-3">
									These tournaments will auto-generate when you reach {data.league.settings?.min_participants || 6} participants
								</p>
							</div>
						{:else}
							<p class="text-xs text-gray-500 mt-4">
								No upcoming tournaments found for {data.league.season} season
							</p>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Live Leaderboards Section -->
			<div class="space-y-4">
				<Card.Root class="border-2 border-white bg-white shadow-xl">
					<Card.Header>
						<Card.Title class="text-black flex items-center gap-2">
							<BarChart class="h-5 w-5" />
							Live Leaderboards
						</Card.Title>
						<Card.Description>Real-time fantasy and tournament scores</Card.Description>
					</Card.Header>
					<Card.Content>
						{#if data.fantasyTournaments && data.fantasyTournaments.length > 0}
							<!-- Fantasy Leaderboard Ticker -->
							<div class="mb-4 -mx-6">
								<FantasyLeaderboard 
									fantasyLeagueId={data.league.id}
									showTicker={true}
								/>
							</div>
							
							<!-- Leaderboards Grid -->
							<div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
								<!-- Fantasy Standings -->
								<FantasyLeaderboard 
									fantasyLeagueId={data.league.id}
									compact={false}
								/>
								
								<!-- Tournament Leaderboard -->
								<MasterLeaderboard 
									limit={10}
								/>
							</div>
						{:else}
							<div class="text-center py-8">
								<BarChart class="h-12 w-12 mx-auto mb-3 text-gray-300" />
								<p class="text-gray-600">Leaderboards will appear once tournaments are generated</p>
								<p class="text-sm text-gray-500 mt-1">
									Need {data.league.settings?.min_participants || 6} approved participants to start
								</p>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Pending Requests (Owner Only) -->
			{#if data.isOwner && data.pendingRequests?.length > 0}
				<Card.Root class="border-2 border-yellow-200 bg-white shadow-xl">
					<Card.Header>
						<Card.Title class="text-black flex items-center gap-2">
							<Clock class="h-5 w-5 text-yellow-600" />
							Pending Join Requests ({data.pendingRequests.length})
						</Card.Title>
						<Card.Description>Review and approve players who want to join</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#each data.pendingRequests as request}
								<div
									class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
								>
									<div class="flex items-center gap-3">
										<div class="h-10 w-10 rounded-full bg-[#2F91F6] flex items-center justify-center">
											<span class="text-white font-semibold">
												{request.expand?.user?.name?.[0]?.toUpperCase() || 'U'}
											</span>
										</div>
										<div>
											<p class="font-semibold text-black">
												{request.expand?.user?.name || request.expand?.user?.email || 'Unknown User'}
											</p>
											<p class="text-sm text-gray-600">
												{request.expand?.user?.email || ''}
											</p>
										</div>
									</div>
									<div class="flex gap-2">
										<form method="POST" action="?/approve" use:enhance>
											<input type="hidden" name="participantId" value={request.id} />
											<Button
												type="submit"
												size="sm"
												class="bg-green-600 hover:bg-green-700 text-white"
											>
												<Check class="h-4 w-4 mr-1" />
												Approve
											</Button>
										</form>
										<form method="POST" action="?/reject" use:enhance>
											<input type="hidden" name="participantId" value={request.id} />
											<Button
												type="submit"
												size="sm"
												variant="outline"
												class="border-red-300 text-red-600 hover:bg-red-50"
											>
												<X class="h-4 w-4 mr-1" />
												Reject
											</Button>
										</form>
									</div>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Approved Participants -->
			<Card.Root class="border-2 border-white bg-white shadow-xl">
				<Card.Header>
					<Card.Title class="text-black flex items-center gap-2">
						<Users class="h-5 w-5" />
						League Participants ({approvedParticipants.length})
					</Card.Title>
					<Card.Description>Players currently in this league</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if approvedParticipants.length > 0}
						<div class="space-y-3">
							{#each approvedParticipants as participant}
								<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
									<div class="h-10 w-10 rounded-full bg-black flex items-center justify-center">
										<span class="text-white font-semibold">
											{(participant.expand?.user?.name || participant.expand?.user?.email)?.[0]?.toUpperCase() || 'P'}
										</span>
									</div>
									<div class="flex-1">
										<p class="font-semibold text-black flex items-center gap-2">
											{participant.expand?.user?.name || participant.expand?.user?.email || 'Unknown User'}
											{#if participant.is_owner}
												<Crown class="h-4 w-4 text-yellow-600" />
											{/if}
										</p>
										<p class="text-sm text-gray-600">
											{participant.expand?.user?.email || ''}
										</p>
									</div>
									{#if participant.is_owner}
										<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
											Owner
										</span>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-gray-600 text-center py-8">No participants yet</p>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- League Info -->
			<Card.Root class="border-2 border-white bg-white shadow-xl">
				<Card.Header>
					<Card.Title class="text-black">League Info</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div>
						<p class="text-sm text-gray-600">Created</p>
						<p class="font-semibold text-black">
							{new Date(data.league.created).toLocaleDateString()}
						</p>
					</div>
					{#if data.league.season}
						<div>
							<p class="text-sm text-gray-600">Season</p>
							<p class="font-semibold text-black">{data.league.season} Season</p>
						</div>
					{/if}
					<div>
						<p class="text-sm text-gray-600">Tournaments</p>
						<p class="font-semibold text-black">{data.fantasyTournaments?.length || 0}</p>
					</div>
					{#if data.league.settings}
						<div>
							<p class="text-sm text-gray-600">Min Participants</p>
							<p class="font-semibold text-black">
								{data.participants?.length ?? 0} / {data.league.settings?.min_participants ?? 6}
							</p>
						</div>
						<div>
							<p class="text-sm text-gray-600">Draft Rounds</p>
							<p class="font-semibold text-black">{data.league.settings.rounds}</p>
						</div>
						<div>
							<p class="text-sm text-gray-600">Pick Timer</p>
							<p class="font-semibold text-black">{data.league.settings.start_pause_interval}s</p>
						</div>
					{/if}
					<div>
						<p class="text-sm text-gray-600">Status</p>
						{#if data.fantasyTournaments && data.fantasyTournaments.length > 0}
							<span class="inline-block px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded">
								Ready to Draft
							</span>
						{:else}
							<span class="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded">
								Filling ({data.participants?.length ?? 0}/{data.league.settings?.min_participants || 6})
							</span>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Standings Card with Tabs -->
			<Card.Root class="border-2 border-white bg-white shadow-xl">
				<Card.Header class="pb-2">
					<Card.Title class="text-black flex items-center gap-2">
						<Trophy class="w-5 h-5 text-yellow-500" />
						Standings
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<!-- Tab Buttons -->
					<div class="flex border-b border-gray-200 mb-4">
						<button
							type="button"
							class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {standingsTab === 'season' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
							onclick={() => standingsTab = 'season'}
						>
							Season
						</button>
						<button
							type="button"
							class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {standingsTab === 'tournament' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
							onclick={() => standingsTab = 'tournament'}
						>
							Tournament
						</button>
					</div>

					{#if standingsTab === 'season'}
						<!-- Season Standings -->
						{#if approvedParticipants.length > 0}
							<div class="space-y-2">
								{#each approvedParticipants.sort((a, b) => (b.total_points || 0) - (a.total_points || 0)) as participant, index}
									{@const isCurrentUser = participant.user === data.currentUser?.id}
									{@const rank = index + 1}
									<div class="flex items-center justify-between py-2 px-3 rounded-lg {isCurrentUser ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}">
										<div class="flex items-center gap-3">
											<span class="w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold
												{rank === 1 ? 'bg-yellow-400 text-yellow-900' : 
												 rank === 2 ? 'bg-gray-300 text-gray-700' : 
												 rank === 3 ? 'bg-amber-600 text-white' : 
												 'bg-gray-200 text-gray-600'}">
												{rank}
											</span>
											<div class="flex items-center gap-1">
												{#if participant.is_owner}
													<Crown class="w-4 h-4 text-yellow-500" />
												{/if}
												<span class="font-medium text-gray-900 {isCurrentUser ? 'text-blue-700' : ''}">
													{#if participant.expand?.user}
														{participant.expand.user.name || participant.expand.user.email?.split('@')[0] || 'Player'}
													{:else}
														Player {index + 1}
													{/if}
													{#if isCurrentUser}
														<span class="text-xs text-blue-500">(You)</span>
													{/if}
												</span>
											</div>
										</div>
										<span class="font-bold text-lg {(participant.total_points || 0) > 0 ? 'text-green-600' : 'text-gray-400'}">
											{participant.total_points || 0}
										</span>
									</div>
								{/each}
							</div>
							<p class="text-xs text-gray-400 mt-3 text-center">Points accumulated across all tournaments</p>
						{:else}
							<p class="text-gray-500 text-sm text-center py-4">No participants yet</p>
						{/if}
					{:else}
						<!-- Tournament Standings -->
						{#if data.fantasyTournaments && data.fantasyTournaments.length > 0}
							<div class="space-y-3">
								{#each data.fantasyTournaments as tournament}
									<div class="border border-gray-200 rounded-lg p-3">
										<h4 class="font-semibold text-gray-800 text-sm mb-2">{tournament.title || 'Tournament'}</h4>
										{#if tournament.expand?.fantasy_teams && tournament.expand.fantasy_teams.length > 0}
											<div class="space-y-1">
												{#each tournament.expand.fantasy_teams.sort((a, b) => (a.total_score || 0) - (b.total_score || 0)) as team, index}
													{@const isCurrentUser = team.user === data.currentUser?.id}
													<div class="flex items-center justify-between py-1 px-2 rounded text-sm {isCurrentUser ? 'bg-blue-50' : ''}">
														<div class="flex items-center gap-2">
															<span class="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold
																{index === 0 ? 'bg-yellow-400 text-yellow-900' : 
																 index === 1 ? 'bg-gray-300 text-gray-700' : 
																 index === 2 ? 'bg-amber-600 text-white' : 
																 'bg-gray-200 text-gray-600'}">
																{index + 1}
															</span>
															<span class="text-gray-700 {isCurrentUser ? 'font-medium text-blue-700' : ''}">
																{#if team.expand?.user}
																	{team.expand.user.name || team.expand.user.email?.split('@')[0] || 'Player'}
																{:else}
																	Player
																{/if}
															</span>
														</div>
														<span class="font-semibold {(team.total_score || 0) < 0 ? 'text-green-600' : (team.total_score || 0) > 0 ? 'text-red-500' : 'text-gray-600'}">
															{team.total_score === 0 ? 'E' : team.total_score > 0 ? `+${team.total_score}` : team.total_score}
														</span>
													</div>
												{/each}
											</div>
										{:else}
											<p class="text-gray-400 text-xs">No teams yet</p>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-gray-500 text-sm text-center py-4">No tournaments yet</p>
						{/if}
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Actions -->
			{#if data.isOwner}
				<Card.Root class="border-2 border-white bg-white shadow-xl">
					<Card.Header>
						<Card.Title class="text-black">Owner Actions</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3">
						{#if data.nextTournament}
							<a href="/fantasyleagues/{data.nextTournament.id}/draft">
								<Button class="w-full bg-green-600 hover:bg-green-700 text-white">
									Go to Draft
								</Button>
							</a>
						{:else if (data.participants?.length ?? 0) >= 6}
							<form method="POST" action="?/generateTournaments" use:enhance>
								<Button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white">
									Generate Tournaments
								</Button>
							</form>
						{:else}
							<Button class="w-full bg-gray-400 text-white" disabled>
								Need {6 - (data.participants?.length ?? 0)} more participants
							</Button>
						{/if}
						<Button variant="outline" class="w-full" disabled>
							League Settings
							<span class="text-xs ml-2">(Coming Soon)</span>
						</Button>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	</div>
</div>
