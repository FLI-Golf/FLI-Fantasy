<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { pb } from '$lib/pocketbase';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Save from '@lucide/svelte/icons/save';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	let course = $state<any>(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');

	let courseName = $state('');
	let holesToAdd = $state(9);
	let holes = $state<any[]>([]);

	async function loadCourse() {
		try {
			loading = true;
			const id = $page.params.id;
			course = await pb.collection('courses').getOne(id, {
				expand: 'holes'
			});

			courseName = course.name || '';
			
			// Load holes and sort by number
			if (course.expand?.holes) {
				holes = Array.isArray(course.expand.holes) 
					? course.expand.holes.sort((a: any, b: any) => a.number - b.number)
					: [course.expand.holes];
			} else {
				holes = [];
			}
		} catch (err: any) {
			console.error('Error loading course:', err);
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

			// Update course name
			await pb.collection('courses').update(id, {
				name: courseName
			});

			// Update or create each hole
			const holeIds: string[] = [];
			for (const hole of holes) {
				const holeData = {
					title: generateHoleTitle(hole),
					number: hole.number,
					par: hole.par,
					distance: hole.distance,
					active: hole.active
				};

				if (hole.id) {
					// Update existing hole
					await pb.collection('holes').update(hole.id, holeData);
					holeIds.push(hole.id);
				} else {
					// Create new hole
					const createdHole = await pb.collection('holes').create(holeData);
					holeIds.push(createdHole.id);
				}
			}

			// Update course with all hole relations
			await pb.collection('courses').update(id, {
				holes: holeIds
			});

			goto('/admin/courses');
		} catch (err: any) {
			console.error('Error updating course:', err);
			error = err.message;
		} finally {
			saving = false;
		}
	}

	// Function to generate title for a hole
	function generateHoleTitle(hole: any): string {
		return courseName 
			? `${courseName} Hole ${hole.number} ${hole.distance} feet Par ${hole.par}`
			: `Hole ${hole.number}`;
	}

	function addHoles() {
		const currentCount = holes.length;
		const newHoles = Array.from({ length: holesToAdd }, (_, i) => ({
			id: null,
			number: currentCount + i + 1,
			par: 3,
			distance: 400,
			active: true
		}));
		holes = [...holes, ...newHoles];
	}

	function removeLastHole() {
		if (holes.length > 0) {
			const lastHole = holes[holes.length - 1];
			holes = holes.slice(0, -1);
			
			// If the hole has an ID, we should delete it from the database
			// We'll handle this on save by only updating holes that still exist in the array
		}
	}



	onMount(async () => {
		await loadCourse();
	});
</script>

<div class="max-w-6xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<Button variant="outline" onclick={() => goto('/admin/courses')} class="mb-4">
			<ArrowLeft class="h-4 w-4 mr-2" />
			Back to Courses
		</Button>
		<h1 class="text-4xl font-bold text-white mb-2">Edit Course</h1>
		<p class="text-gray-300">Update course details and holes</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-pulse text-white text-xl">Loading course...</div>
		</div>
	{:else if error && !course}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
			<p class="font-bold">Error</p>
			<p>{error}</p>
		</div>
	{:else}
		<form onsubmit={handleSave} class="space-y-6">
			<!-- Course Name -->
			<div class="bg-white rounded-xl p-6 shadow-lg">
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="courseName" class="text-black text-lg font-semibold">Course Name</Label>
						<Input
							id="courseName"
							bind:value={courseName}
							placeholder="e.g., Augusta National Golf Club"
							required
							class="bg-white border-gray-300 text-black"
						/>
					</div>

					<div class="flex items-end gap-3">
						<div class="flex-1 space-y-2">
							<Label for="holesToAdd" class="text-black">Number of holes to add</Label>
							<Input
								id="holesToAdd"
								type="number"
								bind:value={holesToAdd}
								min="1"
								max="50"
								class="bg-white border-gray-300 text-black"
							/>
						</div>
						<Button type="button" variant="outline" onclick={addHoles}>
							Add {holesToAdd} Hole{holesToAdd !== 1 ? 's' : ''}
						</Button>
						{#if holes.length > 0}
							<Button type="button" variant="outline" onclick={removeLastHole} class="text-red-600">
								Remove Last Hole
							</Button>
						{/if}
					</div>
					<p class="text-sm text-gray-600">
						Current total: {holes.length} hole{holes.length !== 1 ? 's' : ''}. Hole titles are automatically generated.
					</p>
				</div>
			</div>

			<!-- Holes Grid -->
			{#if holes.length > 0}
				<div class="bg-white rounded-xl p-6 shadow-lg">
					<h2 class="text-xl font-bold text-gray-900 mb-4">{holes.length} Hole{holes.length !== 1 ? 's' : ''}</h2>
					<div class="grid md:grid-cols-2 gap-6">
					{#each holes as hole, i}
						<div class="border border-gray-200 rounded-lg p-4 space-y-3">
							<h3 class="font-semibold text-gray-900">Hole {hole.number}</h3>

							<div class="space-y-2">
								<Label class="text-black text-sm">Title (auto-generated)</Label>
								<div class="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
									{generateHoleTitle(hole)}
								</div>
							</div>

							<div class="space-y-2">
								<Label for={`distance-${i}`} class="text-black text-sm">Distance (ft)</Label>
								<Input
									id={`distance-${i}`}
									type="number"
									bind:value={hole.distance}
									min="0"
									max="700"
									required
									class="bg-white border-gray-300 text-black"
								/>
							</div>

							<div class="flex items-center gap-2">
								<input
									id={`active-${i}`}
									type="checkbox"
									bind:checked={hole.active}
									class="rounded border-gray-300"
								/>
								<Label for={`active-${i}`} class="text-black text-sm">Active</Label>
							</div>
						</div>
					{/each}
				</div>

					<!-- Summary -->
					<div class="mt-6 p-4 bg-gray-50 rounded-lg">
						<h3 class="font-semibold text-gray-900 mb-2">Course Summary</h3>
						<div class="text-sm">
							<span class="text-gray-600">Total Par:</span>
							<span class="font-semibold ml-2">{holes.length * 3} (All holes are par 3)</span>
						</div>
					</div>
				</div>
			{:else}
				<div class="bg-white rounded-xl p-12 text-center">
					<h3 class="text-xl font-bold text-gray-900 mb-2">No Holes Added Yet</h3>
					<p class="text-gray-600">Use the "Add Holes" button above to start adding holes to your course.</p>
				</div>
			{/if}

			{#if error}
				<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					<p>{error}</p>
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex justify-end gap-3">
				<Button type="button" variant="outline" onclick={() => goto('/admin/courses')}>
					Cancel
				</Button>
				<Button type="submit" disabled={saving} class="bg-green-600 hover:bg-green-700 text-white">
					{#if saving}
						<span class="flex items-center gap-2">
							<span class="animate-spin">⏳</span>
							Saving Changes...
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
	{/if}
</div>
