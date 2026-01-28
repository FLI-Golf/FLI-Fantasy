<script lang="ts">
	import Users from '@lucide/svelte/icons/users';
	import Target from '@lucide/svelte/icons/target';
	import BarChart from '@lucide/svelte/icons/bar-chart';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Zap from '@lucide/svelte/icons/zap';
	import Globe from '@lucide/svelte/icons/globe';
	import Award from '@lucide/svelte/icons/award';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	let { data } = $props();

	// News carousel
	let currentNewsIndex = $state(0);
	
	function nextNews() {
		if (data.newsItems.length > 0) {
			currentNewsIndex = (currentNewsIndex + 1) % data.newsItems.length;
		}
	}
	
	function prevNews() {
		if (data.newsItems.length > 0) {
			currentNewsIndex = (currentNewsIndex - 1 + data.newsItems.length) % data.newsItems.length;
		}
	}

	// Auto-advance news carousel
	$effect(() => {
		if (data.newsItems.length <= 1) return;
		const interval = setInterval(nextNews, 5000);
		return () => clearInterval(interval);
	});

	// Group sponsors by tier
	const sponsorsByTier = $derived(() => {
		const tiers: Record<string, any[]> = { platinum: [], gold: [], silver: [], bronze: [] };
		data.sponsors.forEach((s: any) => {
			if (tiers[s.tier]) tiers[s.tier].push(s);
		});
		return tiers;
	});
</script>

<!-- Hero Section -->
<main class="container mx-auto px-4 pt-0 pb-6 -mt-4">
	<div class="text-center">
		<img 
			src="/brand_logos/fliGolf_rwb-01.png" 
			alt="FLI Golf" 
			class="h-[384px] md:h-[480px] lg:h-[576px] mx-auto max-w-full"
		/>
	</div>

	<!-- Quick Links Cards -->
	<div class="grid md:grid-cols-2 gap-6 mt-4 max-w-4xl mx-auto">
		<!-- Fantasy League Card -->
		<a 
			href="/seasons"
			class="group relative overflow-hidden rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 bg-gradient-to-br from-blue-500 via-purple-600 to-purple-800 animate-gradient"
		>
			<div class="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-600/20 group-hover:opacity-0 transition-opacity"></div>
			<div class="relative z-10">
				<div class="flex items-center gap-4 mb-4">
					<div class="p-4 bg-white/20 backdrop-blur rounded-xl group-hover:bg-white/30 transition-colors animate-pulse-slow">
						<Gamepad2 class="h-8 w-8 text-white" />
					</div>
					<h3 class="text-2xl font-bold text-white drop-shadow-lg">Fantasy League</h3>
				</div>
				<p class="text-white/90 leading-relaxed">
					Create your fantasy league, draft elite disc golf athletes, and compete with friends. Track live scores and climb the leaderboard in the ultimate fantasy disc golf experience.
				</p>
				<div class="mt-6 inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-6 py-3 rounded-full group-hover:gap-4 group-hover:bg-yellow-400 group-hover:text-black transition-all shadow-lg">
					<span>Start Playing</span>
					<span class="group-hover:translate-x-1 transition-transform">→</span>
				</div>
			</div>
		</a>

		<!-- FLI Shop Card -->
		<a 
			href="/shop"
			class="group relative overflow-hidden rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 animate-gradient"
		>
			<div class="absolute inset-0 bg-gradient-to-br from-yellow-300/20 to-orange-500/20 group-hover:opacity-0 transition-opacity"></div>
			<div class="relative z-10">
				<div class="flex items-center gap-4 mb-4">
					<div class="p-4 bg-black/20 backdrop-blur rounded-xl group-hover:bg-black/30 transition-colors animate-pulse-slow">
						<ShoppingBag class="h-8 w-8 text-white" />
					</div>
					<h3 class="text-2xl font-bold text-white drop-shadow-lg">FLI Shop</h3>
				</div>
				<p class="text-white/90 leading-relaxed">
					Get official FLI Golf merchandise, apparel, and gear. Support your favorite athletes and show your passion for the sport with exclusive tour products.
				</p>
				<div class="mt-6 inline-flex items-center gap-2 bg-black text-yellow-400 font-bold px-6 py-3 rounded-full group-hover:gap-4 group-hover:bg-white group-hover:text-black transition-all shadow-lg">
					<span>Shop Now</span>
					<span class="group-hover:translate-x-1 transition-transform">→</span>
				</div>
			</div>
		</a>
	</div>
