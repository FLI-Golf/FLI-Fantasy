<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { PageData, ActionData } from './$types';
	import type { DraftManagement } from '$lib/draft/draftManagement';
	import { getTimerRemaining, getAutoPick } from '$lib/draft/draftManagement';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Crown from '@lucide/svelte/icons/crown';
	import Users from '@lucide/svelte/icons/users';
	import Star from '@lucide/svelte/icons/star';
	import Check from '@lucide/svelte/icons/check';

	export let data: PageData;
	export let form: ActionData;

	$: draft = data.draftManagement as DraftManagement | null;
	$: isOwner = data.isOwner;
	$: currentUserId = data.currentUser?.id;
	$: isMyTurn = draft?.current_drafter === currentUserId;
	$: participants = data.participants || [];
	
	// Derive status from draft data (handles both old and new format)
	$: draftStatus = (() => {
		if (!draft) return 'not_initialized';
		// New format with status field
		if (draft.status) return draft.status;
		// Old format with draft_started/draft_completed
		const d = draft as any;
		if (d.draft_completed) return 'completed';
		if (d.draft_started) return 'in_progress';
		return 'pending';
	})();
	
	// Get rounds from fantasy_settings or draft
	$: totalRounds = (data as any).fantasySettings?.rounds || draft?.total_rounds || 4;
	$: totalPicks = totalRounds * 6; // 6 participants

	// Timer state
	let timerRemaining = 0;
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let selectedTimerDuration = 7;

	// Get participant display name
	function getParticipantName(userId: string): string {
		const participant = participants.find((p: any) => p.user === userId);
		return participant?.expand?.user?.name || participant?.expand?.user?.email || userId.slice(0, 8);
	}

	// Get available golfers for current drafter
	$: availableGolfers = (draft?.available_golfers ?? []).filter((g) => !g.drafted);

	// Get filtered golfers based on current round and team composition
	$: filteredGolfers = (() => {
		if (!draft || draft.status !== 'in_progress') return availableGolfers;

		const teamComp = draft.team_compositions[draft.current_drafter];
		if (!teamComp) return availableGolfers;

		let filtered = availableGolfers;

		// Apply gender filter for rounds 3-4
		if (draft.current_round >= 3) {
			const { male_count, female_count } = teamComp;
			if (male_count >= 2) {
				filtered = filtered.filter((g) => g.gender === 'female');
			} else if (female_count >= 2) {
				filtered = filtered.filter((g) => g.gender === 'male');
			}
		}

		// Sort by ranking
		return filtered.sort((a, b) => (a.ranking || 999) - (b.ranking || 999));
	})();

	// Recommended pick (best ranked from filtered)
	$: recommendedPick = filteredGolfers[0] || null;

	// Get timer duration from fantasy_settings or draft
	$: timerDurationMs = ((data.fantasySettings?.pick_duration_seconds || draft?.timer_duration || 7) * 1000);
	
	// Track when current pick started (for local timer)
	let pickStartTime: number | null = null;
	let lastDrafter: string | null = null;
	let isAutoPickInProgress = false;
	
	// Initialize timer when draft becomes in_progress or drafter changes
	$: if (draft && draftStatus === 'in_progress') {
		// Always use server time if available
		if (draft.timer_started_at) {
			const serverStart = new Date(draft.timer_started_at).getTime();
			const elapsed = Date.now() - serverStart;
			const remaining = Math.max(0, timerDurationMs - elapsed);
			
			// Only update if drafter changed or significant time difference
			if (draft.current_drafter !== lastDrafter) {
				console.log('🔄 Drafter changed to:', draft.current_drafter, 'Timer:', remaining);
				lastDrafter = draft.current_drafter;
				pickStartTime = Date.now();
				timerRemaining = remaining;
			}
		} else if (draft.current_drafter !== lastDrafter) {
			// No server time, use local timer
			console.log('🔄 Starting local timer for:', draft.current_drafter);
			pickStartTime = Date.now();
			lastDrafter = draft.current_drafter;
			timerRemaining = timerDurationMs;
		}
	}
	
	// Update timer
	function updateTimer() {
		if (draft && draftStatus === 'in_progress') {
			// If drafter changed, reset the pick start time
			if (draft.current_drafter !== lastDrafter) {
				pickStartTime = Date.now();
				lastDrafter = draft.current_drafter;
			}
			
			// Try to use draft's timer if available, otherwise use local timer
			if (draft.timer_started_at) {
				timerRemaining = getTimerRemaining(draft);
			} else if (pickStartTime) {
				const elapsed = Date.now() - pickStartTime;
				timerRemaining = Math.max(0, timerDurationMs - elapsed);
			}

			// Auto-pick if timer expired and it's someone's turn
			if (timerRemaining <= 0 && draft.current_drafter && !isAutoPickInProgress) {
				triggerAutoPick();
			}
		} else {
			timerRemaining = 0;
			pickStartTime = null;
		}
	}

	// Trigger auto-pick
	async function triggerAutoPick() {
		if (isAutoPickInProgress) return;
		
		isAutoPickInProgress = true;
		console.log('⏰ Timer expired, triggering auto-pick for:', draft?.current_drafter);
		
		try {
			const response = await fetch('?/autoPick', {
				method: 'POST',
				body: new FormData()
			});

			if (response.ok) {
				console.log('✅ Auto-pick successful, refreshing data...');
				// Reset timer tracking for next pick
				pickStartTime = null;
				lastDrafter = null;
				await invalidateAll();
			} else {
				console.error('❌ Auto-pick failed:', response.status);
			}
		} catch (error) {
			console.error('❌ Auto-pick error:', error);
		} finally {
			isAutoPickInProgress = false;
		}
	}

	// Format time display
	function formatTime(ms: number): string {
		const seconds = Math.ceil(ms / 1000);
		return `${seconds}s`;
	}

	// Start timer interval
	onMount(() => {
		// Initialize pickStartTime if draft is in progress and we don't have timer_started_at
		if (draft && draftStatus === 'in_progress' && !draft.timer_started_at) {
			pickStartTime = Date.now();
			lastDrafter = draft.current_drafter;
		}
		
		timerInterval = setInterval(updateTimer, 100);
		updateTimer();
	});

	onDestroy(() => {
		if (timerInterval) {
			clearInterval(timerInterval);
		}
	});

	// Refresh data periodically for real-time updates
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		refreshInterval = setInterval(() => {
			if (draftStatus === 'in_progress') {
				invalidateAll();
			}
		}, 2000);
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});
</script>

