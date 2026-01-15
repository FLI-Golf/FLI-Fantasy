<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import { goto } from '$app/navigation';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import LogIn from '@lucide/svelte/icons/log-in';
	import Mail from '@lucide/svelte/icons/mail';
	import Lock from '@lucide/svelte/icons/lock';

	let { open = $bindable(false) } = $props();

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			console.log('🔐 Attempting login...');
			const authData = await pb.collection('users').authWithPassword(email, password);
			console.log('✅ Login successful:', authData.record.email);
			
			// Save to cookie explicitly
			document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
			console.log('🍪 Auth cookie saved');
			
			// Fetch user profile to get role
			let userRole: string | null = null;
			try {
				const profile = await pb.collection('user_profile').getFirstListItem(`user="${authData.record.id}"`);
				userRole = profile.role as string;
				console.log('👤 User role from profile:', userRole);
			} catch (err) {
				console.warn('⚠️ Could not fetch user profile:', err);
			}
			
			// Redirect users based on role
			let redirectPath = '/';
			if (userRole === 'admin') {
				console.log('🔄 Redirecting to admin dashboard...');
				redirectPath = '/admin';
			} else if (userRole === 'league_admin') {
				console.log('🔄 Redirecting to league admin dashboard...');
				redirectPath = '/admin';
			} else if (userRole === 'scorekeeper') {
				console.log('🔄 Redirecting to scorekeeper dashboard...');
				redirectPath = '/scorekeeper';
			} else if (userRole === 'league_member' || userRole === 'free') {
				console.log('🔄 Redirecting to player dashboard...');
				redirectPath = '/player';
			} else {
				console.log('⚠️ No matching role, staying on current page. Role was:', userRole);
			}
			
			open = false;
			email = '';
			password = '';
			
			// Use goto for SvelteKit navigation
			if (redirectPath !== '/') {
				await goto(redirectPath);
			}
		} catch (err: any) {
			console.error('❌ Login failed:', err);
			// Provide more helpful error message
			if (err.status === 400) {
				error = 'Invalid email or password';
			} else if (err.status === 404) {
				error = 'User not found';
			} else {
				error = err.message || 'Login failed';
			}
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px] bg-white border-2 border-gray-200">
		<Dialog.Header>
			<div class="flex items-center gap-2">
				<div class="p-2 bg-black rounded-lg">
					<LogIn class="h-5 w-5 text-white" />
				</div>
				<Dialog.Title class="text-black">Login</Dialog.Title>
			</div>
			<Dialog.Description class="text-gray-600">Enter your credentials to access your account.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<Label for="email" class="flex items-center gap-2 text-black">
					<Mail class="h-4 w-4 text-[#2F91F6]" />
					Email
				</Label>
				<Input
					id="email"
					type="email"
					bind:value={email}
					required
					class="bg-white border-gray-300 focus:border-[#2F91F6] focus:ring-[#2F91F6] text-black"
				/>
			</div>

			<div class="space-y-2">
				<Label for="password" class="flex items-center gap-2 text-black">
					<Lock class="h-4 w-4 text-[#2F91F6]" />
					Password
				</Label>
				<Input
					id="password"
					type="password"
					bind:value={password}
					required
					class="bg-white border-gray-300 focus:border-[#2F91F6] focus:ring-[#2F91F6] text-black"
				/>
			</div>

			{#if error}
				<p class="text-sm text-red-500">{error}</p>
			{/if}

			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button
					type="submit"
					disabled={loading}
					class="bg-black hover:bg-gray-800 text-white"
				>
					{#if loading}
						Logging in...
					{:else}
						<LogIn class="h-4 w-4 mr-2" />
						Login
					{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
