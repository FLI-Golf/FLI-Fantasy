<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { currentUser, pb } from '$lib/pocketbase';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import RegisterModal from '$lib/components/RegisterModal.svelte';
	import LogOut from '@lucide/svelte/icons/log-out';
	import LogIn from '@lucide/svelte/icons/log-in';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import Users from '@lucide/svelte/icons/users';
	import Facebook from '@lucide/svelte/icons/facebook';
	import Twitter from '@lucide/svelte/icons/twitter';
	import Instagram from '@lucide/svelte/icons/instagram';
	import Youtube from '@lucide/svelte/icons/youtube';
	import Linkedin from '@lucide/svelte/icons/linkedin';

	let { children } = $props();
	
	let showLogin = $state(false);
	let showRegister = $state(false);

	function logout() {
		pb.authStore.clear();
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-[#2F91F6] flex flex-col">
	<!-- Header with Logo and Auth -->
	<header class="bg-black border-b border-gray-800">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<a href="/" class="inline-block">
					<img 
						src="/brand_logos/fligolf-logo-white-2048x228.png" 
						alt="FLI Golf Logo" 
						class="h-12 w-auto"
					/>
				</a>
				
				<nav class="flex items-center gap-2">
					{#if $currentUser}
						<span class="text-white mr-4 flex items-center gap-2">
							<Users class="h-4 w-4" />
							Welcome, {$currentUser.name}!
						</span>
						<button
							onclick={logout}
							class="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
						>
							<LogOut class="h-4 w-4" />
							Logout
						</button>
					{:else}
						<button
							onclick={() => (showLogin = true)}
							class="px-4 py-2 border-2 border-white text-white rounded-lg hover:bg-white hover:text-black flex items-center gap-2 transition-colors"
						>
							<LogIn class="h-4 w-4" />
							Login
						</button>
						<button
							onclick={() => (showRegister = true)}
							class="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
						>
							<UserPlus class="h-4 w-4" />
							Sign Up
						</button>
					{/if}
				</nav>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="container mx-auto px-4 py-8 flex-grow">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="bg-black border-t border-gray-800 mt-auto">
		<div class="container mx-auto px-4 py-8">
			<div class="flex flex-col md:flex-row items-center justify-between gap-6">
				<!-- Logo and Copyright -->
				<div class="flex flex-col items-center md:items-start gap-3">
					<img 
						src="/brand_logos/fligolf-logo-white-2048x228.png" 
						alt="FLI Golf Logo" 
						class="h-10 w-auto"
					/>
					<p class="text-gray-400 text-sm">
						© {new Date().getFullYear()} FLI Golf. All rights reserved.
					</p>
				</div>

				<!-- Social Media Links -->
				<div class="flex items-center gap-4">
					<p class="text-white text-sm mr-2">Follow us:</p>
					<a 
						href="#" 
						class="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
						aria-label="Facebook"
					>
						<Facebook class="h-5 w-5" />
					</a>
					<a 
						href="#" 
						class="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
						aria-label="Twitter"
					>
						<Twitter class="h-5 w-5" />
					</a>
					<a 
						href="#" 
						class="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
						aria-label="Instagram"
					>
						<Instagram class="h-5 w-5" />
					</a>
					<a 
						href="#" 
						class="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
						aria-label="YouTube"
					>
						<Youtube class="h-5 w-5" />
					</a>
					<a 
						href="#" 
						class="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
						aria-label="LinkedIn"
					>
						<Linkedin class="h-5 w-5" />
					</a>
				</div>
			</div>
		</div>
	</footer>
</div>

<LoginModal bind:open={showLogin} />
<RegisterModal bind:open={showRegister} />
