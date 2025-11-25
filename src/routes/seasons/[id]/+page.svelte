<script lang="ts">
	import { page } from '$app/stores';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	const seasonId = $derived($page.params.id);
</script>

<div class="container mx-auto px-4 py-10">
	<Card.Root class="max-w-2xl mx-auto">
		<Card.Header>
			<Card.Title>Season Created Successfully!</Card.Title>
			<Card.Description>Season ID: {seasonId}</Card.Description>
		</Card.Header>
		<Card.Content>
			<p class="text-gray-600 mb-4">
				Your fantasy season has been created. This is a placeholder page - we'll add more details
				later.
			</p>
			<div class="flex gap-2">
				<Button href="/seasons/new">Create Another Season</Button>
				<Button variant="outline" href="/">Go Home</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
