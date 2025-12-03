<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { currentUser, pb } from '$lib/pocketbase';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import Save from '@lucide/svelte/icons/save';
	import Users from '@lucide/svelte/icons/users';

	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let myGroup = $state<any>(null);
	let tournamentRound = $state<any>(null);
	let course = $state<any>(null);
	let golfers = $state<any[]>([]);
	let scores = $state<any>({});

	async function loadMyAssignment() {
		try {
			loading = true;

			if (!$currentUser) {
				goto('/');
				return;
			}

			// Find groups assigned to this scorekeeper via pairing_assigment
			const pairings = await pb.collection('pairing_assigment').getFullList({
				filter: `scorekeeper = "${$currentUser.id}"`,
				expand: 'group.teams.golfers,group.tournament_round.tournament.course.holes'
			});

			if (pairings.length === 0) {
				error = 'No group assigned to you yet.';
				loading = false;
				return;
			}

			// Get the first pairing (assuming one active assignment)
			const pairing = pairings[0];
			myGroup = pairing.expand?.group;

			if (!myGroup) {
				error = 'Group data not found.';
				loading = false;
				return;
			}

			// Get tournament round
			tournamentRound = myGroup.expand?.tournament_round;
			
			if (!tournamentRound) {
				error = 'No active tournament round for your group.';
				loading = false;
				return;
			}

			// Get course
			course = tournamentRound.expand?.tournament?.expand?.course;

			// Get all golfers from teams in this group
			if (myGroup.expand?.teams) {
				const teams = Array.isArray(myGroup.expand.teams) 
					? myGroup.expand.teams 
					: [myGroup.expand.teams];
				
				golfers = teams.flatMap((team: any) => {
					const teamGolfers = team.expand?.golfers;
					return Array.isArray(teamGolfers) ? teamGolfers : (teamGolfers ? [teamGolfers] : []);
				});
			}

			// Load existing scores
			await loadExistingScores();

		} catch (err: any) {
			console.error('Error loading assignment:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadExistingScores() {
		try {
			// Load scores for this round and these golfers
			const golferIds = golfers.map(g => g.id);
			
			if (golferIds.length === 0) return;

			const existingScores = await pb.collection('golfer_scores').getFullList({
				filter: `tournament_rounds = "${tournamentRound.id}" && (${golferIds.map(id => `golfer = "${id}"`).join(' || ')})`,
				expand: 'golfer'
			});

			// Organize scores by golfer
			scores = {};
			existingScores.forEach((score: any) => {
				if (!scores[score.golfer]) {
					scores[score.golfer] = {};
				}
				scores[score.golfer] = {
					id: score.id,
					score: score.score,
					total_strokes: score.total_strokes,
					position: score.position,
					is_cut: score.is_cut
				};
			});
		} catch (err: any) {
			console.error('Error loading scores:', err);
		}
	}

	async function handleSaveScores(e: Event) {
		e.preventDefault();
		error = '';
		saving = true;

		try {
			for (const golfer of golfers) {
				const golferScore = scores[golfer.id] || {};
				const scoreData = {
					tournament_rounds: tournamentRound.id,
					golfer: golfer.id,
					score: golferScore.score || 0,
					total_strokes: golferScore.total_strokes || 0,
					position: golferScore.position || null,
					is_cut: golferScore.is_cut || false
				};

				if (golferScore.id) {
					// Update existing score
					await pb.collection('golfer_scores').update(golferScore.id, scoreData);
				} else {
					// Create new score
					const created = await pb.collection('golfer_scores').create(scoreData);
					scores[golfer.id] = { ...scoreData, id: created.id };
				}
			}

			alert('Scores saved successfully!');
		} catch (err: any) {
			console.error('Error saving scores:', err);
			error = err.message;
		} finally {
			saving = false;
		}
	}

	function initializeGolferScore(golferId: string) {
		if (!scores[golferId]) {
			scores[golferId] = {
				score: 0,
				total_strokes: 0,
				position: null,
				is_cut: false
			};
		}
	}

	onMount(async () => {
		await loadMyAssignment();
	});
</script>

<div class="max-w-4xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-4xl font-bold text-white mb-2">Scorekeeper Dashboard</h1>
		<p class="text-gray-300">Record scores for your assigned group</p>
		{#if $currentUser}
			<p class="text-gray-400 mt-2">Logged in as: {$currentUser.email}</p>
		{/if}
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-pulse text-white text-xl">Loading your assignment...</div>
		</div>
	{:else if error}
		<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
			<p class="font-bold">Notice</p>
			<p>{error}</p>
		</div>
	{:else if myGroup}
		<!-- Tournament Info -->
		<div class="bg-white rounded-xl p-6 shadow-lg mb-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Tournament Information</h2>
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="text-gray-600">Tournament:</span>
					<span class="font-semibold ml-2">{tournamentRound?.expand?.tournament?.name || 'N/A'}</span>
				</div>
				<div>
					<span class="text-gray-600">Round:</span>
					<span class="font-semibold ml-2">{tournamentRound?.round_number || 'N/A'}</span>
				</div>
				<div>
					<span class="text-gray-600">Date:</span>
					<span class="font-semibold ml-2">{tournamentRound?.date || 'N/A'}</span>
				</div>
				<div>
					<span class="text-gray-600">Course:</span>
					<span class="font-semibold ml-2">{course?.name || 'N/A'}</span>
				</div>
				<div>
					<span class="text-gray-600">Starting Hole:</span>
					<span class="font-semibold ml-2">{myGroup.starting_hole || 1}</span>
				</div>
				<div>
					<span class="text-gray-600">Start Time:</span>
					<span class="font-semibold ml-2">{myGroup.start_time || 'N/A'}</span>
				</div>
			</div>
		</div>

		<!-- Scoring Form -->
		<form onsubmit={handleSaveScores}>
			<div class="bg-white rounded-xl p-6 shadow-lg mb-6">
				<h2 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
					<Users class="h-5 w-5" />
					Golfer Scores ({golfers.length} golfers)
				</h2>

				{#if golfers.length === 0}
					<p class="text-gray-500 text-center py-8">No golfers assigned to this group.</p>
				{:else}
					<div class="space-y-4">
						{#each golfers as golfer}
							{@const _ = initializeGolferScore(golfer.id)}
							<div class="border border-gray-200 rounded-lg p-4">
								<h3 class="font-semibold text-gray-900 mb-3">{golfer.name}</h3>

								<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
									<div class="space-y-2">
										<Label for={`score-${golfer.id}`} class="text-black text-sm">Score (to par)</Label>
										<Input
											id={`score-${golfer.id}`}
											type="number"
											bind:value={scores[golfer.id].score}
											placeholder="0"
											class="bg-white border-gray-300 text-black"
										/>
									</div>

									<div class="space-y-2">
										<Label for={`strokes-${golfer.id}`} class="text-black text-sm">Total Strokes</Label>
										<Input
											id={`strokes-${golfer.id}`}
											type="number"
											bind:value={scores[golfer.id].total_strokes}
											placeholder="0"
											min="0"
											class="bg-white border-gray-300 text-black"
										/>
									</div>

									<div class="space-y-2">
										<Label for={`position-${golfer.id}`} class="text-black text-sm">Position</Label>
										<Input
											id={`position-${golfer.id}`}
											type="number"
											bind:value={scores[golfer.id].position}
											placeholder="1"
											min="1"
											class="bg-white border-gray-300 text-black"
										/>
									</div>

									<div class="space-y-2">
										<Label class="text-black text-sm">Status</Label>
										<div class="flex items-center gap-2 h-10">
											<input
												id={`cut-${golfer.id}`}
												type="checkbox"
												bind:checked={scores[golfer.id].is_cut}
												class="rounded border-gray-300"
											/>
											<Label for={`cut-${golfer.id}`} class="text-black text-sm">Cut</Label>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			{#if error}
				<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
					<p>{error}</p>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex justify-end">
				<Button
					type="submit"
					disabled={saving || golfers.length === 0}
					class="bg-green-600 hover:bg-green-700 text-white"
				>
					{#if saving}
						<span class="flex items-center gap-2">
							<span class="animate-spin">⏳</span>
							Saving Scores...
						</span>
					{:else}
						<span class="flex items-center gap-2">
							<Save class="h-4 w-4" />
							Save Scores
						</span>
					{/if}
				</Button>
			</div>
		</form>
	{/if}
</div>
