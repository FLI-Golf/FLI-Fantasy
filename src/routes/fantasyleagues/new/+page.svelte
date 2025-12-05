<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Users from '@lucide/svelte/icons/users';

	let { data, form } = $props();
</script>

<div class="max-w-3xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<div class="p-3 bg-black rounded-lg shadow-lg">
			<Trophy class="h-8 w-8 text-white" />
		</div>
		<div>
			<h1 class="text-3xl font-bold text-white">Create Fantasy League</h1>
			<p class="text-white/80">Set up your own fantasy disc golf league</p>
		</div>
	</div>

	<!-- Form -->
	<Card.Root class="border-2 border-white bg-white shadow-xl">
		<Card.Header>
			<Card.Title class="text-black">League Details</Card.Title>
			<Card.Description>Fill in the information to create your league</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" class="space-y-6">
				<!-- Info Box -->
				<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<h3 class="text-sm font-semibold text-blue-900 mb-2">League Details</h3>
					<div class="space-y-1 text-sm text-blue-800">
						<p><strong>Season:</strong> 2026 FLI Season</p>
						<p><strong>League Name:</strong> {data.user?.name || 'Your'}'s League - ####</p>
						<p class="text-xs text-blue-600 mt-1">
							(A unique 4-character code will be generated)
						</p>
					</div>
				</div>

				<div class="p-4 bg-gray-50 border border-gray-200 rounded-lg">
					<p class="text-sm text-gray-700">
						Your league will be automatically named using your username and a unique 4-character code. 
						Each league you create will have a different code, making it easy for players to find and join the right one.
					</p>
					<p class="text-sm text-gray-700 mt-2">
						<strong>Example:</strong> John's League - A3F2
					</p>
				</div>

				<!-- Hidden season field -->
				<input type="hidden" name="season" value="2026" />

				<!-- Global Errors -->
				{#if form?.errors?._global}
					<div class="p-4 bg-red-50 border border-red-200 rounded-lg">
						<p class="text-sm text-red-600">{form.errors._global[0]}</p>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex gap-3 pt-4">
					<Button type="submit" class="flex-1 bg-black hover:bg-gray-800 text-white">
						<Trophy class="h-4 w-4 mr-2" />
						Create Fantasy League
					</Button>
					<Button type="button" variant="outline" href="/player" class="bg-white">
						Cancel
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Info Card -->
	<Card.Root class="border-2 border-white bg-white">
		<Card.Content class="p-6">
			<h3 class="text-lg font-bold text-black mb-3">What happens next?</h3>
			<ul class="space-y-2 text-sm text-gray-600">
				<li class="flex items-start gap-2">
					<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6] mt-1.5"></div>
					<span>Your league will be created and you'll be the owner</span>
				</li>
				<li class="flex items-start gap-2">
					<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6] mt-1.5"></div>
					<span>Fantasy tournaments will be auto-generated for all tournaments in the season</span>
				</li>
				<li class="flex items-start gap-2">
					<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6] mt-1.5"></div>
					<span>Draft order will be randomized for each tournament</span>
				</li>
				<li class="flex items-start gap-2">
					<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6] mt-1.5"></div>
					<span>Other players can request to join your league</span>
				</li>
				<li class="flex items-start gap-2">
					<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6] mt-1.5"></div>
					<span>When you approve players, draft orders will be reshuffled</span>
				</li>
			</ul>
		</Card.Content>
	</Card.Root>
</div>
