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
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Gamepad2 from '@lucide/svelte/icons/gamepad-2';

	let { data } = $props();

	type Tab = 'fantasy' | 'shop' | 'subscriptions';
	let activeTab = $state<Tab>('fantasy');

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
	</div>

	<!-- Tab Navigation -->
	<div class="bg-white rounded-lg shadow-xl p-2">
		<div class="flex gap-2">
			<button
				onclick={() => (activeTab = 'fantasy')}
				class="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all {activeTab === 'fantasy'
					? 'bg-black text-white'
					: 'bg-transparent text-gray-600 hover:bg-gray-100'}"
			>
				<Gamepad2 class="h-5 w-5" />
				Fantasy Leagues
			</button>
			<button
				onclick={() => (activeTab = 'shop')}
				class="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all {activeTab === 'shop'
					? 'bg-black text-white'
					: 'bg-transparent text-gray-600 hover:bg-gray-100'}"
			>
				<ShoppingBag class="h-5 w-5" />
				Shop
			</button>
			<button
				onclick={() => (activeTab = 'subscriptions')}
				class="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all {activeTab === 'subscriptions'
					? 'bg-black text-white'
					: 'bg-transparent text-gray-600 hover:bg-gray-100'}"
			>
				<CreditCard class="h-5 w-5" />
				Subscriptions
			</button>
		</div>
	</div>

	<!-- Tab Content -->
	{#if activeTab === 'fantasy'}
		<!-- Fantasy Tab Content -->
		<div class="space-y-6">
			<!-- Stats Overview -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<Card.Root class="border-2 border-white bg-white shadow-xl">
			<Card.Content class="p-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm text-gray-600 font-medium">My Leagues</p>
						<p class="text-3xl font-bold text-black mt-1">
							{data.leagues?.length || 0}
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
						<p class="text-sm text-gray-600 font-medium">Total Participants</p>
						<p class="text-3xl font-bold text-black mt-1">
							{data.leagues?.reduce((sum, l) => sum + (l.participantCount || 0), 0) || 0}
						</p>
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
						<p class="text-sm text-gray-600 font-medium">Leagues Owned</p>
						<p class="text-3xl font-bold text-black mt-1">
							{data.leagues?.filter((l) => l.league_owner === data.user?.id).length || 0}
						</p>
					</div>
					<div class="p-3 bg-[#2F91F6] rounded-lg">
						<Calendar class="h-6 w-6 text-white" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- My Leagues -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-2xl font-bold text-white flex items-center gap-2">
				<Trophy class="h-6 w-6" />
				My Leagues
			</h2>
			<Button href="/fantasyleagues/new" class="bg-black hover:bg-gray-800 text-white">
				<Plus class="h-4 w-4 mr-2" />
				Create League
			</Button>
		</div>

		{#if data.leagues && data.leagues.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each data.leagues as league}
					<Card.Root class="border-2 border-white bg-white shadow-xl hover:shadow-2xl transition-shadow">
						<Card.Header>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<Card.Title class="text-xl text-black">{league.title}</Card.Title>
									<Card.Description>
										{league.participantCount || 0} participants
									</Card.Description>
								</div>
								{#if league.league_owner === data.user?.id}
									<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
										Owner
									</span>
								{/if}
							</div>
						</Card.Header>
						<Card.Content>
							<div class="flex items-center gap-2 text-sm text-gray-600">
								<Calendar class="h-4 w-4" />
								<span>Created {new Date(league.created).toLocaleDateString()}</span>
							</div>
						</Card.Content>
						<Card.Footer>
							<Button href="/fantasyleagues/{league.id}" class="w-full bg-black hover:bg-gray-800">
								<Eye class="h-4 w-4 mr-2" />
								View League
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
					<h3 class="text-xl font-semibold text-black mb-2">No Leagues Yet</h3>
					<p class="text-gray-600 mb-6">
						Create your first fantasy league to start playing!
					</p>
					<Button href="/fantasyleagues/new" class="bg-black hover:bg-gray-800 text-white">
						<Plus class="h-4 w-4 mr-2" />
						Create Your First League
					</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>




		</div>
	{:else if activeTab === 'shop'}
		<!-- Shop Tab Content -->
		<div class="space-y-6">
			<Card.Root class="border-2 border-white bg-white">
				<Card.Content class="py-12 text-center">
					<div class="flex justify-center mb-4">
						<div class="p-4 bg-gray-100 rounded-full">
							<ShoppingBag class="h-12 w-12 text-gray-400" />
						</div>
					</div>
					<h3 class="text-xl font-semibold text-black mb-2">FLI Shop</h3>
					<p class="text-gray-600 mb-6">
						Browse official FLI Golf merchandise, apparel, and gear. Shop coming soon!
					</p>
					<Button href="/shop" class="bg-black hover:bg-gray-800 text-white">
						<ShoppingBag class="h-4 w-4 mr-2" />
						Visit Shop
					</Button>
				</Card.Content>
			</Card.Root>
		</div>
	{:else if activeTab === 'subscriptions'}
		<!-- Subscriptions Tab Content -->
		<div class="space-y-6">
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<!-- Free Tier -->
				<Card.Root class="border-2 border-white bg-white shadow-xl">
					<Card.Header>
						<Card.Title class="text-xl text-black">Free</Card.Title>
						<Card.Description>Get started with basic features</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="mb-4">
							<span class="text-4xl font-bold text-black">$0</span>
							<span class="text-gray-600">/month</span>
						</div>
						<ul class="space-y-2 text-sm text-gray-600">
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6]"></div>
								Join up to 3 fantasy leagues
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6]"></div>
								Basic stats tracking
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6]"></div>
								Community access
							</li>
						</ul>
					</Card.Content>
					<Card.Footer>
						<Button disabled class="w-full bg-gray-300 text-gray-600 cursor-not-allowed">
							Current Plan
						</Button>
					</Card.Footer>
				</Card.Root>

				<!-- Pro Tier -->
				<Card.Root class="border-2 border-[#2F91F6] bg-white shadow-xl relative">
					<div class="absolute -top-3 left-1/2 -translate-x-1/2">
						<span class="bg-[#2F91F6] text-white px-4 py-1 rounded-full text-xs font-semibold">
							POPULAR
						</span>
					</div>
					<Card.Header>
						<Card.Title class="text-xl text-black">Pro</Card.Title>
						<Card.Description>For serious fantasy players</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="mb-4">
							<span class="text-4xl font-bold text-black">$9.99</span>
							<span class="text-gray-600">/month</span>
						</div>
						<ul class="space-y-2 text-sm text-gray-600">
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6]"></div>
								Unlimited fantasy leagues
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6]"></div>
								Advanced analytics
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6]"></div>
								Priority support
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-[#2F91F6]"></div>
								Exclusive content
							</li>
						</ul>
					</Card.Content>
					<Card.Footer>
						<Button class="w-full bg-[#2F91F6] hover:bg-blue-600 text-white">
							Upgrade to Pro
						</Button>
					</Card.Footer>
				</Card.Root>

				<!-- Premium Tier -->
				<Card.Root class="border-2 border-white bg-white shadow-xl">
					<Card.Header>
						<Card.Title class="text-xl text-black">Premium</Card.Title>
						<Card.Description>Ultimate fantasy experience</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="mb-4">
							<span class="text-4xl font-bold text-black">$19.99</span>
							<span class="text-gray-600">/month</span>
						</div>
						<ul class="space-y-2 text-sm text-gray-600">
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-black"></div>
								Everything in Pro
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-black"></div>
								VIP tournament access
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-black"></div>
								Custom league branding
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-black"></div>
								Dedicated account manager
							</li>
							<li class="flex items-center gap-2">
								<div class="h-1.5 w-1.5 rounded-full bg-black"></div>
								Early feature access
							</li>
						</ul>
					</Card.Content>
					<Card.Footer>
						<Button class="w-full bg-black hover:bg-gray-800 text-white">
							Upgrade to Premium
						</Button>
					</Card.Footer>
				</Card.Root>
			</div>

			<!-- Subscription Info -->
			<Card.Root class="border-2 border-white bg-white">
				<Card.Content class="p-6">
					<div class="flex items-start gap-4">
						<div class="p-3 bg-[#2F91F6] rounded-lg">
							<CreditCard class="h-6 w-6 text-white" />
						</div>
						<div>
							<h3 class="text-lg font-bold text-black mb-2">Payment Integration Coming Soon</h3>
							<p class="text-gray-600">
								We're working on integrating secure payment processing. Subscription features will be available once the payment system is set up. Stay tuned!
							</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
