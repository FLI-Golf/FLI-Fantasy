<script lang="ts">
	import { currentUser, pb } from '$lib/pocketbase';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import RegisterModal from '$lib/components/RegisterModal.svelte';
	import Trophy from '@lucide/svelte/icons/trophy';
	import Users from '@lucide/svelte/icons/users';
	import Target from '@lucide/svelte/icons/target';
	import BarChart from '@lucide/svelte/icons/bar-chart';
	import LogOut from '@lucide/svelte/icons/log-out';
	import LogIn from '@lucide/svelte/icons/log-in';
	import UserPlus from '@lucide/svelte/icons/user-plus';

	let showLogin = $state(false);
	let showRegister = $state(false);

	function logout() {
		pb.authStore.clear();
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-deep-blue-950 via-purple-900 to-deep-blue-900">
	<!-- Header -->
	<header class="container mx-auto px-4 py-6">
		<nav class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Trophy class="h-8 w-8 text-gold-400" />
				<h1 class="text-2xl font-bold text-white">FLI Fantasy Golf</h1>
			</div>
			<div class="flex gap-2">
				{#if $currentUser}
					<span class="text-gold-200 mr-4 flex items-center gap-2">
						<Users class="h-4 w-4" />
						Welcome, {$currentUser.name}!
					</span>
					<button
						onclick={logout}
						class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
					>
						<LogOut class="h-4 w-4" />
						Logout
					</button>
				{:else}
					<button
						onclick={() => (showLogin = true)}
						class="px-4 py-2 border-2 border-gold-400 text-gold-400 rounded-lg hover:bg-gold-400 hover:text-deep-blue-950 flex items-center gap-2 transition-colors"
					>
						<LogIn class="h-4 w-4" />
						Login
					</button>
					<button
						onclick={() => (showRegister = true)}
						class="px-4 py-2 bg-gradient-to-r from-purple-600 to-deep-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-deep-blue-700 flex items-center gap-2 transition-colors shadow-lg"
					>
						<UserPlus class="h-4 w-4" />
						Sign Up
					</button>
				{/if}
			</div>
		</nav>
	</header>

	<!-- Hero Section -->
	<main class="container mx-auto px-4 py-20">
		<div class="text-center space-y-6">
			<div class="flex justify-center mb-6">
				<div class="relative">
					<div class="absolute inset-0 bg-gold-400 blur-2xl opacity-50 rounded-full"></div>
					<Trophy class="h-20 w-20 text-gold-400 relative z-10" />
				</div>
			</div>
			<h2 class="text-5xl font-bold text-white bg-clip-text">
				Welcome to FLI Fantasy Golf
			</h2>
			<p class="text-xl text-purple-200 max-w-2xl mx-auto">
				Join leagues, draft your team, and compete with friends in the ultimate fantasy golf
				experience.
			</p>

			{#if !$currentUser}
				<div class="flex gap-4 justify-center pt-8">
					<button
						onclick={() => (showRegister = true)}
						class="px-8 py-4 bg-gradient-to-r from-purple-600 to-deep-blue-600 text-white text-lg rounded-lg hover:from-purple-700 hover:to-deep-blue-700 flex items-center gap-2 shadow-xl transition-all transform hover:scale-105"
					>
						<UserPlus class="h-5 w-5" />
						Get Started
					</button>
					<button
						onclick={() => (showLogin = true)}
						class="px-8 py-4 border-2 border-gold-400 text-gold-400 text-lg rounded-lg hover:bg-gold-400 hover:text-deep-blue-950 flex items-center gap-2 transition-all transform hover:scale-105"
					>
						<LogIn class="h-5 w-5" />
						Sign In
					</button>
				</div>
			{/if}
		</div>

		<!-- Features -->
		<div class="grid md:grid-cols-3 gap-6 mt-20">
			<div
				class="bg-gradient-to-br from-white to-purple-50 rounded-xl p-6 shadow-xl border border-purple-200 hover:shadow-2xl transition-shadow"
			>
				<div class="flex items-center gap-3 mb-3">
					<div class="p-3 bg-gradient-to-br from-deep-blue-500 to-deep-blue-600 rounded-lg shadow-lg">
						<Users class="h-6 w-6 text-white" />
					</div>
					<h3 class="text-xl font-bold text-deep-blue-900">Create Leagues</h3>
				</div>
				<p class="text-gray-700">Start your own league or join existing ones with friends</p>
			</div>

			<div
				class="bg-gradient-to-br from-white to-gold-50 rounded-xl p-6 shadow-xl border border-gold-200 hover:shadow-2xl transition-shadow"
			>
				<div class="flex items-center gap-3 mb-3">
					<div class="p-3 bg-gradient-to-br from-gold-500 to-gold-600 rounded-lg shadow-lg">
						<Target class="h-6 w-6 text-white" />
					</div>
					<h3 class="text-xl font-bold text-deep-blue-900">Draft Teams</h3>
				</div>
				<p class="text-gray-700">Build your dream team with strategic draft picks</p>
			</div>

			<div
				class="bg-gradient-to-br from-white to-purple-50 rounded-xl p-6 shadow-xl border border-purple-200 hover:shadow-2xl transition-shadow"
			>
				<div class="flex items-center gap-3 mb-3">
					<div class="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg">
						<BarChart class="h-6 w-6 text-white" />
					</div>
					<h3 class="text-xl font-bold text-deep-blue-900">Track Scores</h3>
				</div>
				<p class="text-gray-700">Follow live scoring and compete for the top spot</p>
			</div>
		</div>
	</main>
</div>

<LoginModal bind:open={showLogin} />
<RegisterModal bind:open={showRegister} />
