<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Users from '@lucide/svelte/icons/users';
	import Plus from '@lucide/svelte/icons/plus';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Eye from '@lucide/svelte/icons/eye';
	import Target from '@lucide/svelte/icons/target';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import UserPlus from '@lucide/svelte/icons/user-plus';

	let { data } = $props();

	function getStatusColor(status: string) {
		switch (status) {
			case 'filling':
				return 'text-[#2F91F6] bg-blue-50';
			case 'active':
				return 'text-green-600 bg-green-50';
			case 'completed':
				return 'text-gray-600 bg-gray-50';
			case 'cancelled':
				return 'text-red-600 bg-red-50';
			default:
				return 'text-gray-600 bg-gray-50';
		}
	}
</script>

<div class="max-w-7xl mx-auto space-y-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="p-3 bg-black rounded-lg shadow-lg">
				<Trophy class="h-8 w-8 text-white" />
			</div>
			<div>
				<h1 class="text-3xl font-bold text-white">Player Dashboard</h1>
				<p class="text-white/80">Welcome back, {data.user?.name || 'Player'}!</p>
			</div>
		</div>
		<Button href="/seasons/new" class="bg-black hover:bg-gray-800 text-white shadow-lg">
			<Plus class="h-4 w-4 mr-2" />
			Create Season
		</Button>
	</div>

	<!-- Stats Overview -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<Card.Root class="border-2 border-white bg-white shadow-xl">
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-600 font-medium">Active Seasons</p>
						<p class="text-3xl font-bold text-black mt-1">
							{data.seasons?.filter((s) => s.status === 'active').length || 0}
						</p>
					</div>
					<div class="p-3 bg-[#2F91F6] rounded-lg">
						<Trophy class="h-6 w-6 text-white" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-2 border-white bg-white shadow-xl">
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-600 font-medium">Total Teams</p>
						<p class="text-3xl font-bold text-black mt-1">{data.teams?.length || 0}</p>
					</div>
					<div class="p-3 bg-black rounded-lg">
						<Users class="h-6 w-6 text-white" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="border-2 border-white bg-white shadow-xl">
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-600 font-medium">Total Seasons</p>
						<p class="text-3xl font-bold text-black mt-1">{data.seasons?.length || 0}</p>
					</div>
					<div class="p-3 bg-[#2F91F6] rounded-lg">
						<Calendar class="h-6 w-6 text-white" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- My Seasons -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-bold text-white flex items-center gap-2">
				<Trophy class="h-6 w-6" />
				My Seasons
			</h2>
			<Button href="/seasons" variant="outline" class="bg-white hover:bg-gray-100">
				View All
			</Button>
		</div>

		{#if data.seasons && data.seasons.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each data.seasons.slice(0, 4) as season}
					<Card.Root class="border-2 border-white bg-white shadow-xl hover:shadow-2xl transition-shadow">
						<Card.Header>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<Card.Title class="text-xl text-black">{season.name}</Card.Title>
									{#if season.description}
										<Card.Description class="mt-1">{season.description}</Card.Description>
									{/if}
								</div>
								<span
									class="px-3 py-1 rounded-full text-xs font-semibold {getStatusColor(
										season.status
									)}"
								>
									{season.status}
								</span>
							</div>
						</Card.Header>
						<Card.Content>
							<div class="space-y-3">
								<div class="flex items-center gap-2 text-sm text-gray-600">
									<Users class="h-4 w-4" />
									<span>{season.participants_count} / {season.max_participants} players</span>
								</div>
								{#if season.start_date}
									<div class="flex items-center gap-2 text-sm text-gray-600">
										<Calendar class="h-4 w-4" />
										<span>Starts: {new Date(season.start_date).toLocaleDateString()}</span>
									</div>
								{/if}
							</div>
						</Card.Content>
						<Card.Footer>
							<Button href="/seasons/{season.id}" class="w-full bg-black hover:bg-gray-800">
								<Eye class="h-4 w-4 mr-2" />
								View Season
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<Card.Root class="border-2 border-white bg-white">
				<Card.Content class="py-12 text-center">
					<div class="flex justify-center mb-4">
						<div class="p-4 bg-gray-100 rounded-full">
							<Trophy class="h-12 w-12 text-gray-400" />
						</div>
					</div>
					<h3 class="text-xl font-semibold text-black mb-2">No Seasons Yet</h3>
					<p class="text-gray-600 mb-6">
						Create your first fantasy season or join an existing one to get started!
					</p>
					<Button href="/seasons/new" class="bg-black hover:bg-gray-800 text-white">
						<Plus class="h-4 w-4 mr-2" />
						Create Your First Season
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- Available Fantasy Leagues -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-bold text-white flex items-center gap-2">
				<UserPlus class="h-6 w-6" />
				Available Fantasy Leagues
			</h2>
			<Button href="/fantasyleagues/new" variant="outline" class="bg-white hover:bg-gray-100">
				<Plus class="h-4 w-4 mr-2" />
				Create League
			</Button>
		</div>

		{#if data.availableLeagues && data.availableLeagues.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each data.availableLeagues as league}
					{@const leagueData = league as any}
					<Card.Root class="border-2 border-white bg-white shadow-xl hover:shadow-2xl transition-shadow">
						<Card.Header>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<Card.Title class="text-xl text-black">{leagueData.title}</Card.Title>
									{#if leagueData.expand?.league_owner}
										<Card.Description class="mt-1">
											Owner: {leagueData.expand.league_owner.name || leagueData.expand.league_owner.email}
										</Card.Description>
									{/if}
								</div>
								{#if leagueData.season}
									<span class="px-3 py-1 rounded-full text-xs font-semibold bg-[#2F91F6] text-white">
										{leagueData.season}
									</span>
								{/if}
							</div>
						</Card.Header>
						<Card.Content>
							<div class="space-y-3">
								<div class="flex items-center gap-2 text-sm text-gray-600">
									<Users class="h-4 w-4" />
									<span>
										{leagueData.participant_count} / {leagueData.settings?.min_participants || 6} players
									</span>
								</div>
								{#if leagueData.fantasy_tournaments && leagueData.fantasy_tournaments.length > 0}
									<div class="flex items-center gap-2 text-sm text-gray-600">
										<Trophy class="h-4 w-4" />
										<span>{leagueData.fantasy_tournaments.length} tournaments</span>
									</div>
								{/if}
							</div>
						</Card.Content>
						<Card.Footer>
							<Button href="/fantasyleagues/{leagueData.id}" class="w-full bg-black hover:bg-gray-800">
								<Eye class="h-4 w-4 mr-2" />
								View & Join League
							</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
			</div>
		{:else}
			<Card.Root class="border-2 border-white bg-white">
				<Card.Content class="py-12 text-center">
					<div class="flex justify-center mb-4">
						<div class="p-4 bg-gray-100 rounded-full">
							<UserPlus class="h-12 w-12 text-gray-400" />
						</div>
					</div>
					<h3 class="text-xl font-semibold text-black mb-2">No Available Leagues</h3>
					<p class="text-gray-600 mb-6">
						There are no fantasy leagues available to join at the moment. Create your own!
					</p>
					<Button href="/fantasyleagues/new" class="bg-black hover:bg-gray-800 text-white">
						<Plus class="h-4 w-4 mr-2" />
						Create Fantasy League
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- Quick Actions -->
	<div class="space-y-4">
		<h2 class="text-2xl font-bold text-white flex items-center gap-2">
			<Target class="h-6 w-6" />
			Quick Actions
		</h2>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<Card.Root class="border-2 border-white bg-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 cursor-pointer">
				<a href="/seasons" class="block">
					<Card.Content class="p-6">
						<div class="flex items-center gap-4">
							<div class="p-3 bg-[#2F91F6] rounded-lg">
								<Trophy class="h-6 w-6 text-white" />
							</div>
							<div>
								<h3 class="text-lg font-bold text-black">Browse Seasons</h3>
								<p class="text-sm text-gray-600">View all available fantasy seasons</p>
							</div>
						</div>
					</Card.Content>
				</a>
			</Card.Root>

			<Card.Root class="border-2 border-white bg-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 cursor-pointer">
				<a href="/shop" class="block">
					<Card.Content class="p-6">
						<div class="flex items-center gap-4">
							<div class="p-3 bg-black rounded-lg">
								<TrendingUp class="h-6 w-6 text-white" />
							</div>
							<div>
								<h3 class="text-lg font-bold text-black">FLI Shop</h3>
								<p class="text-sm text-gray-600">Get official merchandise and gear</p>
							</div>
						</div>
					</Card.Content>
				</a>
			</Card.Root>
		</div>
	</div>
</div>
