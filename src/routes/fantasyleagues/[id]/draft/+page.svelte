<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { PageData, ActionData } from './$types';
	import type { DraftManagement } from '$lib/draft/draftManagement';
	import { getTimerRemaining, getAutoPick } from '$lib/draft/draftManagement';

	export let data: PageData;
	export let form: ActionData;

	$: draft = data.draftManagement as DraftManagement | null;
	$: isOwner = data.isOwner;
	$: currentUserId = data.currentUser?.id;
	$: isMyTurn = draft?.current_drafter === currentUserId;
	$: participants = data.participants || [];

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
	$: availableGolfers = draft?.available_golfers.filter((g) => !g.drafted) || [];

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

	// Update timer
	function updateTimer() {
		if (draft && draft.status === 'in_progress') {
			timerRemaining = getTimerRemaining(draft);

			// Auto-pick if timer expired and it's someone's turn
			if (timerRemaining <= 0 && draft.current_drafter) {
				triggerAutoPick();
			}
		} else {
			timerRemaining = 0;
		}
	}

	// Trigger auto-pick
	async function triggerAutoPick() {
		if (!data.tournamentId) return;

		const formData = new FormData();
		formData.append('tournamentId', data.tournamentId);

		try {
			const response = await fetch('?/autoPick', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				await invalidateAll();
			}
		} catch (error) {
			console.error('Auto-pick failed:', error);
		}
	}

	// Format time display
	function formatTime(ms: number): string {
		const seconds = Math.ceil(ms / 1000);
		return `${seconds}s`;
	}

	// Start timer interval
	onMount(() => {
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
			if (draft?.status === 'in_progress') {
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
					<form method="POST" action="?/initDraft" use:enhance={() => {
						console.log('🎯 Form submitting - initDraft');
						console.log('Tournament ID:', data.tournamentId);
						return async ({ result, update }) => {
							console.log('📋 Form result:', result);
							await update();
						};
					}}>
						<input type="hidden" name="tournamentId" value={data.tournamentId} />

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
							<p class="text-sm text-gray-600">
								Tournament ID: {data.tournamentId || 'MISSING'}
							</p>
						</div>

						<Button type="submit" disabled={participants.length !== 6 || !data.tournamentId}>
							Initialize Draft
						</Button>
						
						{#if !data.tournamentId}
							<p class="text-red-500 text-sm mt-2">Error: No tournament ID available</p>
						{/if}
					</form>
				{:else}
					<p class="text-gray-600">Waiting for league owner to initialize the draft...</p>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Draft Status Bar -->
		<Card.Root class="mb-6">
			<Card.Content class="py-4">
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div class="flex items-center gap-4">
						<span
							class="px-3 py-1 rounded-full text-sm font-medium
							{draft.status === 'pending' ? 'bg-gray-200 text-gray-800' : ''}
							{draft.status === 'in_progress' ? 'bg-green-200 text-green-800' : ''}
							{draft.status === 'paused' ? 'bg-yellow-200 text-yellow-800' : ''}
							{draft.status === 'completed' ? 'bg-blue-200 text-blue-800' : ''}"
						>
							{draft.status.replace('_', ' ').toUpperCase()}
						</span>

						<span class="text-sm">
							Round {draft.current_round}/4 • Pick {draft.pick_history.length + 1}/24
						</span>
					</div>

					{#if draft.status === 'in_progress'}
						<div class="flex items-center gap-2">
							<span class="text-2xl font-mono font-bold {timerRemaining < 3000 ? 'text-red-600' : ''}">
								{formatTime(timerRemaining)}
							</span>
						</div>
					{/if}

					<!-- Owner Controls -->
					{#if isOwner}
						<div class="flex gap-2">
							{#if draft.status === 'pending'}
								<form method="POST" action="?/startDraft" use:enhance>
									<input type="hidden" name="tournamentId" value={data.tournamentId} />
									<Button type="submit" variant="default">Start Draft</Button>
								</form>
							{/if}

							{#if draft.status === 'in_progress'}
								<form method="POST" action="?/pauseDraft" use:enhance>
									<input type="hidden" name="tournamentId" value={data.tournamentId} />
									<Button type="submit" variant="outline">Pause</Button>
								</form>
							{/if}

							{#if draft.status === 'paused'}
								<form method="POST" action="?/resumeDraft" use:enhance>
									<input type="hidden" name="tournamentId" value={data.tournamentId} />
									<Button type="submit" variant="default">Resume</Button>
								</form>
							{/if}

							{#if draft.pick_history.length > 0 && draft.status !== 'in_progress'}
								<form method="POST" action="?/undoPick" use:enhance>
									<input type="hidden" name="tournamentId" value={data.tournamentId} />
									<Button type="submit" variant="outline">Undo Last Pick</Button>
								</form>
							{/if}

							{#if draft.status !== 'completed'}
								<form method="POST" action="?/resetDraft" use:enhance>
									<input type="hidden" name="tournamentId" value={data.tournamentId} />
									<Button type="submit" variant="destructive">Reset Draft</Button>
								</form>
							{/if}
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Current Drafter -->
		{#if draft.status === 'in_progress' || draft.status === 'paused'}
			<Card.Root class="mb-6 {isMyTurn ? 'border-green-500 border-2' : ''}">
				<Card.Header>
					<Card.Title>
						{#if isMyTurn}
							Your Turn to Pick!
						{:else}
							Waiting for {getParticipantName(draft.current_drafter)}
						{/if}
					</Card.Title>
					{#if recommendedPick}
						<Card.Description>
							Recommended: {recommendedPick.name} (Rank #{recommendedPick.ranking}, {recommendedPick.gender})
						</Card.Description>
					{/if}
				</Card.Header>
			</Card.Root>
		{/if}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Available Golfers -->
			<div class="lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>
							Available Golfers ({filteredGolfers.length})
							{#if draft.current_round >= 3}
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

									{#if isMyTurn && draft.status === 'in_progress'}
										<form method="POST" action="?/makePick" use:enhance>
											<input type="hidden" name="tournamentId" value={data.tournamentId} />
											<input type="hidden" name="golferId" value={golfer.id} />
											<Button type="submit" size="sm" variant={golfer.id === recommendedPick?.id ? 'default' : 'outline'}>
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

			<!-- Teams & Pick History -->
			<div class="space-y-6">
				<!-- Draft Order -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Draft Order</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2">
							{#each draft.draft_order as userId, index (userId)}
								{@const teamComp = draft.team_compositions[userId]}
								<div
									class="flex items-center justify-between p-2 rounded
									{userId === draft.current_drafter && draft.status === 'in_progress' ? 'bg-green-100 border border-green-500' : 'bg-gray-50'}
									{userId === currentUserId ? 'font-bold' : ''}"
								>
									<span>
										{index + 1}. {getParticipantName(userId)}
										{userId === currentUserId ? '(You)' : ''}
									</span>
									<span class="text-sm text-gray-500">
										{teamComp?.total_picks || 0}/4
										({teamComp?.male_count || 0}M, {teamComp?.female_count || 0}F)
									</span>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Recent Picks -->
				<Card.Root>
					<Card.Header>
						<Card.Title>Recent Picks</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2 max-h-64 overflow-y-auto">
							{#each [...draft.pick_history].reverse().slice(0, 10) as pick (pick.pick_number)}
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

							{#if draft.pick_history.length === 0}
								<p class="text-gray-500 text-sm">No picks yet</p>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<!-- Completed Draft Summary -->
		{#if draft.status === 'completed'}
			<Card.Root class="mt-6">
				<Card.Header>
					<Card.Title>Draft Complete!</Card.Title>
					<Card.Description>All teams have been drafted</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each draft.draft_order as userId (userId)}
							{@const teamComp = draft.team_compositions[userId]}
							<div class="border rounded p-4">
								<h3 class="font-bold mb-2">
									{getParticipantName(userId)}
									{userId === currentUserId ? '(You)' : ''}
								</h3>
								<div class="space-y-1">
									{#each teamComp?.fantasy_team || [] as golfer (golfer.id)}
										<div class="text-sm flex justify-between">
											<span>{golfer.name}</span>
											<span class="text-gray-500">#{golfer.ranking} {golfer.gender === 'male' ? '♂' : '♀'}</span>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}
</div>
