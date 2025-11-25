<script lang="ts">
	import type { FantasySeason } from '$lib/schemas/fantasy';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Users from '@lucide/svelte/icons/users';
	import Plus from '@lucide/svelte/icons/plus';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Eye from '@lucide/svelte/icons/eye';

	let { data }: { data: { seasons: FantasySeason[] } } = $props();

	function getStatusColor(status: string) {
		switch (status) {
			case 'filling':
				return 'text-gold-600 bg-gold-50';
			case 'active':
				return 'text-purple-600 bg-purple-50';
			case 'completed':
				return 'text-deep-blue-600 bg-deep-blue-50';
			case 'cancelled':
				return 'text-gray-600 bg-gray-50';
			default:
				return 'text-gray-600 bg-gray-50';
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-deep-blue-950 via-purple-900 to-deep-blue-900">
	<div class="container mx-auto px-4 py-10">
		<section class="max-w-6xl mx-auto space-y-6">
			<!-- Header -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="p-3 bg-gradient-to-br from-gold-500 to-gold-600 rounded-lg shadow-lg">
						<Trophy class="h-8 w-8 text-white" />
					</div>
					<h1 class="text-3xl font-bold text-white">My Fantasy Seasons</h1>
				</div>
				<Button
					href="/seasons/new"
					class="bg-gradient-to-r from-purple-600 to-deep-blue-600 hover:from-purple-700 hover:to-deep-blue-700 shadow-lg"
				>
					<Plus class="h-4 w-4 mr-2" />
					Create New Season
				</Button>
			</div>

			<!-- Seasons List -->
			{#if data.seasons.length === 0}
				<Card.Root class="border-2 border-purple-200">
					<Card.Content class="py-12 text-center">
						<div class="flex justify-center mb-4">
							<div class="p-4 bg-purple-100 rounded-full">
								<Trophy class="h-12 w-12 text-purple-600" />
							</div>
						</div>
						<h3 class="text-xl font-semibold text-deep-blue-900 mb-2">
							No Seasons Yet
						</h3>
						<p class="text-gray-600 mb-6">
							You don't have any fantasy seasons yet. Create your first season to get started!
						</p>
						<Button
							href="/seasons/new"
							class="bg-gradient-to-r from-purple-600 to-deep-blue-600 hover:from-purple-700 hover:to-deep-blue-700"
						>
							<Plus class="h-4 w-4 mr-2" />
							Create Your First Season
						</Button>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each data.seasons as season}
						<Card.Root
							class="border-2 border-purple-200 hover:border-gold-400 transition-all hover:shadow-2xl bg-gradient-to-br from-white to-purple-50"
						>
							<Card.Header>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<Card.Title class="text-deep-blue-900 flex items-center gap-2">
											<Trophy class="h-5 w-5 text-gold-500" />
											{season.name}
										</Card.Title>
										{#if season.description}
											<Card.Description class="mt-2">{season.description}</Card.Description>
										{/if}
									</div>
								</div>
							</Card.Header>
							<Card.Content class="space-y-3">
								<!-- Participants -->
								<div class="flex items-center gap-2 text-sm text-gray-700">
									<Users class="h-4 w-4 text-purple-600" />
									<span>
										{season.participants_count}/{season.max_participants} participants
									</span>
								</div>

								<!-- Status -->
								<div class="flex items-center gap-2">
									<span
										class="px-3 py-1 rounded-full text-xs font-medium {getStatusColor(
											season.status
										)}"
									>
										{season.status}
									</span>
								</div>

								<!-- Dates -->
								{#if season.start_date || season.end_date}
									<div class="flex items-center gap-2 text-sm text-gray-600">
										<Calendar class="h-4 w-4 text-deep-blue-600" />
										<span>
											{#if season.start_date}
												{new Date(season.start_date).toLocaleDateString()}
											{/if}
											{#if season.start_date && season.end_date}
												-
											{/if}
											{#if season.end_date}
												{new Date(season.end_date).toLocaleDateString()}
											{/if}
										</span>
									</div>
								{/if}
							</Card.Content>
							<Card.Footer>
								<Button
									href="/seasons/{season.id}"
									variant="outline"
									class="w-full border-purple-300 hover:bg-purple-50"
								>
									<Eye class="h-4 w-4 mr-2" />
									View Details
								</Button>
							</Card.Footer>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>
