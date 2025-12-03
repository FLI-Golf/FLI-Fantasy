<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { pb } from '$lib/pocketbase';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Play from '@lucide/svelte/icons/play';
	import Calendar from '@lucide/svelte/icons/calendar';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	let tournament = $state<any>(null);
	let groups = $state<any[]>([]);
	let course = $state<any>(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');

	let roundDate = $state(new Date().toISOString().split('T')[0]);
	let roundNumber = $state(1);

	// Group assignments
	let groupAssignments = $state<any[]>([]);

	async function loadData() {
		try {
			loading = true;
			const tournamentId = $page.params.id;

			// Load tournament with course
			tournament = await pb.collection('tournaments').getOne(tournamentId, {
				expand: 'course.holes'
			});

			// Load course if exists
			if (tournament.course) {
				course = tournament.expand?.course;
			}

			// Load all groups
			const allGroups = await pb.collection('groups').getFullList({
				sort: 'created',
				expand: 'teams'
			});
			groups = allGroups;

			// Initialize group assignments based on start format
			initializeGroupAssignments();
		} catch (err: any) {
			console.error('Error loading data:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function initializeGroupAssignments() {
		const startFormat = tournament.start_format || 'tee_time';
		const firstTeeTime = tournament.first_tee_time || '10:00';
		const interval = tournament.tee_time_interval || 10;

		groupAssignments = groups.slice(0, 6).map((group, index) => {
			let startTime = firstTeeTime;
			let startingHole = 1;

			if (startFormat === 'shotgun') {
				// Shotgun: all groups start at same time, different holes
				startingHole = index + 1;
			} else {
				// Tee time: calculate start time based on interval
				const [hours, minutes] = firstTeeTime.split(':').map(Number);
				const totalMinutes = hours * 60 + minutes + (index * interval);
				const teeHours = Math.floor(totalMinutes / 60) % 24;
				const teeMinutes = totalMinutes % 60;
				startTime = `${String(teeHours).padStart(2, '0')}:${String(teeMinutes).padStart(2, '0')}`;
			}

			return {
				group: group,
				startingHole,
				startTime
			};
		});
	}

	async function handleStartRound(e: Event) {
		e.preventDefault();
		error = '';
		saving = true;

		try {
			const tournamentId = $page.params.id;

			// Create tournament round
			const round = await pb.collection('tournament_rounds').create({
				tournament: tournamentId,
				round_number: roundNumber,
				date: roundDate,
				is_completed: false
			});

			console.log('Created round:', round);

			// Update each group with round assignment
			for (const assignment of groupAssignments) {
				await pb.collection('groups').update(assignment.group.id, {
					tournament_round: round.id,
					starting_hole: assignment.startingHole,
					start_time: assignment.startTime
				});
			}

			// Redirect to tournament view or rounds management
			goto(`/admin/tournaments/${tournamentId}`);
		} catch (err: any) {
			console.error('Error starting round:', err);
			error = err.message;
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		await loadData();
	});
</script>

<div class="max-w-6xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<Button
			variant="outline"
			onclick={() => goto(`/admin/tournaments/${$page.params.id}`)}
			class="mb-4"
		>
			<ArrowLeft class="h-4 w-4 mr-2" />
			Back to Tournament
		</Button>
		<h1 class="text-4xl font-bold text-white mb-2">Start Tournament Round</h1>
		<p class="text-gray-300">Assign groups to starting holes and times</p>
		{#if tournament}
			<p class="text-gray-400 mt-2">Tournament: {tournament.name}</p>
		{/if}
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-pulse text-white text-xl">Loading tournament...</div>
		</div>
	{:else if error && !tournament}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
			<p class="font-bold">Error</p>
			<p>{error}</p>
		</div>
	{:else}
		<form onsubmit={handleStartRound} class="space-y-6">
			<!-- Round Details -->
			<div class="bg-white rounded-xl p-6 shadow-lg">
				<h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
					<Calendar class="h-5 w-5" />
					Round Details
				</h2>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="roundNumber" class="text-black">Round Number</Label>
						<Input
							id="roundNumber"
							type="number"
							bind:value={roundNumber}
							min="1"
							max="10"
							required
							class="bg-white border-gray-300 text-black"
						/>
					</div>

					<div class="space-y-2">
						<Label for="roundDate" class="text-black">Date</Label>
						<Input
							id="roundDate"
							type="date"
							bind:value={roundDate}
							required
							class="bg-white border-gray-300 text-black"
						/>
					</div>
				</div>

				{#if course}
					<div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
						<p class="text-sm text-blue-900">
							<span class="font-semibold">Course:</span> {course.name}
							<span class="ml-4">
								<span class="font-semibold">Holes:</span> {course.expand?.holes?.length || 0}
							</span>
						</p>
					</div>
				{:else}
					<div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
						<p class="text-sm text-yellow-900">
							⚠️ No course assigned to this tournament. Please edit the tournament to select a course.
						</p>
					</div>
				{/if}
			</div>

			<!-- Group Assignments -->
			<div class="bg-white rounded-xl p-6 shadow-lg">
				<h2 class="text-xl font-bold text-gray-900 mb-4">Group Assignments</h2>

				<div class="mb-4 p-3 bg-gray-50 rounded-md">
					<p class="text-sm text-gray-700">
						<span class="font-semibold">Start Format:</span> 
						{tournament.start_format === 'shotgun' ? 'Shotgun Start' : 'Tee Time Intervals'}
					</p>
					{#if tournament.start_format === 'tee_time'}
						<p class="text-sm text-gray-700 mt-1">
							<span class="font-semibold">Interval:</span> {tournament.tee_time_interval} minutes
						</p>
					{/if}
				</div>

				{#if groupAssignments.length === 0}
					<div class="text-center py-8 text-gray-500">
						<p>No groups available. Please create groups first.</p>
					</div>
				{:else}
					<div class="space-y-3">
						{#each groupAssignments as assignment, i}
							<div class="border border-gray-200 rounded-lg p-4">
								<div class="flex items-center justify-between mb-3">
									<h3 class="font-semibold text-gray-900">Group {i + 1}</h3>
									<span class="text-sm text-gray-600">
										{assignment.group.expand?.teams?.length || 0} teams
									</span>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div class="space-y-2">
										<Label for={`hole-${i}`} class="text-black text-sm">Starting Hole</Label>
										<Input
											id={`hole-${i}`}
											type="number"
											bind:value={assignment.startingHole}
											min="1"
											max={course?.expand?.holes?.length || 9}
											required
											class="bg-white border-gray-300 text-black"
										/>
									</div>

									<div class="space-y-2">
										<Label for={`time-${i}`} class="text-black text-sm">Start Time</Label>
										<Input
											id={`time-${i}`}
											type="time"
											bind:value={assignment.startTime}
											required
											class="bg-white border-gray-300 text-black"
										/>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			{#if error}
				<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					<p>{error}</p>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					onclick={() => goto(`/admin/tournaments/${$page.params.id}`)}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={saving || groupAssignments.length === 0}
					class="bg-green-600 hover:bg-green-700 text-white"
				>
					{#if saving}
						<span class="flex items-center gap-2">
							<span class="animate-spin">⏳</span>
							Starting Round...
						</span>
					{:else}
						<span class="flex items-center gap-2">
							<Play class="h-4 w-4" />
							Start Round
						</span>
					{/if}
				</Button>
			</div>
		</form>
	{/if}
</div>
