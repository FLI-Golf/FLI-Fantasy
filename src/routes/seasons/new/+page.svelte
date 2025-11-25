<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	let { data, form } = $props();

	let name = $state('');
	let description = $state('');
	let max_participants = $state('12');

	let serverErrors = $derived<Record<string, string[]>>(form?.errors ?? {});
</script>

<div class="container mx-auto px-4 py-10">
	<Card.Root class="max-w-lg mx-auto">
		<Card.Header>
			<Card.Title>Create Fantasy Season</Card.Title>
			<Card.Description>Set up a new fantasy golf season for your league</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" use:enhance class="space-y-4">
				<div class="space-y-2">
					<Label for="name">Season Name</Label>
					<Input id="name" name="name" bind:value={name} required />
					{#if serverErrors.name}
						<p class="text-sm text-red-500">{serverErrors.name[0]}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="description">Description (Optional)</Label>
					<Input id="description" name="description" bind:value={description} />
					{#if serverErrors.description}
						<p class="text-sm text-red-500">{serverErrors.description[0]}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="max_participants">Max Participants</Label>
					<Input
						id="max_participants"
						name="max_participants"
						type="number"
						min="2"
						max="100"
						bind:value={max_participants}
						required
					/>
					{#if serverErrors.max_participants}
						<p class="text-sm text-red-500">{serverErrors.max_participants[0]}</p>
					{/if}
				</div>

				{#if serverErrors._global}
					<div class="text-sm text-red-500">
						{#each serverErrors._global as error}
							<p>{error}</p>
						{/each}
					</div>
				{/if}

				<Button type="submit" class="w-full">Create Season</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