<svelte:head>
	<title>Draft - {data.league?.title || 'Fantasy League'}</title>
</svelte:head>

<div class="container mx-auto p-4 max-w-7xl">
	<!-- Header -->
	<div class="mb-6">
		<a href="/fantasyleagues/{data.league?.id}" class="text-blue-500 hover:underline mb-2 inline-block">
			← Back to League
		</a>
		<h1 class="text-3xl font-bold">{data.tournamentName || 'Draft'}</h1>
		<p class="text-gray-600">{data.league?.title}</p>
	</div>

	<!-- Error Display -->
	{#if form?.error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
			{form.error}
		</div>
	{/if}

	{#if data.error}
		<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
			{data.error}
		</div>
	{/if}

	{#if !draft}
		<!-- Draft Not Initialized -->
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title>Initialize Draft</Card.Title>
				<Card.Description>Set up the draft before starting</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if isOwner}
					<form method="POST" action="?/initDraft" use:enhance>
						<div class="mb-4">
							<label class="block text-sm font-medium mb-2">Timer Duration (seconds)</label>
							<select
								name="timerDuration"
								bind:value={selectedTimerDuration}
								class="w-full p-2 border rounded"
							>
								<option value={7}>7 seconds</option>
								<option value={15}>15 seconds</option>
								<option value={30}>30 seconds</option>
								<option value={45}>45 seconds</option>
							</select>
						</div>

						<div class="mb-4">
							<p class="text-sm text-gray-600">
								Participants: {participants.length}/6
							</p>
							<p class="text-sm text-gray-600">
								Golfers: {data.golfers?.length || 0}/24
							</p>
						</div>

						<Button type="submit" disabled={participants.length !== 6}>
							Initialize Draft
						</Button>
					</form>
				{:else}
					<p class="text-gray-600">Waiting for league owner to initialize the draft...</p>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Draft Status Bar with Controls -->
		<Card.Root class="mb-6">
			<Card.Content class="py-4">
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div class="flex items-center gap-4">
						<span
							class="px-3 py-1 rounded-full text-sm font-medium
							{draftStatus === 'pending' ? 'bg-gray-200 text-gray-800' : ''}
							{draftStatus === 'in_progress' ? 'bg-green-200 text-green-800' : ''}
							{draftStatus === 'paused' ? 'bg-yellow-200 text-yellow-800' : ''}
							{draftStatus === 'completed' ? 'bg-blue-200 text-blue-800' : ''}"
						>
							{draftStatus.replace('_', ' ').toUpperCase()}
						</span>

						<span class="text-sm">
							Round {draft?.current_round || 1}/{totalRounds} • Pick {(draft?.pick_history?.length || 0) + 1}/{totalPicks}
						</span>
						
						<span class="text-sm text-gray-500">
							({data.fantasySettings?.pick_duration_seconds || 30}s per pick)
						</span>
					</div>

					<!-- Owner Controls -->
					{#if isOwner}
						<div class="flex gap-2">
							{#if draftStatus === 'pending'}
								<form method="POST" action="?/startDraft" use:enhance>
									<Button type="submit" variant="default">Start Draft</Button>
								</form>
							{/if}

							{#if draftStatus === 'in_progress'}
								<form method="POST" action="?/pauseDraft" use:enhance>
									<Button type="submit" variant="outline">Pause</Button>
								</form>
							{/if}

							{#if draftStatus === 'paused'}
								<form method="POST" action="?/resumeDraft" use:enhance>
									<Button type="submit" variant="default">Resume</Button>
								</form>
							{/if}

							{#if (draft?.pick_history?.length ?? 0) > 0 && draftStatus !== 'in_progress'}
								<form method="POST" action="?/undoPick" use:enhance>
									<Button type="submit" variant="outline">Undo Last Pick</Button>
								</form>
							{/if}

							<form method="POST" action="?/resetDraft" use:enhance>
								<Button type="submit" variant="destructive">
									{draftStatus === 'completed' ? 'Reset Completed Draft' : 'Reset Draft'}
								</Button>
							</form>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- On the Clock / Next Up Section (when draft is active) -->
		{#if draftStatus === 'in_progress' || draftStatus === 'paused'}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
				<!-- On the Clock -->
				<Card.Root class="border-2 {isMyTurn ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}">
					<Card.Header class="pb-2">
						<Card.Title class="flex items-center gap-2 text-lg">
							<span class="relative flex h-3 w-3">
								<span class="animate-ping absolute inline-flex h-full w-full rounded-full {isMyTurn ? 'bg-green-400' : 'bg-red-400'} opacity-75"></span>
								<span class="relative inline-flex rounded-full h-3 w-3 {isMyTurn ? 'bg-green-500' : 'bg-red-500'}"></span>
							</span>
							ON THE CLOCK
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="text-center">
							<p class="text-2xl font-bold {isMyTurn ? 'text-green-700' : 'text-gray-900'}">
								{isMyTurn ? 'YOU' : getParticipantName(draft?.current_drafter || '')}
							</p>
							{#if draftStatus === 'in_progress'}
								<p class="text-5xl font-mono font-bold mt-2 {timerRemaining < 10000 ? 'text-red-600 animate-pulse' : 'text-gray-700'}">
									{formatTime(timerRemaining)}
								</p>
							{:else}
								<p class="text-lg text-yellow-600 mt-2">PAUSED</p>
							{/if}
							{#if recommendedPick}
								<p class="text-sm text-gray-600 mt-3">
									Auto-pick if time expires: <span class="font-semibold">{recommendedPick.name}</span>
								</p>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Recommended Pick -->
				<Card.Root class="border-2 border-green-300 bg-green-50">
					<Card.Header class="pb-2">
						<Card.Title class="text-lg text-green-700">RECOMMENDED PICK</Card.Title>
					</Card.Header>
					<Card.Content>
						{#if recommendedPick}
							<div class="text-center">
								<p class="text-2xl font-bold text-gray-900">{recommendedPick.name}</p>
								<p class="text-sm text-gray-600 mt-1">
									Rank #{recommendedPick.ranking} • {recommendedPick.gender === 'male' ? '♂ Male' : '♀ Female'}
								</p>
								{#if isMyTurn && draftStatus === 'in_progress'}
									<form method="POST" action="?/makePick" use:enhance class="mt-4">
										<input type="hidden" name="golferId" value={recommendedPick.id} />
										<Button type="submit" size="lg" class="w-full">
											Pick {recommendedPick.name}
										</Button>
									</form>
								{/if}
							</div>
						{:else}
							<p class="text-gray-500 text-center">No recommendation available</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		{/if}

		<!-- Draft Order (horizontal layout) -->
		<Card.Root class="mb-6">
			<Card.Header class="pb-2">
				<Card.Title class="flex items-center gap-4">
					<span>Draft Order</span>
					{#if draft && draftStatus === 'in_progress'}
						<span class="text-sm font-normal text-gray-500">
							Round {draft.current_round}/4 • Pick {draft.current_pick + 1}/6 • 
							{draft.current_direction === 'down' ? '→ Forward' : '← Reverse'}
						</span>
					{/if}
				</Card.Title>
			</Card.Header>
			<Card.Content>
				{@const draftOrder = draft?.draft_order || data.draftOrder || []}
				{@const currentRound = draft?.current_round || 1}
				{@const currentPick = draft?.current_pick || 0}
				{@const direction = draft?.current_direction || 'down'}
				{@const nextPick = currentPick + 1 >= 6 ? 0 : currentPick + 1}
				{@const nextRound = currentPick + 1 >= 6 ? currentRound + 1 : currentRound}
				{@const nextDirection = nextRound % 2 === 1 ? 'down' : 'up'}
				{@const nextDrafterIndex = nextDirection === 'down' ? nextPick : 5 - nextPick}
				{@const nextDrafterId = nextRound <= 4 ? draftOrder[nextDrafterIndex] : null}
				<div class="flex flex-wrap gap-2">
					{#each draftOrder as oderId, index (oderId)}
						{@const teamComp = draft?.team_compositions?.[oderId]}
						{@const isOnClock = oderId === draft?.current_drafter && draftStatus === 'in_progress'}
						{@const isUpNext = oderId === nextDrafterId && draftStatus === 'in_progress' && !isOnClock}
						<div
							class="flex flex-col items-center px-3 py-2 rounded-lg text-sm
							{isOnClock ? 'bg-green-100 border-2 border-green-500' : isUpNext ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-100'}
							{oderId === currentUserId ? 'font-bold' : ''}"
						>
							<span class="font-medium">
								{index + 1}. {getParticipantName(oderId)}
								{oderId === currentUserId ? '(You)' : ''}
							</span>
							<span class="text-xs text-gray-500">
								{teamComp?.total_picks || 0}/4
							</span>
							{#if isOnClock}
								<span class="text-xs text-green-600 font-semibold mt-1">On the clock</span>
							{:else if isUpNext}
								<span class="text-xs text-blue-600 font-semibold mt-1">Up next</span>
							{/if}
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Available Golfers -->
			<div class="lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>
							Available Golfers ({filteredGolfers.length})
							{#if (draft?.current_round ?? 1) >= 3}
								<span class="text-sm font-normal text-gray-500">
									(Filtered for gender balance)
								</span>
							{/if}
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
							{#each filteredGolfers as golfer (golfer.id)}
								<div
									class="flex items-center justify-between p-3 border rounded hover:bg-gray-50
									{golfer.id === recommendedPick?.id ? 'border-green-500 bg-green-50' : ''}"
								>
									<div>
										<span class="font-medium">{golfer.name}</span>
										<span class="text-sm text-gray-500 ml-2">
											#{golfer.ranking} • {golfer.gender === 'male' ? '♂' : '♀'}
										</span>
									</div>

									{#if draftStatus === 'in_progress'}
										<form method="POST" action="?/makePick" use:enhance>
											<input type="hidden" name="golferId" value={golfer.id} />
											<Button 
												type="submit" 
												size="sm" 
												variant={golfer.id === recommendedPick?.id ? 'default' : 'outline'}
												disabled={!isMyTurn}
											>
												Pick
											</Button>
										</form>
									{/if}
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Recent Picks -->
			<div class="space-y-6">
				<Card.Root>
					<Card.Header>
						<Card.Title>Recent Picks</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2 max-h-64 overflow-y-auto">
							{#each [...(draft?.pick_history || [])].reverse().slice(0, 10) as pick (pick.pick_number)}
								<div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
									<span>
										#{pick.pick_number} - {pick.golfer_name}
										{pick.was_auto_pick ? '(Auto)' : ''}
									</span>
									<span class="text-gray-500">
										{getParticipantName(pick.user_id)}
									</span>
								</div>
							{/each}

							{#if (draft?.pick_history?.length ?? 0) === 0}
								<p class="text-gray-500 text-sm">No picks yet</p>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<!-- Completed Draft Summary -->
		{#if draftStatus === 'completed'}
			<Card.Root class="mt-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white shadow-xl">
				<Card.Header class="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
					<div class="flex items-center gap-3">
						<div class="p-2 bg-white/20 rounded-full">
							<Trophy class="h-6 w-6" />
						</div>
						<div>
							<Card.Title class="text-white text-xl">Draft Complete!</Card.Title>
							<Card.Description class="text-green-100">All teams have been drafted successfully</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="pt-6">
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each draft?.draft_order || [] as oderId, teamIndex (oderId)}
							{@const teamComp = draft?.team_compositions?.[oderId]}
							{@const isCurrentUser = oderId === currentUserId}
							{@const maleCount = teamComp?.male_count || 0}
							{@const femaleCount = teamComp?.female_count || 0}
							<div class="rounded-xl overflow-hidden shadow-lg border-2 {isCurrentUser ? 'border-[#2F91F6] ring-2 ring-[#2F91F6]/30' : 'border-gray-200'}">
								<!-- Team Header -->
								<div class="px-4 py-3 {isCurrentUser ? 'bg-[#2F91F6]' : 'bg-gray-800'} text-white">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											{#if teamIndex === 0}
												<Crown class="h-5 w-5 text-yellow-400" />
											{:else}
												<Users class="h-5 w-5 text-gray-300" />
											{/if}
											<h3 class="font-bold">
												{getParticipantName(oderId)}
												{isCurrentUser ? '(You)' : ''}
											</h3>
										</div>
										<div class="flex items-center gap-1 text-xs">
											<span class="bg-blue-500 px-2 py-0.5 rounded">{maleCount}♂</span>
											<span class="bg-pink-500 px-2 py-0.5 rounded">{femaleCount}♀</span>
										</div>
									</div>
								</div>
								<!-- Golfers List -->
								<div class="bg-white divide-y divide-gray-100">
									{#each teamComp?.fantasy_team || [] as golfer, golferIndex (golfer.id)}
										{@const isMale = golfer.gender === 'male'}
										<div class="px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors">
											<div class="flex items-center gap-2">
												<span class="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold {isMale ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}">
													{golferIndex + 1}
												</span>
												<span class="font-medium text-gray-900">{golfer.name}</span>
											</div>
											<div class="flex items-center gap-2">
												<span class="text-xs font-semibold px-2 py-1 rounded {golfer.ranking <= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}">
													#{golfer.ranking}
												</span>
												<span class="text-lg {isMale ? 'text-blue-500' : 'text-pink-500'}">
													{isMale ? '♂' : '♀'}
												</span>
											</div>
										</div>
									{/each}
								</div>
								<!-- Team Footer -->
								<div class="px-4 py-2 bg-gray-50 border-t border-gray-200">
									<div class="flex items-center justify-between text-xs text-gray-500">
										<span>{teamComp?.total_picks || 0} golfers drafted</span>
										<Check class="h-4 w-4 text-green-500" />
									</div>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>
