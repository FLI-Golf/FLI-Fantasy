<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Calendar from '@lucide/svelte/icons/calendar';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Users from '@lucide/svelte/icons/users';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Save from '@lucide/svelte/icons/save';
	import Play from '@lucide/svelte/icons/play';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	let tournament = $state<any>(null);
	let courses = $state<any[]>([]);
	let groups = $state<any[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let linkingGroups = $state(false);
	let error = $state('');

	const seasonOptions = ['2026', '2027', '2028'];
	const statusOptions = ['next', 'upcoming', 'in_progress', 'completed'];

	// Form fields
	let formData = $state({
		name: '',
		season: '2026',
		start_date: '',
		end_date: '',
		status: 'upcoming',
		course: '',
		location: {
			name: '',
			latitude: null as number | null,
			longitude: null as number | null
		},
		start_format: 'tee_time', // 'tee_time' or 'shotgun'
		tee_time_interval: 10, // minutes between groups
		first_tee_time: '10:00' // first group start time
	});

	async function loadTournament() {
		try {
			loading = true;
			const id = $page.params.id;
			
			// Load tournament, courses, and groups in parallel
			const [tournamentData, coursesData, groupsData] = await Promise.all([
				pb.collection('tournaments').getOne(id, { expand: 'course,groups' }),
				pb.collection('courses').getFullList({ sort: 'name' }),
				pb.collection('groups').getFullList({ 
					sort: 'order',
					expand: 'team_a,team_b'
				})
			]);
			
			tournament = tournamentData;
			courses = coursesData;
			groups = groupsData;
			
			// Populate form
			formData = {
				name: tournament.name || '',
				season: tournament.season || '2026',
				start_date: tournament.start_date || '',
				end_date: tournament.end_date || '',
				status: tournament.status || 'upcoming',
				course: tournament.course || '',
				location: tournament.location || {
					name: '',
					latitude: null,
					longitude: null
				},
				start_format: tournament.start_format || 'tee_time',
				tee_time_interval: tournament.tee_time_interval || 10,
				first_tee_time: tournament.first_tee_time || '10:00'
			};
		} catch (err: any) {
			console.error('Error loading tournament:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function handleSave(e: Event) {
		e.preventDefault();
		error = '';
		saving = true;

		try {
			const id = $page.params.id;
			await pb.collection('tournaments').update(id, formData);
			goto('/admin/tournaments');
		} catch (err: any) {
			console.error('Error updating tournament:', err);
			error = err.message;
		} finally {
			saving = false;
		}
	}

	async function autoLinkGroups() {
		try {
			linkingGroups = true;
			error = '';

			// Get groups ordered by their order field (1-6)
			const orderedGroups = groups
				.filter(g => g.order && g.order >= 1 && g.order <= 6)
				.sort((a, b) => a.order - b.order)
				.slice(0, 6); // Max 6 groups

			if (orderedGroups.length === 0) {
				error = 'No groups found with valid order numbers (1-6). Please create groups first.';
				return;
			}

			// Link groups to tournament in order
			const groupIds = orderedGroups.map(g => g.id);
			
			await pb.collection('tournaments').update($page.params.id, {
				groups: groupIds
			});

			console.log(`✅ Linked ${groupIds.length} groups to tournament in order:`, orderedGroups.map(g => `${g.order}: ${g.title}`));
			
			// Reload tournament to show updated groups
			await loadTournament();
		} catch (err: any) {
			console.error('Error linking groups:', err);
			error = 'Failed to link groups: ' + err.message;
		} finally {
			linkingGroups = false;
		}
	}

	async function autoLinkAllTournaments() {
		try {
			linkingGroups = true;
			error = '';

			// Get all next & upcoming tournaments
			const tournaments = await pb.collection('tournaments').getFullList({
				filter: 'status = "next" || status = "upcoming"',
				sort: 'start_date'
			});

			if (tournaments.length === 0) {
				error = 'No next or upcoming tournaments found.';
				return;
			}

			// Get all teams (excluding reserves)
			const allTeams = await pb.collection('teams').getFullList({
				sort: 'name',
				filter: 'reserves = false || reserves = ""'
			});

			if (allTeams.length < 2) {
				error = 'Not enough teams to create groups.';
				return;
			}

			const maxGroups = Math.min(6, Math.floor(allTeams.length / 2));

			// Create unique groups for each tournament
			for (const tournament of tournaments) {
				// Shuffle teams for this tournament
				const shuffled = [...allTeams].sort(() => Math.random() - 0.5);
				
				// Create new groups for this tournament
				const newGroupIds = [];
				
				for (let i = 0; i < maxGroups && i * 2 < shuffled.length; i++) {
					const teamA = shuffled[i * 2];
					const teamB = shuffled[i * 2 + 1] || null;
					const order = i + 1;
					
					const title = teamB 
						? `Group ${order}: ${teamA.name} vs ${teamB.name}`
						: `Group ${order}: ${teamA.name}`;
					
					// Create new group
					const group = await pb.collection('groups').create({
						order: order,
						title: title,
						team_a: teamA.id,
						team_b: teamB?.id || null,
						starting_hole: 1
					});
					
					newGroupIds.push(group.id);
				}
				
				// Link new groups to tournament
				await pb.collection('tournaments').update(tournament.id, {
					groups: newGroupIds
				});
				
				console.log(`✅ Created ${newGroupIds.length} unique groups for tournament: ${tournament.name}`);
			}

			console.log(`✅ Created unique groups for ${tournaments.length} tournaments`);
			
			// Reload current tournament
			await loadTournament();
		} catch (err: any) {
			console.error('Error linking groups to all tournaments:', err);
			error = 'Failed to link groups to all tournaments: ' + err.message;
		} finally {
			linkingGroups = false;
		}
	}

	onMount(async () => {
		await loadTournament();
	});
</script>

<div class="max-w-4xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<Button
			variant="outline"
			onclick={() => goto('/admin/tournaments')}
			class="mb-4"
		>
			<ArrowLeft class="h-4 w-4 mr-2" />
			Back to Tournaments
		</Button>
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-bold text-white mb-2">Edit Tournament</h1>
				<p class="text-gray-300">Update tournament details</p>
			</div>
			<Button
				onclick={() => goto(`/admin/tournaments/${$page.params.id}/start-round`)}
				class="bg-green-600 hover:bg-green-700 text-white"
			>
				<Play class="h-4 w-4 mr-2" />
				Start Round
			</Button>
		</div>
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
		<div class="bg-white rounded-xl p-8 shadow-lg">
			<form onsubmit={handleSave} class="space-y-6">
				<div class="space-y-2">
					<Label for="name" class="text-black">Tournament Name</Label>
					<Input
						id="name"
						bind:value={formData.name}
						placeholder="e.g., FLI Masters Championship"
						required
						class="bg-white border-gray-300 text-black"
					/>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div class="space-y-2">
						<Label for="season" class="text-black">Season</Label>
						<select
							id="season"
							bind:value={formData.season}
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black"
						>
							{#each seasonOptions as season}
								<option value={season}>{season}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<Label for="status" class="text-black">Status</Label>
						<select
							id="status"
							bind:value={formData.status}
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black"
						>
							{#each statusOptions as status}
								<option value={status}>{status.replace('_', ' ')}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-2">
						<Label for="course" class="text-black">Course</Label>
						<select
							id="course"
							bind:value={formData.course}
							class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black"
						>
							<option value="">No course selected</option>
							{#each courses as course}
								<option value={course.id}>{course.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="start_date" class="text-black">Start Date</Label>
						<Input
							id="start_date"
							type="date"
							bind:value={formData.start_date}
							required
							class="bg-white border-gray-300 text-black"
						/>
					</div>

					<div class="space-y-2">
						<Label for="end_date" class="text-black">End Date</Label>
						<Input
							id="end_date"
							type="date"
							bind:value={formData.end_date}
							required
							class="bg-white border-gray-300 text-black"
						/>
					</div>
				</div>

				<div class="space-y-4 border-t pt-6">
					<h3 class="font-semibold text-black flex items-center gap-2">
						<Calendar class="h-5 w-5" />
						Start Configuration
					</h3>

					<div class="space-y-2">
						<Label for="start_format" class="text-black">Start Format</Label>
						<select
							id="start_format"
							bind:value={formData.start_format}
							class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black"
						>
							<option value="tee_time">Tee Time Intervals (Sequential)</option>
							<option value="shotgun">Shotgun Start (All groups start together)</option>
						</select>
						<p class="text-xs text-gray-500">
							{#if formData.start_format === 'tee_time'}
								Groups start at intervals on Hole 1. Longer tournament duration.
							{:else}
								All groups start simultaneously on different holes. Everyone finishes together.
							{/if}
						</p>
					</div>

					{#if formData.start_format === 'tee_time'}
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="first_tee_time" class="text-black">First Tee Time</Label>
								<Input
									id="first_tee_time"
									type="time"
									bind:value={formData.first_tee_time}
									class="bg-white border-gray-300 text-black"
								/>
							</div>

							<div class="space-y-2">
								<Label for="tee_time_interval" class="text-black">Interval (minutes)</Label>
								<Input
									id="tee_time_interval"
									type="number"
									bind:value={formData.tee_time_interval}
									min="5"
									max="30"
									step="5"
									class="bg-white border-gray-300 text-black"
								/>
							</div>
						</div>

						<div class="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
							<p class="font-semibold text-blue-900 mb-1">Tee Time Schedule (6 groups):</p>
							<ul class="text-blue-800 space-y-1">
								{#each Array(6) as _, i}
									{@const [hours, minutes] = formData.first_tee_time.split(':').map(Number)}
									{@const totalMinutes = hours * 60 + minutes + (i * formData.tee_time_interval)}
									{@const teeHours = Math.floor(totalMinutes / 60) % 24}
									{@const teeMinutes = totalMinutes % 60}
									<li>
										Group {i + 1}: {String(teeHours).padStart(2, '0')}:{String(teeMinutes).padStart(2, '0')} - Starts on Hole 1
									</li>
								{/each}
							</ul>
						</div>
					{:else}
						<div class="space-y-2">
							<Label for="shotgun_time" class="text-black">Shotgun Start Time</Label>
							<Input
								id="shotgun_time"
								type="time"
								bind:value={formData.first_tee_time}
								class="bg-white border-gray-300 text-black"
							/>
						</div>

						<div class="p-3 bg-green-50 border border-green-200 rounded-md text-sm">
							<p class="font-semibold text-green-900 mb-1">Shotgun Start (6 groups):</p>
							<ul class="text-green-800 space-y-1">
								<li>All groups start at {formData.first_tee_time}</li>
								<li>Group 1: Hole 1 | Group 2: Hole 2 | Group 3: Hole 3</li>
								<li>Group 4: Hole 4 | Group 5: Hole 5 | Group 6: Hole 6</li>
							</ul>
						</div>
					{/if}
				</div>

				<div class="space-y-4 border-t pt-6">
					<h3 class="font-semibold text-black flex items-center gap-2">
						<MapPin class="h-5 w-5" />
						Location Details
					</h3>
					
					<div class="space-y-2">
						<Label for="location_name" class="text-black">Location Name</Label>
						<Input
							id="location_name"
							bind:value={formData.location.name}
							placeholder="e.g., Augusta National Golf Club"
							class="bg-white border-gray-300 text-black"
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="latitude" class="text-black">Latitude</Label>
							<Input
								id="latitude"
								type="number"
								step="0.000001"
								bind:value={formData.location.latitude}
								placeholder="e.g., 33.5027"
								class="bg-white border-gray-300 text-black"
							/>
						</div>

						<div class="space-y-2">
							<Label for="longitude" class="text-black">Longitude</Label>
							<Input
								id="longitude"
								type="number"
								step="0.000001"
								bind:value={formData.location.longitude}
								placeholder="e.g., -82.0399"
								class="bg-white border-gray-300 text-black"
							/>
						</div>
					</div>
					<p class="text-xs text-gray-500">Coordinates will be used for future mapping features</p>
				</div>

				<div class="space-y-4 border-t pt-6">
					<h3 class="font-semibold text-black flex items-center gap-2">
						<Users class="h-5 w-5" />
						Groups Management
					</h3>
					
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<p class="text-sm text-blue-900 mb-3">
							<strong>Current Groups:</strong> {tournament?.expand?.groups?.length || 0} linked
						</p>
						
						{#if tournament?.expand?.groups && tournament.expand.groups.length > 0}
							<div class="space-y-2 mb-4">
								{#each tournament.expand.groups as group, i}
									<div class="bg-white rounded p-2 text-sm">
										<span class="font-semibold text-blue-900">#{group.order || i + 1}:</span>
										<span class="text-gray-700">{group.title || 'Untitled Group'}</span>
									</div>
								{/each}
							</div>
						{/if}

						<div class="flex gap-2">
							<Button
								type="button"
								onclick={autoLinkGroups}
								disabled={linkingGroups || groups.length === 0}
								variant="outline"
								class="bg-blue-600 hover:bg-blue-700 text-white"
							>
								{#if linkingGroups}
									Linking...
								{:else}
									🔗 Link Existing Groups to This Tournament
								{/if}
							</Button>

							<Button
								type="button"
								onclick={autoLinkAllTournaments}
								disabled={linkingGroups}
								variant="outline"
								class="bg-purple-600 hover:bg-purple-700 text-white"
							>
								{#if linkingGroups}
									Creating Groups...
								{:else}
									🎲 Create Random Groups for All Next/Upcoming
								{/if}
							</Button>
						</div>

						<p class="text-xs text-blue-700 mt-3">
							<strong>Link Existing:</strong> Uses current groups (same matchups). <strong>Create Random:</strong> Creates NEW groups with random matchups for each tournament. 
							<a href="/admin/groups" class="underline">Manage groups →</a>
						</p>
					</div>

					<div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
						<p><strong>Available Groups:</strong> {groups.filter(g => g.order >= 1 && g.order <= 6).length} groups with valid order (1-6)</p>
						{#if groups.filter(g => g.order >= 1 && g.order <= 6).length === 0}
							<p class="text-orange-600 mt-1">⚠️ No groups found. Please create groups first in the Groups page.</p>
						{/if}
					</div>
				</div>

				{#if error}
					<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
						<p>{error}</p>
					</div>
				{/if}

				<div class="flex justify-end gap-3 pt-4 border-t">
					<Button 
						type="button" 
						variant="outline" 
						onclick={() => goto('/admin/tournaments')}
					>
						Cancel
					</Button>
					<Button 
						type="submit" 
						disabled={saving} 
						class="bg-green-600 hover:bg-green-700 text-white"
					>
						{#if saving}
							<span class="flex items-center gap-2">
								<span class="animate-spin">⏳</span>
								Saving...
							</span>
						{:else}
							<span class="flex items-center gap-2">
								<Save class="h-4 w-4" />
								Save Changes
							</span>
						{/if}
					</Button>
				</div>
			</form>
		</div>
	{/if}
</div>
