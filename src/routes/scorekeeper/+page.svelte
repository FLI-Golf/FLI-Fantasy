<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { currentUser, pb } from '$lib/pocketbase';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import Save from '@lucide/svelte/icons/save';
	import Users from '@lucide/svelte/icons/users';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Clock from '@lucide/svelte/icons/clock';
	import Flag from '@lucide/svelte/icons/flag';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';
	import Check from '@lucide/svelte/icons/check';

	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let tournaments = $state<any[]>([]);
	let selectedTournament = $state<any>(null);
	let selectedGroup = $state<any>(null);
	let groups = $state<any[]>([]);
	let groupStatuses = $state<Record<string, { holesScored: number, totalHoles: number, isComplete: boolean }>>({});
	let course = $state<any>(null);
	let holes = $state<any[]>([]);
	let golfers = $state<any[]>([]);
	let currentHoleIndex = $state(0);
	let holeScores = $state<any>({});
	let scoredHoles = $state<Set<string>>(new Set());
	let golferScoreRecords = $state<any>({}); // Store golfer_scores record IDs

	async function loadTournaments() {
		try {
			loading = true;

			if (!$currentUser) {
				goto('/');
				return;
			}

			// Load active tournaments (next or in_progress)
			tournaments = await pb.collection('tournaments').getFullList({
				filter: 'status = "next" || status = "in_progress"',
				sort: 'start_date',
				expand: 'course,groups'
			});

			if (tournaments.length === 0) {
				error = 'No active tournaments available.';
			}

		} catch (err: any) {
			console.error('Error loading tournaments:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function selectTournament(tournament: any) {
		try {
			loading = true;
			error = '';
			selectedTournament = tournament;

			// Load groups for this tournament
			if (tournament.groups && tournament.groups.length > 0) {
				groups = await pb.collection('groups').getFullList({
					filter: tournament.groups.map((id: string) => `id = "${id}"`).join(' || '),
					sort: 'order',
					expand: 'team_a,team_b,team_a.male_golfer,team_a.female_golfer,team_b.male_golfer,team_b.female_golfer'
				});
			} else {
				error = 'No groups found for this tournament.';
				groups = [];
			}

			// Load course and holes
			if (tournament.course) {
				course = await pb.collection('courses').getOne(tournament.course, {
					expand: 'holes'
				});
				
				if (course.expand?.holes) {
					holes = Array.isArray(course.expand.holes) 
						? course.expand.holes.sort((a: any, b: any) => a.hole_number - b.hole_number)
						: [course.expand.holes];
				}
			}

			// Load scoring status for all groups
			await loadGroupStatuses();

		} catch (err: any) {
			console.error('Error loading tournament details:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadGroupStatuses() {
		if (!selectedTournament || groups.length === 0 || holes.length === 0) return;
		
		try {
			// Get all golfer IDs from all groups
			const allGolferIds: string[] = [];
			const groupGolferMap: Record<string, string[]> = {};
			
			for (const group of groups) {
				const golferIds: string[] = [];
				if (group.expand?.team_a?.expand?.male_golfer) {
					golferIds.push(group.expand.team_a.expand.male_golfer.id);
				}
				if (group.expand?.team_a?.expand?.female_golfer) {
					golferIds.push(group.expand.team_a.expand.female_golfer.id);
				}
				if (group.expand?.team_b?.expand?.male_golfer) {
					golferIds.push(group.expand.team_b.expand.male_golfer.id);
				}
				if (group.expand?.team_b?.expand?.female_golfer) {
					golferIds.push(group.expand.team_b.expand.female_golfer.id);
				}
				groupGolferMap[group.id] = golferIds;
				allGolferIds.push(...golferIds);
			}
			
			if (allGolferIds.length === 0) return;
			
			// Load all scores for this tournament
			const scores = await pb.collection('golfer_scores').getFullList({
				filter: `tournament = "${selectedTournament.id}" && (${allGolferIds.map(id => `golfer = "${id}"`).join(' || ')})`
			});
			
			// Create a map of golfer ID to their score record
			const scoreMap = new Map(scores.map(s => [s.golfer, s]));
			
			// Calculate status for each group
			const statuses: Record<string, { holesScored: number, totalHoles: number, isComplete: boolean }> = {};
			
			for (const group of groups) {
				const golferIds = groupGolferMap[group.id] || [];
				let maxHolesScored = 0;
				
				for (const golferId of golferIds) {
					const score = scoreMap.get(golferId);
					if (score?.current_hole) {
						maxHolesScored = Math.max(maxHolesScored, score.current_hole);
					}
				}
				
				statuses[group.id] = {
					holesScored: maxHolesScored,
					totalHoles: holes.length,
					isComplete: maxHolesScored >= holes.length
				};
			}
			
			groupStatuses = statuses;
			console.log('📊 Group statuses loaded:', groupStatuses);
			
		} catch (err: any) {
			console.error('Error loading group statuses:', err);
		}
	}

	async function selectGroup(group: any) {
		try {
			loading = true;
			error = '';
			selectedGroup = group;
			currentHoleIndex = 0;

			// Calculate and persist start_time if not already set
			if (!group.start_time) {
				const calculatedStartTime = calculateGroupStartTime(group);
				if (calculatedStartTime !== 'N/A') {
					try {
						await pb.collection('groups').update(group.id, {
							start_time: calculatedStartTime
						});
						// Update the local group object
						group.start_time = calculatedStartTime;
						selectedGroup.start_time = calculatedStartTime;
						console.log(`✅ Persisted start_time ${calculatedStartTime} for group ${group.id}`);
					} catch (updateErr: any) {
						console.error('Error updating group start_time:', updateErr);
						// Continue anyway - the calculated time will still display
					}
				}
			}

			// Get golfers from both teams
			golfers = [];
			
			if (group.expand?.team_a) {
				if (group.expand.team_a.expand?.male_golfer) {
					golfers.push(group.expand.team_a.expand.male_golfer);
				}
				if (group.expand.team_a.expand?.female_golfer) {
					golfers.push(group.expand.team_a.expand.female_golfer);
				}
			}
			
			if (group.expand?.team_b) {
				if (group.expand.team_b.expand?.male_golfer) {
					golfers.push(group.expand.team_b.expand.male_golfer);
				}
				if (group.expand.team_b.expand?.female_golfer) {
					golfers.push(group.expand.team_b.expand.female_golfer);
				}
			}

			// Initialize hole scores for each golfer
			initializeHoleScores();
			
			// Load existing scores from database
			await loadExistingScores();

		} catch (err: any) {
			console.error('Error loading group details:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function loadExistingScores() {
		try {
			// Load scores for these golfers in this tournament
			const golferIds = golfers.map(g => g.id);
			if (golferIds.length === 0) return;
			
			const existingScores = await pb.collection('golfer_scores').getFullList({
				filter: `tournament = "${selectedTournament.id}" && (${golferIds.map(id => `golfer = "${id}"`).join(' || ')})`
			});
			
			console.log(`📊 Loading ${existingScores.length} existing scores from database`);
			
			// Store record IDs and restore hole scores
			const scoresToMigrate: Array<{scoreId: string, golferId: string, reconstructedHoleScores: Record<string, number>}> = [];
			
			for (const score of existingScores) {
				golferScoreRecords[score.golfer] = score.id;
				
				console.log(`📊 Score record for golfer ${score.golfer}:`, {
					id: score.id,
					score: score.score,
					current_hole: score.current_hole,
					hole_scores: score.hole_scores,
					hole_scores_type: typeof score.hole_scores
				});
				
				// Parse hole_scores if it's a string
				let parsedHoleScores = score.hole_scores;
				if (typeof parsedHoleScores === 'string') {
					try {
						parsedHoleScores = JSON.parse(parsedHoleScores);
					} catch (e) {
						console.error('Failed to parse hole_scores:', e);
						parsedHoleScores = null;
					}
				}
				
				// Restore hole-by-hole scores if available
				if (parsedHoleScores && typeof parsedHoleScores === 'object' && Object.keys(parsedHoleScores).length > 0) {
					if (!holeScores[score.golfer]) {
						holeScores[score.golfer] = {};
					}
					
					// Merge saved hole scores
					Object.entries(parsedHoleScores).forEach(([holeId, holeScore]) => {
						holeScores[score.golfer][holeId] = holeScore as number;
						scoredHoles.add(holeId);
						console.log(`  📊 Restored hole ${holeId} = ${holeScore} for golfer ${score.golfer}`);
					});
				}
				// If we have current_hole but no hole_scores, reconstruct from total score
				else if (score.current_hole && score.current_hole > 0) {
					console.log(`📊 No hole_scores found, reconstructing from total score: ${score.score} over ${score.current_hole} holes`);
					
					if (!holeScores[score.golfer]) {
						holeScores[score.golfer] = {};
					}
					
					const totalScore = score.score || 0;
					const numHoles = Math.min(score.current_hole, holes.length);
					
					// Distribute the score across holes
					// Put the remainder on the last scored hole to maintain the total
					const baseScore = Math.floor(totalScore / numHoles);
					const remainder = totalScore - (baseScore * numHoles);
					
					const reconstructedHoleScores: Record<string, number> = {};
					
					for (let i = 0; i < numHoles; i++) {
						if (holes[i]) {
							const holeId = holes[i].id;
							// Put remainder on the last hole
							const holeScore = (i === numHoles - 1) ? baseScore + remainder : baseScore;
							holeScores[score.golfer][holeId] = holeScore;
							scoredHoles.add(holeId);
							reconstructedHoleScores[holeId] = holeScore;
							console.log(`  📊 Reconstructed hole ${i + 1} (${holeId}) = ${holeScore}`);
						}
					}
					
					// Queue for migration
					scoresToMigrate.push({
						scoreId: score.id,
						golferId: score.golfer,
						reconstructedHoleScores
					});
				}
			}
			
			// Migrate scores that need hole_scores populated
			for (const migration of scoresToMigrate) {
				try {
					await pb.collection('golfer_scores').update(migration.scoreId, {
						hole_scores: migration.reconstructedHoleScores
					});
					console.log(`  ✅ Saved reconstructed hole_scores to database for golfer ${migration.golferId}`);
				} catch (updateErr: any) {
					console.error(`  ❌ Failed to save reconstructed hole_scores:`, updateErr.message);
				}
			}
			
			// Trigger reactivity
			holeScores = { ...holeScores };
			scoredHoles = new Set(scoredHoles);
			
			console.log(`📊 Final holeScores state:`, JSON.stringify(holeScores));
			console.log(`📊 Scored holes:`, Array.from(scoredHoles));
			
		} catch (err: any) {
			console.error('Error loading existing scores:', err);
			// Continue anyway - scores will be created on save
		}
	}

	function initializeHoleScores() {
		holeScores = {};
		scoredHoles = new Set();
		golfers.forEach(golfer => {
			holeScores[golfer.id] = {};
			holes.forEach(hole => {
				holeScores[golfer.id][hole.id] = 0; // Default to par (0)
			});
		});
	}

	function adjustScore(golferId: string, holeId: string, delta: number) {
		if (!holeScores[golferId]) holeScores[golferId] = {};
		if (!holeScores[golferId][holeId]) holeScores[golferId][holeId] = 0;
		holeScores[golferId][holeId] += delta;
	}

	function nextHole() {
		if (currentHoleIndex < holes.length - 1) {
			currentHoleIndex++;
		}
	}

	function previousHole() {
		if (currentHoleIndex > 0) {
			currentHoleIndex--;
		}
	}

	function getTotalScore(golferId: string): number {
		if (!holeScores[golferId]) return 0;
		return Object.values(holeScores[golferId]).reduce((sum: number, score: any) => sum + (score || 0), 0);
	}

	function goToHole(index: number) {
		currentHoleIndex = index;
	}

	function isHoleScored(holeId: string): boolean {
		// Check if this hole has been explicitly marked as scored
		return scoredHoles.has(holeId);
	}

	function isCurrentHoleSaved(): boolean {
		// Check if current hole has been saved
		const currentHole = holes[currentHoleIndex];
		return scoredHoles.has(currentHole.id);
	}

	async function saveCurrentHole() {
		try {
			saving = true;
			
			const currentHole = holes[currentHoleIndex];
			
			// Mark this hole as scored
			scoredHoles.add(currentHole.id);
			scoredHoles = new Set(scoredHoles);
			
			// Save scores for each golfer with current hole number
			for (const golfer of golfers) {
				const totalScore = getTotalScore(golfer.id);
				const totalStrokes = calculateTotalStrokes(golfer.id);
				
				// Build hole_scores object with only scored holes
				const golferHoleScores: Record<string, number> = {};
				scoredHoles.forEach(holeId => {
					if (holeScores[golfer.id]?.[holeId] !== undefined) {
						golferHoleScores[holeId] = holeScores[golfer.id][holeId];
					}
				});
				
				const scoreData = {
					golfer: golfer.id,
					tournament: selectedTournament.id,
					score: totalScore,
					total_strokes: totalStrokes,
					current_hole: currentHoleIndex + 1, // Convert 0-based index to 1-based hole number
					hole_scores: golferHoleScores, // Save individual hole scores
					title: `${selectedTournament.name} - ${golfer.name}`
				};
				
				// Check if record exists
				if (golferScoreRecords[golfer.id]) {
					// Update existing record
					await pb.collection('golfer_scores').update(golferScoreRecords[golfer.id], scoreData);
				} else {
					// Create new record
					const created = await pb.collection('golfer_scores').create(scoreData);
					golferScoreRecords[golfer.id] = created.id;
				}
			}
			
			console.log(`✅ Saved hole ${currentHoleIndex + 1} scores to database`, {
				current_hole: currentHoleIndex + 1,
				golfers: golfers.length,
				sample_score: golfers[0] ? {
					name: golfers[0].name,
					score: getTotalScore(golfers[0].id),
					strokes: calculateTotalStrokes(golfers[0].id)
				} : null
			});
			
		} catch (err: any) {
			console.error('Error saving hole scores:', err);
			error = 'Failed to save scores: ' + err.message;
		} finally {
			saving = false;
		}
	}

	function calculateTotalStrokes(golferId: string): number {
		if (!holeScores[golferId]) return 0;
		
		// Calculate total strokes: par for each hole + score
		let totalStrokes = 0;
		holes.forEach(hole => {
			const score = holeScores[golferId]?.[hole.id] || 0;
			totalStrokes += hole.par + score;
		});
		
		return totalStrokes;
	}

	function calculateGroupStartTime(group: any): string {
		// If group already has a start_time, use it
		if (group.start_time) {
			return group.start_time;
		}

		// Calculate from tournament settings
		if (!selectedTournament?.first_tee_time || !group.order) {
			return 'N/A';
		}

		// For shotgun start, all groups start at the same time
		if (selectedTournament.start_format === 'shotgun') {
			return selectedTournament.first_tee_time;
		}

		// For tee time start, calculate based on order and interval
		const interval = selectedTournament.tee_time_interval || 10;
		const [hours, minutes] = selectedTournament.first_tee_time.split(':').map(Number);
		
		// Calculate minutes offset (group order - 1) * interval
		const totalMinutes = hours * 60 + minutes + ((group.order - 1) * interval);
		const newHours = Math.floor(totalMinutes / 60) % 24;
		const newMinutes = totalMinutes % 60;
		
		return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
	}

	function backToTournaments() {
		selectedTournament = null;
		selectedGroup = null;
		groups = [];
		golfers = [];
		scores = {};
	}

	function backToGroups() {
		selectedGroup = null;
		golfers = [];
		holeScores = {};
		scoredHoles = new Set();
		golferScoreRecords = {};
		currentHoleIndex = 0;
	}



	async function handleSaveScores() {
		error = '';
		saving = true;

		try {
			// Save final scores for each golfer (mark as complete with hole 18)
			for (const golfer of golfers) {
				const totalScore = getTotalScore(golfer.id);
				const totalStrokes = calculateTotalStrokes(golfer.id);
				
				const scoreData = {
					golfer: golfer.id,
					tournament: selectedTournament.id,
					score: totalScore,
					total_strokes: totalStrokes,
					current_hole: holes.length, // Final hole (18 or 9)
					title: `${selectedTournament.name} - ${golfer.name}`
				};
				
				// Check if record exists
				if (golferScoreRecords[golfer.id]) {
					// Update existing record
					await pb.collection('golfer_scores').update(golferScoreRecords[golfer.id], scoreData);
				} else {
					// Create new record
					const created = await pb.collection('golfer_scores').create(scoreData);
					golferScoreRecords[golfer.id] = created.id;
				}
			}
			
			// Calculate totals for display
			const totals = golfers.map(golfer => ({
				golfer: golfer.name,
				total: getTotalScore(golfer.id),
				strokes: calculateTotalStrokes(golfer.id)
			}));
			
			console.log('✅ Final scores saved to database:', totals);
			
			alert(`Round Complete! Scores Saved:\n\n${totals.map(t => `${t.golfer}: ${t.total > 0 ? '+' : ''}${t.total} (${t.strokes} strokes)`).join('\n')}`);
			
			// Go back to groups list
			backToGroups();
			
		} catch (err: any) {
			console.error('Error saving scores:', err);
			error = err.message;
		} finally {
			saving = false;
		}
	}



	onMount(async () => {
		await loadTournaments();
	});
</script>

<div class="max-w-6xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-4xl font-bold text-white mb-2">Scorekeeper Dashboard</h1>
		<p class="text-gray-300">
			{#if !selectedTournament}
				Select a tournament to record scores
			{:else if !selectedGroup}
				Select a group to score
			{:else}
				Recording scores for {selectedGroup.title}
			{/if}
		</p>
		{#if $currentUser}
			<p class="text-gray-400 mt-2">Logged in as: {$currentUser.email}</p>
		{/if}
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-pulse text-white text-xl">Loading...</div>
		</div>
	{:else if error && !selectedTournament}
		<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
			<p class="font-bold">Notice</p>
			<p>{error}</p>
		</div>
	{:else if !selectedTournament}
		<!-- Tournament Selection -->
		<div class="space-y-4">
			<h2 class="text-2xl font-bold text-white mb-4">Active Tournaments</h2>
			{#each tournaments as tournament}
				<button type="button" class="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow cursor-pointer w-full text-left" onclick={() => selectTournament(tournament)}>
					<div class="flex items-center justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-3 mb-3">
								<Trophy class="h-6 w-6 text-blue-600" />
								<h3 class="text-xl font-bold text-gray-900">{tournament.name}</h3>
								{#if tournament.status === 'next'}
									<span class="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
										Next
									</span>
								{:else if tournament.status === 'in_progress'}
									<span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
										In Progress
									</span>
								{/if}
							</div>
							
							<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
								<div class="flex items-center gap-2">
									<Calendar class="h-4 w-4 text-blue-600" />
									<span>{new Date(tournament.start_date).toLocaleDateString()}</span>
								</div>
								
								{#if tournament.expand?.course}
									<div class="flex items-center gap-2">
										<span class="font-semibold">Course:</span>
										<span>{tournament.expand.course.name}</span>
									</div>
								{/if}
								
								{#if tournament.first_tee_time}
									<div class="flex items-center gap-2">
										<Clock class="h-4 w-4 text-orange-600" />
										<span>First Tee: {tournament.first_tee_time}</span>
									</div>
								{/if}
								
								{#if tournament.start_format}
									<div class="flex items-center gap-2">
										<span class="font-semibold">Format:</span>
										<span class="capitalize">{tournament.start_format === 'tee_time' ? 'Tee Times' : 'Shotgun'}</span>
										{#if tournament.start_format === 'tee_time' && tournament.tee_time_interval}
											<span class="text-xs">({tournament.tee_time_interval} min)</span>
										{/if}
									</div>
								{/if}
								
								{#if tournament.expand?.groups}
									<div class="flex items-center gap-2">
										<Users class="h-4 w-4 text-purple-600" />
										<span>{tournament.expand.groups.length} Groups</span>
									</div>
								{/if}
							</div>
						</div>
						<ArrowRight class="h-6 w-6 text-gray-400" />
					</div>
				</button>
			{/each}
		</div>
	{:else if !selectedGroup}
		<!-- Group Selection -->
		<div class="space-y-4">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-2xl font-bold text-white">Select Group - {selectedTournament.name}</h2>
				<Button onclick={backToTournaments} variant="outline" class="text-white border-white hover:bg-white hover:text-black">
					← Back to Tournaments
				</Button>
			</div>

			{#if groups.length === 0}
				<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
					<p>No groups available for this tournament.</p>
				</div>
			{:else}
				{#each groups as group}
					{@const status = groupStatuses[group.id]}
					{@const holesScored = status?.holesScored || 0}
					{@const totalHoles = status?.totalHoles || holes.length}
					{@const isComplete = status?.isComplete || false}
					{@const isInProgress = holesScored > 0 && !isComplete}
					{@const progressPercent = totalHoles > 0 ? (holesScored / totalHoles) * 100 : 0}
					<div class="bg-white rounded-xl p-6 shadow-lg {isComplete ? 'border-2 border-green-500' : isInProgress ? 'border-2 border-yellow-400' : ''}">
						<div class="flex items-center justify-between">
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
										#{group.order}
									</span>
									<h3 class="text-xl font-bold text-gray-900">{group.title}</h3>
									<!-- Status Badge -->
									{#if isComplete}
										<span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-bold rounded-full flex items-center gap-1">
											<Check class="h-3 w-3" />
											Complete
										</span>
									{:else if isInProgress}
										<span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-bold rounded-full">
											{holesScored}/{totalHoles} Holes
										</span>
									{:else}
										<span class="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-bold rounded-full">
											Not Started
										</span>
									{/if}
								</div>
								<div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-3">
									{#if group.expand?.team_a}
										<div>
											<span class="font-semibold">Team A:</span> {group.expand.team_a.name}
										</div>
									{/if}
									{#if group.expand?.team_b}
										<div>
											<span class="font-semibold">Team B:</span> {group.expand.team_b.name}
										</div>
									{/if}
									{#if group.starting_hole}
										<div>
											<span class="font-semibold">Starting Hole:</span> {group.starting_hole}
										</div>
									{/if}
									<div class="flex items-center gap-1">
										<Clock class="h-3 w-3 text-orange-600" />
										<span class="font-semibold">Start Time:</span> {calculateGroupStartTime(group)}
									</div>
								</div>
								<!-- Progress Bar -->
								{#if holesScored > 0}
									<div class="mt-3">
										<div class="w-full bg-gray-200 rounded-full h-2">
											<div 
												class="h-2 rounded-full transition-all duration-300 {isComplete ? 'bg-green-500' : 'bg-yellow-500'}"
												style="width: {progressPercent}%"
											></div>
										</div>
									</div>
								{/if}
							</div>
							<Button onclick={() => selectGroup(group)} class="{isComplete ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white">
								{isComplete ? 'View Scores' : isInProgress ? 'Continue Scoring' : 'Score This Group'}
							</Button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{:else}
		<!-- Group Info -->
		<div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 shadow-lg mb-6 border-2 border-blue-200">
			<div class="flex items-center justify-between mb-6">
				<h2 class="text-2xl font-bold text-black flex items-center gap-2">
					<Users class="h-6 w-6 text-blue-600" />
					Group Information
				</h2>
				<Button onclick={backToGroups} variant="outline" class="border-black text-black hover:bg-black hover:text-white">
					← Back to Groups
				</Button>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<Trophy class="h-5 w-5 text-blue-600" />
						<span class="text-sm font-semibold text-gray-700">Tournament</span>
					</div>
					<p class="text-lg font-bold text-black">{selectedTournament.name}</p>
				</div>
				
				<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<Users class="h-5 w-5 text-purple-600" />
						<span class="text-sm font-semibold text-gray-700">Group</span>
					</div>
					<p class="text-lg font-bold text-black">{selectedGroup.title}</p>
				</div>
				
				<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<Flag class="h-5 w-5 text-green-600" />
						<span class="text-sm font-semibold text-gray-700">Course</span>
					</div>
					<p class="text-lg font-bold text-black">{course?.name || 'N/A'}</p>
				</div>
				
				<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<MapPin class="h-5 w-5 text-red-600" />
						<span class="text-sm font-semibold text-gray-700">Starting Hole</span>
					</div>
					<p class="text-lg font-bold text-black">Hole {selectedGroup.starting_hole || 1}</p>
				</div>
				
				<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<Clock class="h-5 w-5 text-orange-600" />
						<span class="text-sm font-semibold text-gray-700">Start Time</span>
					</div>
					<p class="text-lg font-bold text-black">{calculateGroupStartTime(selectedGroup)}</p>
				</div>
				
				<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
					<div class="flex items-center gap-2 mb-2">
						<Calendar class="h-5 w-5 text-indigo-600" />
						<span class="text-sm font-semibold text-gray-700">Format</span>
					</div>
					<p class="text-lg font-bold text-black capitalize">
						{selectedTournament.start_format === 'shotgun' ? 'Shotgun Start' : 'Tee Time Start'}
					</p>
				</div>
			</div>
		</div>

		<!-- Multi-Step Scoring Form -->
		{#if holes.length === 0}
			<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
				<p>No holes found for this course.</p>
			</div>
		{:else}
			{@const currentHole = holes[currentHoleIndex]}
			
			<!-- Hole Progress -->
			<div class="bg-white rounded-xl p-4 shadow-lg mb-6">
				<div class="flex items-center justify-between mb-2">
					<h2 class="text-2xl font-bold text-gray-900">
						Hole {currentHole.hole_number}
					</h2>
					<span class="text-sm text-gray-600">
						{currentHoleIndex + 1} of {holes.length}
					</span>
				</div>
				<div class="flex items-center gap-4 text-sm text-gray-600 mb-4">
					<span><strong>Par:</strong> {currentHole.par}</span>
					<span><strong>Distance:</strong> {currentHole.distance} yards</span>
				</div>
				
				<!-- Hole Navigation Grid -->
				<div class="mb-4">
					<p class="text-xs font-semibold text-gray-700 mb-2">Jump to Hole:</p>
					<div class="grid grid-cols-9 gap-2">
						{#each holes as hole, index}
							<button
								onclick={() => goToHole(index)}
								class="aspect-square rounded-lg border-2 font-bold transition-all flex items-center justify-center"
								class:bg-green-600={currentHoleIndex === index}
								class:text-white={currentHoleIndex === index}
								class:border-green-600={currentHoleIndex === index}
								class:bg-blue-100={isHoleScored(hole.id) && currentHoleIndex !== index}
								class:border-blue-400={isHoleScored(hole.id) && currentHoleIndex !== index}
								class:text-blue-900={isHoleScored(hole.id) && currentHoleIndex !== index}
								class:bg-white={!isHoleScored(hole.id) && currentHoleIndex !== index}
								class:border-gray-300={!isHoleScored(hole.id) && currentHoleIndex !== index}
								class:text-black={!isHoleScored(hole.id) && currentHoleIndex !== index}
								class:hover:border-green-500={currentHoleIndex !== index}
							>
								<span class="text-base font-bold">{hole.hole_number}</span>
							</button>
						{/each}
					</div>
					<div class="flex items-center gap-4 mt-2 text-xs text-gray-600">
						<div class="flex items-center gap-1">
							<div class="w-4 h-4 bg-green-600 rounded border-2 border-green-600"></div>
							<span>Current</span>
						</div>
						<div class="flex items-center gap-1">
							<div class="w-4 h-4 bg-blue-100 rounded border-2 border-blue-400"></div>
							<span>Scored</span>
						</div>
						<div class="flex items-center gap-1">
							<div class="w-4 h-4 bg-white rounded border-2 border-gray-300"></div>
							<span>Not Scored</span>
						</div>
					</div>
				</div>
				
				<!-- Progress Bar -->
				<div class="bg-gray-200 rounded-full h-2">
					<div 
						class="bg-green-600 h-2 rounded-full transition-all duration-300"
						style="width: {((currentHoleIndex + 1) / holes.length) * 100}%"
					></div>
				</div>
			</div>

			<!-- Golfer Scores for Current Hole -->
			<div class="bg-white rounded-xl p-6 shadow-lg mb-6 {isHoleScored(currentHole.id) ? 'border-2 border-yellow-400' : ''}">
				<h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
					<Users class="h-5 w-5" />
					Scores for Hole {currentHole.hole_number}
					{#if isHoleScored(currentHole.id)}
						<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
							Editing
						</span>
					{/if}
				</h3>

				<div class="space-y-6">
					{#each golfers as golfer}
						{@const score = holeScores[golfer.id]?.[currentHole.id] || 0}
						{@const totalScore = getTotalScore(golfer.id)}
						
						<div class="border border-gray-200 rounded-lg p-4">
							<div class="flex items-center justify-between mb-4">
								<div>
									<h4 class="font-semibold text-gray-900 text-lg">{golfer.name}</h4>
									<p class="text-sm text-gray-600">
										Total: {totalScore > 0 ? '+' : ''}{totalScore}
									</p>
								</div>
								<div class="text-3xl font-bold" class:text-red-600={score < 0} class:text-green-600={score > 0} class:text-gray-900={score === 0}>
									{score > 0 ? '+' : ''}{score}
								</div>
							</div>

							<div class="flex items-center justify-center gap-4">
								<Button
									onclick={() => adjustScore(golfer.id, currentHole.id, -1)}
									variant="outline"
									size="lg"
									class="w-16 h-16 text-2xl bg-red-50 border-red-300 hover:bg-red-100 hover:border-red-400"
								>
									<Minus class="h-8 w-8 text-red-600" />
								</Button>
								
								<div class="text-center min-w-[120px]">
									<div class="text-4xl font-bold" class:text-red-600={score < 0} class:text-green-600={score > 0} class:text-gray-900={score === 0}>
										{score > 0 ? '+' : ''}{score}
									</div>
									<div class="text-sm text-gray-600 mt-1">
										{score === -2 ? 'Eagle' : score === -1 ? 'Birdie' : score === 0 ? 'Par' : score === 1 ? 'Bogey' : score === 2 ? 'Double' : score > 2 ? `+${score}` : `${score}`}
									</div>
								</div>
								
								<Button
									onclick={() => adjustScore(golfer.id, currentHole.id, 1)}
									variant="outline"
									size="lg"
									class="w-16 h-16 text-2xl bg-green-50 border-green-300 hover:bg-green-100 hover:border-green-400"
								>
									<Plus class="h-8 w-8 text-green-600" />
								</Button>
							</div>
						</div>
					{/each}
				</div>
			</div>

			{#if error}
				<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
					<p>{error}</p>
				</div>
			{/if}

			<!-- Navigation -->
			<div class="flex items-center justify-between gap-4">
				<Button
					onclick={previousHole}
					disabled={currentHoleIndex === 0}
					variant="outline"
					class="flex items-center gap-2"
				>
					<ChevronLeft class="h-5 w-5" />
					Previous
				</Button>

				<div class="flex gap-2">
					{#if isCurrentHoleSaved()}
						<!-- Update button for already saved holes -->
						<Button
							onclick={saveCurrentHole}
							disabled={saving}
							class="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
						>
							{#if saving}
								<span class="animate-spin">⏳</span>
								Updating...
							{:else}
								<Save class="h-4 w-4" />
								Update Hole
							{/if}
						</Button>
					{:else}
						<!-- Save button for new holes -->
						<Button
							onclick={saveCurrentHole}
							disabled={saving}
							class="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
						>
							{#if saving}
								<span class="animate-spin">⏳</span>
								Saving...
							{:else}
								<Save class="h-4 w-4" />
								Save Hole
							{/if}
						</Button>
					{/if}

					{#if currentHoleIndex === holes.length - 1}
						<Button
							onclick={handleSaveScores}
							disabled={saving || !isCurrentHoleSaved()}
							class="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if saving}
								<span class="animate-spin">⏳</span>
								Saving...
							{:else}
								<Save class="h-5 w-5" />
								Finish Round
							{/if}
						</Button>
					{/if}
				</div>

				<Button
					onclick={nextHole}
					disabled={currentHoleIndex === holes.length - 1 || !isCurrentHoleSaved()}
					class="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					title={!isCurrentHoleSaved() ? 'Save current hole before proceeding' : ''}
				>
					Next
					<ChevronRight class="h-5 w-5" />
				</Button>
			</div>
			
			{#if !isCurrentHoleSaved()}
				<div class="text-center text-yellow-300 text-sm mt-2">
					⚠️ Please save this hole before moving to the next
				</div>
			{/if}
		{/if}
	{/if}
</div>
