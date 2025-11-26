<script lang="ts">
	import Users from '@lucide/svelte/icons/users';
	import Target from '@lucide/svelte/icons/target';
	import BarChart from '@lucide/svelte/icons/bar-chart';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Zap from '@lucide/svelte/icons/zap';
	import Globe from '@lucide/svelte/icons/globe';
	import Award from '@lucide/svelte/icons/award';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Gamepad2 from '@lucide/svelte/icons/gamepad-2';
</script>

<!-- Hero Section -->
	<main class="container mx-auto px-4 py-20">
		<div class="text-center space-y-6">
			<h2 class="text-5xl font-bold text-white">
				Welcome to FLI Golf
			</h2>
			<p class="text-xl text-white max-w-2xl mx-auto">
				Transforming the global landscape of disc golf and reaching unprecedented heights
			</p>
		</div>

	<!-- Quick Links Cards -->
	<div class="grid md:grid-cols-2 gap-8 mt-20 max-w-4xl mx-auto">
		<!-- Fantasy League Card -->
		<a 
			href="/seasons"
			class="group bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
		>
			<div class="flex items-center gap-4 mb-4">
				<div class="p-4 bg-[#2F91F6] rounded-xl group-hover:bg-black transition-colors">
					<Gamepad2 class="h-8 w-8 text-white" />
				</div>
				<h3 class="text-2xl font-bold text-black">Fantasy League</h3>
			</div>
			<p class="text-gray-700 leading-relaxed">
				Create your fantasy league, draft elite disc golf athletes, and compete with friends. Track live scores and climb the leaderboard in the ultimate fantasy disc golf experience.
			</p>
			<div class="mt-6 flex items-center gap-2 text-[#2F91F6] font-semibold group-hover:gap-4 transition-all">
				<span>Start Playing</span>
				<span>→</span>
			</div>
		</a>

		<!-- FLI Shop Card -->
		<a 
			href="#"
			class="group bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
		>
			<div class="flex items-center gap-4 mb-4">
				<div class="p-4 bg-black rounded-xl group-hover:bg-[#2F91F6] transition-colors">
					<ShoppingBag class="h-8 w-8 text-white" />
				</div>
				<h3 class="text-2xl font-bold text-black">FLI Shop</h3>
			</div>
			<p class="text-gray-700 leading-relaxed">
				Get official FLI Golf merchandise, apparel, and gear. Support your favorite athletes and show your passion for the sport with exclusive tour products.
			</p>
			<div class="mt-6 flex items-center gap-2 text-black font-semibold group-hover:gap-4 transition-all">
				<span>Shop Now</span>
				<span>→</span>
			</div>
		</a>
	</div>
	</main>

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

	<!-- The Experience Section -->
	<section class="bg-white py-20">
		<div class="container mx-auto px-4">
			<div class="max-w-5xl mx-auto">
				<div class="text-center mb-12">
					<h2 class="text-4xl font-bold text-black mb-4">The Experience</h2>
					<div class="h-1 w-24 bg-[#2F91F6] mx-auto mb-8"></div>
					<p class="text-xl text-gray-700">
						Meticulously crafted to elevate the sport to unprecedented heights
					</p>
				</div>

				<div class="grid md:grid-cols-2 gap-8">
					<div class="space-y-6">
						<div class="flex gap-4">
							<div class="flex-shrink-0">
								<div class="p-3 bg-[#2F91F6] rounded-lg">
									<Target class="h-6 w-6 text-white" />
								</div>
							</div>
							<div>
								<h3 class="text-xl font-bold text-black mb-2">Tailor-Made Courses</h3>
								<p class="text-gray-700">
									Meticulously designed courses that challenge even the most exceptional talents, ensuring seamless gameplay and unparalleled shots.
								</p>
							</div>
						</div>

						<div class="flex gap-4">
							<div class="flex-shrink-0">
								<div class="p-3 bg-black rounded-lg">
									<TrendingUp class="h-6 w-6 text-white" />
								</div>
							</div>
							<div>
								<h3 class="text-xl font-bold text-black mb-2">Strategic Gameplay</h3>
								<p class="text-gray-700">
									Every detail planned to spotlight players' extraordinary talents and deliver an exhilarating experience for global fans.
								</p>
							</div>
						</div>
					</div>

					<div class="space-y-6">
						<div class="flex gap-4">
							<div class="flex-shrink-0">
								<div class="p-3 bg-[#2F91F6] rounded-lg">
									<Award class="h-6 w-6 text-white" />
								</div>
							</div>
							<div>
								<h3 class="text-xl font-bold text-black mb-2">Gender Equality</h3>
								<p class="text-gray-700">
									Advancing equality by uniting the world's leading male and female players in riveting pairs tournaments.
								</p>
							</div>
						</div>

						<div class="flex gap-4">
							<div class="flex-shrink-0">
								<div class="p-3 bg-black rounded-lg">
									<Globe class="h-6 w-6 text-white" />
								</div>
							</div>
							<div>
								<h3 class="text-xl font-bold text-black mb-2">Global Attention</h3>
								<p class="text-gray-700">
									Strategic approach guarantees worldwide recognition, cementing our legacy in sports history.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Fantasy League Section -->
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
						class="inline-flex items-center gap-2 px-8 py-4 bg-black text-white text-lg rounded-lg hover:bg-gray-800 shadow-xl transition-all transform hover:scale-105"
					>
						<Trophy class="h-5 w-5" />
						Start Your League Now
					</a>
				</div>
			</div>
		</div>
	</section>
