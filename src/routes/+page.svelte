<script lang="ts">
	import { currentUser, pb } from '$lib/pocketbase';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import RegisterModal from '$lib/components/RegisterModal.svelte';

	let showLogin = $state(false);
	let showRegister = $state(false);

	function logout() {
		pb.authStore.clear();
	}
</script>

<div class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
	<!-- Header -->
	<header class="container mx-auto px-4 py-6">
		<nav class="flex items-center justify-between">
			<h1 class="text-2xl font-bold text-white">FLI Fantasy Golf</h1>
			<div class="flex gap-2">
				{#if $currentUser}
					<span class="text-white mr-4">Welcome, {$currentUser.name}!</span>
					<button
						onclick={logout}
						class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
					>
						Logout
					</button>
				{:else}
					<button
						onclick={() => (showLogin = true)}
						class="px-4 py-2 border border-white text-white rounded hover:bg-white hover:text-slate-900"
					>
						Login
					</button>
					<button
						onclick={() => (showRegister = true)}
						class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
					>
						Sign Up
					</button>
				{/if}
			</div>
		</nav>
	</header>

	<!-- Hero Section -->
	<main class="container mx-auto px-4 py-20">
		<div class="text-center space-y-6">
			<h2 class="text-5xl font-bold text-white">Welcome to FLI Fantasy Golf</h2>
			<p class="text-xl text-slate-300 max-w-2xl mx-auto">
				Join leagues, draft your team, and compete with friends in the ultimate fantasy golf
				experience.
			</p>

			{#if !$currentUser}
				<div class="flex gap-4 justify-center pt-8">
					<button
						onclick={() => (showRegister = true)}
						class="px-6 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700"
					>
						Get Started
					</button>
					<button
						onclick={() => (showLogin = true)}
						class="px-6 py-3 border-2 border-white text-white text-lg rounded-lg hover:bg-white hover:text-slate-900"
					>
						Sign In
					</button>
				</div>
			{/if}
		</div>

		<!-- Features -->
		<div class="grid md:grid-cols-3 gap-6 mt-20">
			<div class="bg-white rounded-lg p-6 shadow-lg">
				<h3 class="text-xl font-bold mb-2">Create Leagues</h3>
				<p class="text-gray-600">Start your own league or join existing ones with friends</p>
			</div>

			<div class="bg-white rounded-lg p-6 shadow-lg">
				<h3 class="text-xl font-bold mb-2">Draft Teams</h3>
				<p class="text-gray-600">Build your dream team with strategic draft picks</p>
			</div>

			<div class="bg-white rounded-lg p-6 shadow-lg">
				<h3 class="text-xl font-bold mb-2">Track Scores</h3>
				<p class="text-gray-600">Follow live scoring and compete for the top spot</p>
			</div>
		</div>
	</main>
</div>

<LoginModal bind:open={showLogin} />
<RegisterModal bind:open={showRegister} />
