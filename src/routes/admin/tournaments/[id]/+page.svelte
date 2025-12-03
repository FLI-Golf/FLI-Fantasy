<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Calendar from '@lucide/svelte/icons/calendar';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Save from '@lucide/svelte/icons/save';
	import Play from '@lucide/svelte/icons/play';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	let tournament = $state<any>(null);
	let courses = $state<any[]>([]);
	let loading = $state(true);
	let saving = $state(false);
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
			
			// Load tournament and courses in parallel
			const [tournamentData, coursesData] = await Promise.all([
				pb.collection('tournaments').getOne(id, { expand: 'course' }),
				pb.collection('courses').getFullList({ sort: 'name' })
			]);
			
			tournament = tournamentData;
			courses = coursesData;
			
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
