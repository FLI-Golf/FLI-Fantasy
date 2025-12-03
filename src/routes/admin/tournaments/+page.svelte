<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Plus from '@lucide/svelte/icons/plus';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import Edit from '@lucide/svelte/icons/edit';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	let tournaments = $state<any[]>([]);
	let loading = $state(true);
	let showCreateDialog = $state(false);
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
		location: {
			name: '',
			latitude: null as number | null,
			longitude: null as number | null
		},
		start_format: 'tee_time',
		tee_time_interval: 10,
		first_tee_time: '10:00'
	});

	async function loadData() {
		try {
			loading = true;
			tournaments = await pb.collection('tournaments').getFullList({
				sort: 'start_date'
			});
		} catch (err: any) {
			console.error('Error loading data:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function handleCreate(e: Event) {
		e.preventDefault();
		error = '';
		saving = true;

		try {
			await pb.collection('tournaments').create(formData);
			showCreateDialog = false;
			resetForm();
			await loadData();
		} catch (err: any) {
			console.error('Error creating tournament:', err);
			error = err.message;
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this tournament?')) {
			return;
		}

		try {
			await pb.collection('tournaments').delete(id);
			await loadData();
		} catch (err: any) {
			console.error('Error deleting tournament:', err);
			alert('Failed to delete tournament: ' + err.message);
		}
	}

	function resetForm() {
		formData = {
			name: '',
			season: '2026',
			start_date: '',
			end_date: '',
			status: 'upcoming',
			location: {
				name: '',
				latitude: null,
				longitude: null
			},
			start_format: 'tee_time',
			tee_time_interval: 10,
			first_tee_time: '10:00'
		};
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	onMount(async () => {
		await loadData();
	});
</script>

<div class="max-w-7xl mx-auto">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-4xl font-bold text-white mb-2">Manage Tournaments</h1>
			<p class="text-gray-300">Create and manage FLI Golf tournaments for the season</p>
		</div>
		<Button
			onclick={() => (showCreateDialog = true)}
			class="bg-green-600 hover:bg-green-700 text-white"
		>
			<Plus class="h-4 w-4 mr-2" />
			Create Tournament
		</Button>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-pulse text-white text-xl">Loading tournaments...</div>
		</div>
	{:else if tournaments.length === 0}
		<div class="bg-white rounded-xl p-12 text-center">
			<Calendar class="h-16 w-16 text-gray-400 mx-auto mb-4" />
			<h3 class="text-xl font-bold text-gray-900 mb-2">No Tournaments Yet</h3>
			<p class="text-gray-600 mb-6">Create your first tournament to get started</p>
			<Button
				onclick={() => (showCreateDialog = true)}
				class="bg-green-600 hover:bg-green-700 text-white"
			>
				<Plus class="h-4 w-4 mr-2" />
				Create Tournament
			</Button>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each tournaments as tournament}
				<div class="bg-white rounded-xl p-6 shadow-lg">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-3 mb-2">
								<h3 class="text-2xl font-bold text-gray-900">{tournament.name}</h3>
								{#if tournament.status === 'next'}
									<span class="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
										Next
									</span>
								{:else if tournament.status === 'in_progress'}
									<span class="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
										In Progress
									</span>
								{:else if tournament.status === 'completed'}
									<span class="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">
										Completed
									</span>
								{:else}
									<span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
										Upcoming
									</span>
								{/if}
							</div>
							<div class="flex flex-wrap gap-4 text-gray-600">
								<div class="flex items-center gap-2">
									<Calendar class="h-4 w-4" />
									<span>{formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}</span>
								</div>
								{#if tournament.location?.name}
									<div class="flex items-center gap-2">
										<MapPin class="h-4 w-4" />
										<span>{tournament.location.name}</span>
										{#if tournament.location.latitude && tournament.location.longitude}
											<span class="text-xs text-gray-400">
												({tournament.location.latitude.toFixed(4)}, {tournament.location.longitude.toFixed(4)})
											</span>
										{/if}
									</div>
								{/if}
							</div>
							{#if tournament.season}
								<p class="text-sm text-gray-500 mt-2">
									Season: {tournament.season}
								</p>
							{/if}
						</div>
						<div class="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onclick={() => goto(`/admin/tournaments/${tournament.id}`)}
							>
								<Edit class="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() => handleDelete(tournament.id)}
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

<!-- Create Tournament Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
	<Dialog.Content class="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="text-black">Create Tournament</Dialog.Title>
			<Dialog.Description class="text-gray-600">
				Add a new tournament to the season
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleCreate} class="space-y-4">
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

			<div class="grid grid-cols-2 gap-4">
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

			<div class="space-y-4 border-t pt-4">
				<h3 class="font-semibold text-black">Location Details</h3>
				
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
						<Label for="latitude" class="text-black">Latitude (optional)</Label>
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
						<Label for="longitude" class="text-black">Longitude (optional)</Label>
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
				<p class="text-sm text-red-500">{error}</p>
			{/if}

			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (showCreateDialog = false)}>
					Cancel
				</Button>
				<Button type="submit" disabled={saving} class="bg-green-600 hover:bg-green-700 text-white">
					{#if saving}
						Creating...
					{:else}
						Create Tournament
					{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