</main>



<!-- Featured Players Section -->
{#if data.featuredGolfers.length > 0}
<section class="py-16">
	<div class="container mx-auto px-4">
		<div class="text-center mb-12">
			<h2 class="text-4xl font-bold text-white mb-4">Featured Athletes</h2>
			<div class="h-1 w-24 bg-white mx-auto"></div>
		</div>

		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
			{#each data.featuredGolfers as golfer}
				<div 
					class="rounded-xl p-4 text-center shadow-xl hover:shadow-2xl transition-shadow hover:scale-105 transform transition-transform relative"
					style="background-color: {golfer.team?.primaryColor || '#ffffff'}"
				>
					<!-- Team mini logo -->
					{#if golfer.team?.miniLogoUrl}
						<div class="absolute top-2 right-2 w-10 h-10 bg-white rounded-full p-1 shadow-md">
							<img 
								src={golfer.team.miniLogoUrl} 
								alt={golfer.team.name}
								class="w-full h-full object-contain"
								title={golfer.team.name}
							/>
						</div>
					{/if}
					<div class="w-20 h-20 mx-auto mb-3 rounded-full bg-gray-200 overflow-hidden">
						{#if golfer.imageUrl || golfer.photo_url}
							<img 
								src={golfer.imageUrl || golfer.photo_url} 
								alt={golfer.name}
								class="w-full h-full object-cover"
							/>
						{:else}
							<div class="w-full h-full flex items-center justify-center bg-[#2F91F6] text-white text-2xl font-bold">
								{golfer.name.charAt(0)}
							</div>
						{/if}
					</div>
					<h3 class="font-bold text-white text-sm drop-shadow-md">{golfer.name}</h3>
					<p class="text-xs text-white/80">{golfer.country || 'USA'}</p>
					<div class="mt-2 inline-block px-2 py-1 bg-black/30 text-white text-xs rounded-full">
						Rank #{golfer.world_ranking}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
{/if}

<!-- Teams Grid -->
{#if data.teamsWithGolfers.length > 0}
<section class="bg-white py-16">
	<div class="container mx-auto px-4">
		<div class="text-center mb-12">
			<h2 class="text-4xl font-bold text-black mb-4">FLI Golf Teams</h2>
			<div class="h-1 w-24 bg-[#2F91F6] mx-auto mb-4"></div>
			<p class="text-gray-600">Meet the teams competing on the tour</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
			{#each data.teamsWithGolfers as team}
				<div 
					class="rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow hover:scale-105 transform transition-transform"
					style="background-color: {team.primaryColor || '#ffffff'}"
				>
					<!-- Team Header -->
					<div class="p-4 flex items-center gap-3">
						{#if team.miniLogoUrl}
							<div class="w-12 h-12 bg-white rounded-full p-1 shadow-md flex-shrink-0">
								<img 
									src={team.miniLogoUrl} 
									alt={team.name}
									class="w-full h-full object-contain"
								/>
							</div>
						{/if}
						<h3 class="font-bold text-white text-lg drop-shadow-md">{team.name}</h3>
					</div>
					
					<!-- Players -->
					<div class="bg-black/20 p-4">
						<div class="flex justify-center gap-4">
							<!-- Male Golfer -->
							{#if team.maleGolfer}
								<div class="text-center">
									<div class="w-16 h-16 mx-auto mb-2 rounded-full bg-white overflow-hidden shadow-md">
										{#if team.maleGolfer.imageUrl}
											<img 
												src={team.maleGolfer.imageUrl} 
												alt={team.maleGolfer.name}
												class="w-full h-full object-cover"
											/>
										{:else}
											<div class="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 text-xl font-bold">
												{team.maleGolfer.name.charAt(0)}
											</div>
										{/if}
									</div>
									<p class="text-white text-xs font-medium drop-shadow-md">{team.maleGolfer.name}</p>
								</div>
							{/if}
							
							<!-- Female Golfer -->
							{#if team.femaleGolfer}
								<div class="text-center">
									<div class="w-16 h-16 mx-auto mb-2 rounded-full bg-white overflow-hidden shadow-md">
										{#if team.femaleGolfer.imageUrl}
											<img 
												src={team.femaleGolfer.imageUrl} 
												alt={team.femaleGolfer.name}
												class="w-full h-full object-cover"
											/>
										{:else}
											<div class="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 text-xl font-bold">
												{team.femaleGolfer.name.charAt(0)}
											</div>
										{/if}
									</div>
									<p class="text-white text-xs font-medium drop-shadow-md">{team.femaleGolfer.name}</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
{/if}

<!-- News Carousel -->
{#if data.newsItems.length > 0}
<section class="bg-black py-16">
	<div class="container mx-auto px-4">
		<div class="max-w-4xl mx-auto">
			<div class="text-center mb-8">
				<h2 class="text-4xl font-bold text-white mb-4">Latest News</h2>
				<div class="h-1 w-24 bg-[#2F91F6] mx-auto"></div>
			</div>

			<div class="relative">
				<div class="bg-white rounded-xl p-8 min-h-[200px] flex flex-col justify-center">
					{#if data.newsItems[currentNewsIndex]}
						{@const news = data.newsItems[currentNewsIndex]}
						<div class="text-center">
							<span class="inline-block px-3 py-1 bg-[#2F91F6] text-white text-xs rounded-full mb-4 uppercase">
								{news.type}
							</span>
							<h3 class="text-2xl font-bold text-black mb-4">{news.title}</h3>
							<p class="text-gray-600 mb-6">{news.message}</p>
							{#if news.link_url}
								<a 
									href={news.link_url}
									class="inline-flex items-center gap-2 text-[#2F91F6] font-semibold hover:underline"
								>
									{news.link_text || 'Learn More'}
									<ExternalLink class="h-4 w-4" />
								</a>
							{/if}
						</div>
					{/if}
				</div>

				{#if data.newsItems.length > 1}
					<button 
						onclick={prevNews}
						class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
					>
						<ChevronLeft class="h-6 w-6 text-black" />
					</button>
					<button 
						onclick={nextNews}
						class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
					>
						<ChevronRight class="h-6 w-6 text-black" />
					</button>

					<div class="flex justify-center gap-2 mt-6">
						{#each data.newsItems as _, i}
							<button 
								onclick={() => currentNewsIndex = i}
								class="w-3 h-3 rounded-full transition-colors {i === currentNewsIndex ? 'bg-[#2F91F6]' : 'bg-gray-400'}"
							></button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</section>
{/if}

<!-- Shop Promo Strip -->
<section class="bg-[#2F91F6] py-12">
	<div class="container mx-auto px-4">
		<div class="flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto">
			<div class="text-center md:text-left">
				<h2 class="text-3xl font-bold text-white mb-2">Official FLI Golf Gear</h2>
				<p class="text-white/80">Rep your favorite tour with exclusive merchandise</p>
			</div>
			<a 
				href="/shop"
				class="inline-flex items-center gap-2 px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold"
			>
				<ShoppingBag class="h-5 w-5" />
				Shop Now
			</a>
		</div>
	</div>
</section>

<!-- About Section -->
<section class="bg-black py-20">
	<div class="container mx-auto px-4">
		<div class="max-w-4xl mx-auto text-center space-y-6">
			<div class="flex justify-center mb-6">
				<div class="p-4 bg-[#2F91F6] rounded-full">
					<Trophy class="h-12 w-12 text-white" />
				</div>
			</div>
			<h2 class="text-4xl font-bold text-white mb-8">About FLI Golf</h2>
			<div class="h-1 w-24 bg-[#2F91F6] mx-auto mb-8"></div>
			<p class="text-lg text-gray-300 leading-relaxed">
				The FLI Golf Tour stands at the forefront of transforming the global landscape of disc golf, reaching unprecedented heights! By uniting the most elite athletes, esteemed sponsors, and influential sports networks, we are orchestrating unparalleled annual events that redefine the pinnacle of the sport.
			</p>
			<p class="text-lg text-gray-300 leading-relaxed">
				With a steadfast commitment to advancing gender equality, FLI GOLF proudly unites the world's leading male and female players in a riveting pairs tournament destined to enthrall disc golf enthusiasts and sports fans worldwide.
			</p>
		</div>
	</div>
</section>

<!-- Sponsors Section -->
{#if data.sponsors.length > 0}
<section class="bg-white py-16">
	<div class="container mx-auto px-4">
		<div class="text-center mb-12">
			<h2 class="text-4xl font-bold text-black mb-4">Our Partners</h2>
			<div class="h-1 w-24 bg-[#2F91F6] mx-auto mb-4"></div>
			<p class="text-gray-600">Proudly supported by industry leaders</p>
		</div>

		<div class="max-w-5xl mx-auto space-y-12">
			<!-- Platinum Sponsors -->
			{#if sponsorsByTier().platinum.length > 0}
				<div>
					<h3 class="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Platinum Partners</h3>
					<div class="flex flex-wrap justify-center items-center gap-12">
						{#each sponsorsByTier().platinum as sponsor}
							<a 
								href={sponsor.website_url || '#'}
								target="_blank"
								rel="noopener noreferrer"
								class="grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100"
							>
								<div class="h-16 w-40 bg-gray-100 rounded-lg flex items-center justify-center p-4">
									<span class="font-bold text-xl text-gray-700">{sponsor.name}</span>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Gold Sponsors -->
			{#if sponsorsByTier().gold.length > 0}
				<div>
					<h3 class="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Gold Partners</h3>
					<div class="flex flex-wrap justify-center items-center gap-8">
						{#each sponsorsByTier().gold as sponsor}
							<a 
								href={sponsor.website_url || '#'}
								target="_blank"
								rel="noopener noreferrer"
								class="grayscale hover:grayscale-0 transition-all opacity-70 hover:opacity-100"
							>
								<div class="h-12 w-32 bg-gray-100 rounded-lg flex items-center justify-center p-3">
									<span class="font-semibold text-gray-700">{sponsor.name}</span>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Silver & Bronze Sponsors -->
			{#if sponsorsByTier().silver.length > 0 || sponsorsByTier().bronze.length > 0}
				<div>
					<h3 class="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">Partners</h3>
					<div class="flex flex-wrap justify-center items-center gap-6">
						{#each [...sponsorsByTier().silver, ...sponsorsByTier().bronze] as sponsor}
							<a 
								href={sponsor.website_url || '#'}
								target="_blank"
								rel="noopener noreferrer"
								class="grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100"
							>
								<div class="h-10 w-28 bg-gray-100 rounded flex items-center justify-center p-2">
									<span class="font-medium text-sm text-gray-600">{sponsor.name}</span>
								</div>
							</a>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</section>
{/if}

<!-- Why FLI Golf Section -->
<section class="py-20">
	<div class="container mx-auto px-4">
		<div class="text-center mb-16">
			<h2 class="text-4xl font-bold text-white mb-4">Why FLI Golf?</h2>
			<div class="h-1 w-24 bg-white mx-auto mb-8"></div>
			<p class="text-xl text-white max-w-3xl mx-auto">
				Experience the world's premier disc golf tour with unprecedented opportunities
			</p>
		</div>

		<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
			<div class="bg-white rounded-xl p-6 text-center shadow-xl hover:shadow-2xl transition-shadow">
				<div class="flex justify-center mb-4">
					<div class="p-3 bg-[#2F91F6] rounded-lg">
						<Award class="h-8 w-8 text-white" />
					</div>
				</div>
				<h3 class="text-lg font-bold text-black mb-2">Historic Purses</h3>
				<p class="text-gray-700 text-sm">
					Follow the largest single-day tournament purses in disc golf history
				</p>
			</div>

			<div class="bg-white rounded-xl p-6 text-center shadow-xl hover:shadow-2xl transition-shadow">
				<div class="flex justify-center mb-4">
					<div class="p-3 bg-black rounded-lg">
						<Users class="h-8 w-8 text-white" />
					</div>
				</div>
				<h3 class="text-lg font-bold text-black mb-2">Elite Athletes</h3>
				<p class="text-gray-700 text-sm">
					Draft from the world's best male and female disc golf players
				</p>
			</div>

			<div class="bg-white rounded-xl p-6 text-center shadow-xl hover:shadow-2xl transition-shadow">
				<div class="flex justify-center mb-4">
					<div class="p-3 bg-[#2F91F6] rounded-lg">
						<Globe class="h-8 w-8 text-white" />
					</div>
				</div>
				<h3 class="text-lg font-bold text-black mb-2">Global Reach</h3>
				<p class="text-gray-700 text-sm">
					Be part of a worldwide sporting revolution in disc golf
				</p>
			</div>

			<div class="bg-white rounded-xl p-6 text-center shadow-xl hover:shadow-2xl transition-shadow">
				<div class="flex justify-center mb-4">
					<div class="p-3 bg-black rounded-lg">
						<Zap class="h-8 w-8 text-white" />
					</div>
				</div>
				<h3 class="text-lg font-bold text-black mb-2">Live Action</h3>
				<p class="text-gray-700 text-sm">
					Experience immersive gameplay designed to showcase extraordinary talent
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Fantasy League CTA Section -->
<section class="bg-black py-20">
	<div class="container mx-auto px-4">
		<div class="max-w-3xl mx-auto text-center space-y-6">
			<h2 class="text-4xl font-bold text-white mb-4">Fantasy League</h2>
			<div class="h-1 w-24 bg-[#2F91F6] mx-auto mb-8"></div>
			<p class="text-xl text-gray-300">
				Join the revolution! Create your fantasy league and compete alongside the world's best disc golf athletes.
			</p>
			
			<div class="grid md:grid-cols-3 gap-6 mt-12 mb-8">
				<div class="bg-white rounded-xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
					<div class="flex justify-center mb-3">
						<div class="p-3 bg-[#2F91F6] rounded-lg">
							<Users class="h-6 w-6 text-white" />
						</div>
					</div>
					<h3 class="text-lg font-bold text-black mb-2">Create Leagues</h3>
					<p class="text-gray-700 text-sm">Start your own league or join with friends</p>
				</div>

				<div class="bg-white rounded-xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
					<div class="flex justify-center mb-3">
						<div class="p-3 bg-black rounded-lg">
							<Target class="h-6 w-6 text-white" />
						</div>
					</div>
					<h3 class="text-lg font-bold text-black mb-2">Draft Teams</h3>
					<p class="text-gray-700 text-sm">Build your dream team strategically</p>
				</div>

				<div class="bg-white rounded-xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
					<div class="flex justify-center mb-3">
						<div class="p-3 bg-[#2F91F6] rounded-lg">
							<BarChart class="h-6 w-6 text-white" />
						</div>
					</div>
					<h3 class="text-lg font-bold text-black mb-2">Track Scores</h3>
					<p class="text-gray-700 text-sm">Follow live scoring and compete</p>
				</div>
			</div>

			<div class="pt-6">
				<a 
					href="/seasons/new"
					class="inline-flex items-center gap-2 px-8 py-4 bg-black text-white text-lg rounded-lg hover:bg-gray-800 shadow-xl transition-all transform hover:scale-105 border-2 border-white"
				>
					<Trophy class="h-5 w-5" />
					Start Your League Now
				</a>
			</div>
		</div>
	</div>
</section>

<style>
	:global(.animate-gradient) {
		background-size: 200% 200%;
		animation: gradient-shift 3s ease infinite;
	}
	
	@keyframes gradient-shift {
		0%, 100% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
	}
	
	:global(.animate-pulse-slow) {
		animation: pulse-slow 2s ease-in-out infinite;
	}
	
	@keyframes pulse-slow {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}
</style>
