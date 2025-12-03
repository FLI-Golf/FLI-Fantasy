<script lang="ts">
	import { onMount } from 'svelte';
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import Edit from '@lucide/svelte/icons/edit';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Users from '@lucide/svelte/icons/users';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let groups = $state<any[]>([]);
	let teams = $state<any[]>([]);
	let availableTeams = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showCreateDialog = $state(false);
	let saving = $state(false);
	let draggedTeam = $state<any>(null);
	let draggedFromGroup = $state<string | null>(null);

	let formData = $state({
		title: '',
		order: 1,
		team_a: '',
		team_b: ''
	});

	async function loadData() {
		try {
			loading = true;
			const [groupsData, teamsData] = await Promise.all([
				pb.collection('groups').getFullList({
					sort: 'order,created',
					expand: 'team_a,team_a.male_golfer,team_a.female_golfer,team_b,team_b.male_golfer,team_b.female_golfer'
				}),
				pb.collection('teams').getFullList({
					sort: 'name',
					expand: 'male_golfer,female_golfer'
				})
			]);

			groups = groupsData;
			teams = teamsData;
			
			// Calculate available teams (not assigned to any group)
			const assignedTeamIds = new Set<string>();
			groups.forEach(g => {
				if (g.team_a) assignedTeamIds.add(g.team_a);
				if (g.team_b) assignedTeamIds.add(g.team_b);
			});
			
			availableTeams = teams.filter(t => !assignedTeamIds.has(t.id));
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
			// Check if order already exists
			const existingOrder = groups.find(g => g.order === formData.order);
			if (existingOrder) {
				error = `Order ${formData.order} is already used by another group`;
				saving = false;
				return;
			}

			await pb.collection('groups').create({
				title: formData.title,
				order: formData.order,
				team_a: formData.team_a || null,
				team_b: formData.team_b || null,
				starting_hole: 1
			});

			showCreateDialog = false;
			resetForm();
			await loadData();
		} catch (err: any) {
			console.error('Error creating group:', err);
			error = err.message;
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Are you sure you want to delete this group?')) {
			return;
		}

		try {
			await pb.collection('groups').delete(id);
			await loadData();
		} catch (err: any) {
			console.error('Error deleting group:', err);
			alert('Failed to delete group: ' + err.message);
		}
	}

	function resetForm() {
		// Find next available order
		const usedOrders = groups.map(g => g.order).filter(o => o);
		let nextOrder = 1;
		while (usedOrders.includes(nextOrder)) {
			nextOrder++;
		}

		formData = {
			title: '',
			order: nextOrder,
			team_a: '',
			team_b: ''
		};
	}

	function generateTitle() {
		const teamA = teams.find(t => t.id === formData.team_a);
		const teamB = teams.find(t => t.id === formData.team_b);
		
		if (teamA && teamB) {
			formData.title = `Group ${formData.order}: ${teamA.name} vs ${teamB.name}`;
		} else if (teamA) {
			formData.title = `Group ${formData.order}: ${teamA.name}`;
		} else {
			formData.title = `Group ${formData.order}`;
		}
	}

	async function randomAssign() {
		if (!confirm('Randomly assign all available teams to groups? This will clear existing assignments.')) {
			return;
		}

		try {
			saving = true;
			
			// Shuffle available teams
			const shuffled = [...teams].sort(() => Math.random() - 0.5);
			
			// Assign to groups (2 teams per group)
			for (let i = 0; i < groups.length && i * 2 < shuffled.length; i++) {
				const group = groups[i];
				const teamA = shuffled[i * 2];
				const teamB = shuffled[i * 2 + 1] || null;
				
				await pb.collection('groups').update(group.id, {
					team_a: teamA?.id || null,
					team_b: teamB?.id || null,
					title: teamB 
						? `Group ${group.order}: ${teamA.name} vs ${teamB.name}`
						: `Group ${group.order}: ${teamA.name}`
				});
			}
			
			await loadData();
		} catch (err: any) {
			console.error('Error random assigning:', err);
			alert('Failed to assign teams: ' + err.message);
		} finally {
			saving = false;
		}
	}

	function handleDragStart(team: any, fromGroup: string | null = null) {
		draggedTeam = team;
		draggedFromGroup = fromGroup;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	async function handleDropOnGroup(groupId: string, slot: 'team_a' | 'team_b') {
		if (!draggedTeam) return;

		try {
			const group = groups.find(g => g.id === groupId);
			if (!group) return;

			// If dragging from another group, remove from that group first
			if (draggedFromGroup) {
				const fromGroup = groups.find(g => g.id === draggedFromGroup);
				if (fromGroup) {
					const updates: any = {};
					if (fromGroup.team_a === draggedTeam.id) updates.team_a = null;
					if (fromGroup.team_b === draggedTeam.id) updates.team_b = null;
					await pb.collection('groups').update(draggedFromGroup, updates);
				}
			}

			// Add to new group
			const updates: any = {};
			updates[slot] = draggedTeam.id;
			
			// Update title
			const teamA = slot === 'team_a' ? draggedTeam : group.expand?.team_a;
			const teamB = slot === 'team_b' ? draggedTeam : group.expand?.team_b;
			
			if (teamA && teamB) {
				updates.title = `Group ${group.order}: ${teamA.name} vs ${teamB.name}`;
			} else if (teamA) {
				updates.title = `Group ${group.order}: ${teamA.name}`;
			} else if (teamB) {
				updates.title = `Group ${group.order}: ${teamB.name}`;
			}
			
			await pb.collection('groups').update(groupId, updates);
			await loadData();
		} catch (err: any) {
			console.error('Error dropping team:', err);
			alert('Failed to assign team: ' + err.message);
		} finally {
			draggedTeam = null;
			draggedFromGroup = null;
		}
	}

	async function removeTeamFromGroup(groupId: string, slot: 'team_a' | 'team_b') {
		try {
			const group = groups.find(g => g.id === groupId);
			if (!group) return;

			const updates: any = {};
			updates[slot] = null;
			
			// Update title
			const teamA = slot === 'team_a' ? null : group.expand?.team_a;
			const teamB = slot === 'team_b' ? null : group.expand?.team_b;
			
			if (teamA && teamB) {
				updates.title = `Group ${group.order}: ${teamA.name} vs ${teamB.name}`;
			} else if (teamA) {
				updates.title = `Group ${group.order}: ${teamA.name}`;
			} else if (teamB) {
				updates.title = `Group ${group.order}: ${teamB.name}`;
			} else {
				updates.title = `Group ${group.order}`;
			}
			
			await pb.collection('groups').update(groupId, updates);
			await loadData();
		} catch (err: any) {
			console.error('Error removing team:', err);
			alert('Failed to remove team: ' + err.message);
		}
	}

	onMount(async () => {
		await loadData();
		resetForm();
	});
</script>

<div class="max-w-7xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between mb-4">
			<div>
				<h1 class="text-4xl font-bold text-white mb-2">Manage Groups</h1>
				<p class="text-gray-300">Drag and drop teams to organize groups</p>
			</div>
			<div class="flex gap-2">
				<Button
					onclick={randomAssign}
					disabled={saving || teams.length === 0}
					variant="outline"
					class="bg-purple-600 hover:bg-purple-700 text-white"
				>
					🎲 Random Assign
				</Button>
				<Button
					onclick={() => (showCreateDialog = true)}
					class="bg-green-600 hover:bg-green-700 text-white"
				>
					<Plus class="h-4 w-4 mr-2" />
					Create Group
				</Button>
			</div>
		</div>
		
		<!-- Available Teams Panel -->
		<div class="bg-white rounded-xl p-4 shadow-lg">
			<h2 class="text-lg font-bold text-gray-900 mb-3">Available Teams ({availableTeams.length})</h2>
			<div class="flex flex-wrap gap-2">
				{#if availableTeams.length === 0}
					<p class="text-gray-500 text-sm">All teams are assigned to groups</p>
				{:else}
					{#each availableTeams as team}
						<div
							draggable="true"
							ondragstart={() => handleDragStart(team)}
							class="px-4 py-2 bg-blue-100 text-blue-900 rounded-lg cursor-move hover:bg-blue-200 transition-colors"
						>
							<div class="font-semibold">{team.name}</div>
							<div class="text-xs text-blue-700 mt-1">
								{#if team.expand?.male_golfer || team.expand?.female_golfer}
									{team.expand?.male_golfer?.name || '?'} & {team.expand?.female_golfer?.name || '?'}
								{:else}
									No golfers assigned
								{/if}
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="animate-pulse text-white text-xl">Loading groups...</div>
		</div>
	{:else if groups.length === 0}
		<div class="bg-white rounded-xl p-12 text-center">
			<Users class="h-16 w-16 text-gray-400 mx-auto mb-4" />
			<h3 class="text-xl font-bold text-gray-900 mb-2">No Groups Yet</h3>
			<p class="text-gray-600 mb-6">Create your first group to get started</p>
			<Button
				onclick={() => (showCreateDialog = true)}
				class="bg-green-600 hover:bg-green-700 text-white"
			>
				<Plus class="h-4 w-4 mr-2" />
				Create Group
			</Button>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each groups as group}
				<div class="bg-white rounded-xl p-6 shadow-lg">
					<div class="flex items-start justify-between mb-4">
						<div class="flex items-center gap-3">
							<span class="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-bold rounded-full">
								#{group.order || '?'}
							</span>
							<h3 class="text-xl font-bold text-gray-900">
								{group.title || `Group ${group.order || 'Untitled'}`}
							</h3>
						</div>
						<div class="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onclick={() => goto(`/admin/groups/${group.id}`)}
							>
								<Edit class="h-4 w-4" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() => handleDelete(group.id)}
								class="text-red-600 hover:text-red-700 hover:bg-red-50"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>

					<!-- Team Slots -->
					<div class="grid grid-cols-2 gap-4">
						<!-- Team A Slot -->
						<div
							ondragover={handleDragOver}
							ondrop={() => handleDropOnGroup(group.id, 'team_a')}
							class="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[80px] hover:border-blue-400 hover:bg-blue-50 transition-colors"
						>
							<p class="text-xs font-semibold text-gray-500 mb-2">TEAM A</p>
							{#if group.expand?.team_a}
								<div
									draggable="true"
									ondragstart={() => handleDragStart(group.expand.team_a, group.id)}
									class="px-3 py-2 bg-green-100 text-green-900 rounded-lg cursor-move hover:bg-green-200 transition-colors font-semibold flex items-center justify-between"
								>
									<span>{group.expand.team_a.name}</span>
									<button
										onclick={() => removeTeamFromGroup(group.id, 'team_a')}
										class="text-red-600 hover:text-red-800"
										title="Remove team"
									>
										×
									</button>
								</div>
							{:else}
								<p class="text-gray-400 text-sm italic">Drop team here</p>
							{/if}
						</div>

						<!-- Team B Slot -->
						<div
							ondragover={handleDragOver}
							ondrop={() => handleDropOnGroup(group.id, 'team_b')}
							class="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[80px] hover:border-blue-400 hover:bg-blue-50 transition-colors"
						>
							<p class="text-xs font-semibold text-gray-500 mb-2">TEAM B</p>
							{#if group.expand?.team_b}
								<div
									draggable="true"
									ondragstart={() => handleDragStart(group.expand.team_b, group.id)}
									class="px-3 py-2 bg-green-100 text-green-900 rounded-lg cursor-move hover:bg-green-200 transition-colors font-semibold flex items-center justify-between"
								>
									<span>{group.expand.team_b.name}</span>
									<button
										onclick={() => removeTeamFromGroup(group.id, 'team_b')}
										class="text-red-600 hover:text-red-800"
										title="Remove team"
									>
										×
									</button>
								</div>
							{:else}
								<p class="text-gray-400 text-sm italic">Drop team here</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Group Dialog -->
<Dialog.Root bind:open={showCreateDialog}>
	<Dialog.Content class="sm:max-w-[500px] bg-white">
		<Dialog.Header>
			<Dialog.Title class="text-black">Create Group</Dialog.Title>
			<Dialog.Description class="text-gray-600">
				Add a new group with 2 teams
			</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleCreate} class="space-y-4">
			<div class="space-y-2">
				<Label for="order" class="text-black">Order (1-6)</Label>
				<Input
					id="order"
					type="number"
					bind:value={formData.order}
					min="1"
					max="100"
					required
					onchange={generateTitle}
					class="bg-white border-gray-300 text-black"
				/>
				<p class="text-xs text-gray-500">Unique number to order groups (typically 1-6)</p>
			</div>

			<div class="space-y-2">
				<Label for="team_a" class="text-black">Team A</Label>
				<select
					id="team_a"
					bind:value={formData.team_a}
					onchange={generateTitle}
					class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black"
				>
					<option value="">Select Team A</option>
					{#each teams as team}
						<option value={team.id}>{team.name}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<Label for="team_b" class="text-black">Team B</Label>
				<select
					id="team_b"
					bind:value={formData.team_b}
					onchange={generateTitle}
					class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-black"
				>
					<option value="">Select Team B</option>
					{#each teams as team}
						<option value={team.id}>{team.name}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<Label for="title" class="text-black">Title</Label>
				<Input
					id="title"
					bind:value={formData.title}
					placeholder="e.g., Group 1: Eagles vs Hawks"
					class="bg-white border-gray-300 text-black"
				/>
				<Button type="button" variant="outline" size="sm" onclick={generateTitle}>
					Auto-generate Title
				</Button>
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
						Create Group
					{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
