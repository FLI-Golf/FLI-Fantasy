<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

	let { data, form } = $props();

	// Use owner's name as default season name
	let name = $state(data.ownerName ? `${data.ownerName}'s League` : '');
	// Max participants is always 6 (1 owner + 5 participants)
	const max_participants = 6;

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
					<Label for="name">League Name</Label>
					<Input 
						id="name" 
						name="name" 
						bind:value={name} 
						required 
						placeholder="Enter league name"
						class="bg-white text-black"
					/>
					{#if serverErrors.name}
						<p class="text-sm text-red-500">{serverErrors.name[0]}</p>
					{/if}
				</div>

				<!-- Hidden fields -->
				<input type="hidden" name="max_participants" value="6" />
				<input type="hidden" name="description" value="" />

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
