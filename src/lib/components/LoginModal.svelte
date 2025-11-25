<script lang="ts">
	import { pb } from '$lib/pocketbase';
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
			await pb.collection('users').authWithPassword(email, password);
			open = false;
			email = '';
			password = '';
		} catch (err: any) {
			error = err.message || 'Login failed';
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px] border-2 border-purple-200">
		<Dialog.Header>
			<div class="flex items-center gap-2">
				<div class="p-2 bg-gradient-to-br from-deep-blue-500 to-purple-600 rounded-lg">
					<LogIn class="h-5 w-5 text-white" />
				</div>
				<Dialog.Title class="text-deep-blue-900">Login</Dialog.Title>
			</div>
			<Dialog.Description>Enter your credentials to access your account.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<Label for="email" class="flex items-center gap-2 text-deep-blue-800">
					<Mail class="h-4 w-4 text-purple-600" />
					Email
				</Label>
				<Input
					id="email"
					type="email"
					bind:value={email}
					required
					class="border-purple-200 focus:border-purple-500 focus:ring-purple-500"
				/>
			</div>

			<div class="space-y-2">
				<Label for="password" class="flex items-center gap-2 text-deep-blue-800">
					<Lock class="h-4 w-4 text-purple-600" />
					Password
				</Label>
				<Input
					id="password"
					type="password"
					bind:value={password}
					required
					class="border-purple-200 focus:border-purple-500 focus:ring-purple-500"
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
					class="bg-gradient-to-r from-purple-600 to-deep-blue-600 hover:from-purple-700 hover:to-deep-blue-700"
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
