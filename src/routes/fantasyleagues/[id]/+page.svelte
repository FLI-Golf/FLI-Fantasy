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
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const approvedParticipants = $derived(
		data.participants.filter((p) => p.status === 'approved')
	);

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
					};
				}}
			>
				<button 
					type="submit" 
					class="w-full md:w-auto px-12 py-8 bg-gradient-to-br from-green-500 via-emerald-600 to-green-700 hover:from-emerald-600 hover:via-green-600 hover:to-emerald-700 text-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-105 border-2 border-green-400"
				>
					<div class="flex flex-col items-center gap-3">
						<GitBranch class="h-12 w-12 animate-pulse" />
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
					<Check class="h-4 w-4" />
					{#if form.action === 'approved'}
						Participant approved successfully!
					{:else if form.action === 'rejected'}
						Request rejected.
					{:else if form.action === 'requested'}
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
								<div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
									<div class="flex items-start justify-between mb-2">
										<div>
											<h4 class="font-semibold text-black">
												{fantasyTournament.name || 'Tournament'}
											</h4>
											<p class="text-sm text-gray-600">
												{fantasyTournament.draft_order?.length || 0} participants
											</p>
										</div>
										<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
											Ready
										</span>
									</div>
									{#if fantasyTournament.draft_order}
										<div class="mt-3 pt-3 border-t border-gray-200">
											<p class="text-xs text-gray-600 mb-2">Draft Order:</p>
											<div class="flex flex-wrap gap-2">
												{#each fantasyTournament.draft_order as userId, index}
													<span class="px-2 py-1 bg-[#2F91F6] text-white text-xs font-semibold rounded">
														{index + 1}. {userId === data.currentUser?.id ? 'You' : 'Player'}
													</span>
												{/each}
											</div>
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
							Current: {data.participants.length} / {data.league.settings?.min_participants || 6}
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

			<!-- Pending Requests (Owner Only) -->
			{#if data.isOwner && data.pendingRequests.length > 0}
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
												{request.expand?.user?.name || 'Unknown User'}
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
											{participant.expand?.user?.name?.[0]?.toUpperCase() || 'U'}
										</span>
									</div>
									<div class="flex-1">
										<p class="font-semibold text-black flex items-center gap-2">
											{participant.expand?.user?.name || 'Unknown User'}
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
								{data.participants.length} / {data.league.settings.min_participants}
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
								Filling ({data.participants.length}/{data.league.settings?.min_participants || 6})
							</span>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Actions -->
			{#if data.isOwner}
				<Card.Root class="border-2 border-white bg-white shadow-xl">
					<Card.Header>
						<Card.Title class="text-black">Owner Actions</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3">
						<Button class="w-full bg-black hover:bg-gray-800 text-white" disabled>
							Start Draft
							<span class="text-xs ml-2">(Coming Soon)</span>
						</Button>
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
