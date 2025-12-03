<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import Edit from '@lucide/svelte/icons/edit';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import { Button } from '$lib/components/ui/button';

	let courses = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function loadCourses() {
		try {
			loading = true;
			courses = await pb.collection('courses').getFullList({
				sort: 'name',
				expand: 'holes'
			});
		} catch (err: any) {
			console.error('Error loading courses:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this course?')) {
			return;
		}

		try {
			await pb.collection('courses').delete(id);
			await loadCourses();
		} catch (err: any) {
			console.error('Error deleting course:', err);
			alert('Failed to delete course: ' + err.message);
		}
	}

	onMount(async () => {
		await loadCourses();
	});
</script>

<div class="max-w-7xl mx-auto">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-4xl font-bold text-white mb-2">Manage Courses</h1>
			<p class="text-gray-300">Create and manage golf courses with 9 holes</p>
		</div>
		<Button
			onclick={() => goto('/admin/courses/new')}
			class="bg-green-600 hover:bg-green-700 text-white"
		>
			<Plus class="h-4 w-4 mr-2" />
			Create Course
		</Button>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-pulse text-white text-xl">Loading courses...</div>
		</div>
	{:else if courses.length === 0}
		<div class="bg-white rounded-xl p-12 text-center">
			<MapPin class="h-16 w-16 text-gray-400 mx-auto mb-4" />
			<h3 class="text-xl font-bold text-gray-900 mb-2">No Courses Yet</h3>
			<p class="text-gray-600 mb-6">Create your first course to get started</p>
			<Button
				onclick={() => goto('/admin/courses/new')}
				class="bg-green-600 hover:bg-green-700 text-white"
			>
				<Plus class="h-4 w-4 mr-2" />
				Create Course
			</Button>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each courses as course}
				<div class="bg-white rounded-xl p-6 shadow-lg">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<h3 class="text-2xl font-bold text-gray-900 mb-2">{course.name}</h3>
							<div class="flex items-center gap-4 text-gray-600">
								<span>{course.expand?.holes?.length || 0} holes</span>
								{#if course.expand?.holes?.length === 9}
									<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
										Complete
									</span>
								{:else}
									<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
										Incomplete
									</span>
								{/if}
							</div>
						</div>
						<div class="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onclick={() => goto(`/admin/courses/${course.id}`)}
							>
								<Edit class="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() => handleDelete(course.id)}
								class="text-red-600 hover:text-red-700 hover:bg-red-50"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
