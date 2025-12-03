<script lang="ts">
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Save from '@lucide/svelte/icons/save';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	let saving = $state(false);
	let error = $state('');

	let courseName = $state('');
	let holesToAdd = $state(9);
	let holes = $state<any[]>([]);

	function addHoles() {
		const currentCount = holes.length;
		const newHoles = Array.from({ length: holesToAdd }, (_, i) => ({
			number: currentCount + i + 1,
			par: 3,
			distance: 400,
			active: true,
			get title() {
				return courseName 
					? `${courseName} Hole ${this.number} ${this.distance} feet Par ${this.par}`
					: `Hole ${this.number}`;
			}
		}));
		holes = [...holes, ...newHoles];
	}

	function removeLastHole() {
		if (holes.length > 0) {
			holes = holes.slice(0, -1);
		}
	}

	async function handleSave(e: Event) {
		e.preventDefault();
		error = '';
		
		if (holes.length === 0) {
			error = 'Please add at least one hole before saving';
			return;
		}

		saving = true;

		try {
			// Create the course first
			const course = await pb.collection('courses').create({
				name: courseName
			});

			// Create all holes
			const holeIds: string[] = [];
			for (const hole of holes) {
				const createdHole = await pb.collection('holes').create({
					title: hole.title,
					number: hole.number,
					par: hole.par,
					distance: hole.distance,
					active: hole.active
				});
				holeIds.push(createdHole.id);
			}

			// Update course with hole relations
			await pb.collection('courses').update(course.id, {
				holes: holeIds
			});

			goto('/admin/courses');
		} catch (err: any) {
			console.error('Error creating course:', err);
			error = err.message;
		} finally {
			saving = false;
		}
	}




</script>

<div class="max-w-6xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<Button variant="outline" onclick={() => goto('/admin/courses')} class="mb-4">
			<ArrowLeft class="h-4 w-4 mr-2" />
			Back to Courses
		</Button>
		<h1 class="text-4xl font-bold text-white mb-2">Create Course</h1>
		<p class="text-gray-300">Add a new golf course with 9 holes</p>
	</div>

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
								{hole.title}
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
						Creating Course...
					</span>
				{:else}
					<span class="flex items-center gap-2">
						<Save class="h-4 w-4" />
						Create Course
					</span>
				{/if}
			</Button>
		</div>
	</form>
</div>
