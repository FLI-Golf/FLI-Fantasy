<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import User from '@lucide/svelte/icons/user';
	import Mail from '@lucide/svelte/icons/mail';
	import Lock from '@lucide/svelte/icons/lock';
	import CheckCircle from '@lucide/svelte/icons/check-circle';

	let { open = $bindable(false) } = $props();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (password !== passwordConfirm) {
			error = "Passwords don't match";
			return;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters';
			return;
		}

		loading = true;

		try {
			await pb.collection('users').create({
				email,
				password,
				passwordConfirm,
				name
			});

			// Auto-login after registration
			await pb.collection('users').authWithPassword(email, password);
			open = false;
			name = '';
			email = '';
			password = '';
			passwordConfirm = '';
		} catch (err: any) {
			error = err.message || 'Registration failed';
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px] border-2 border-gold-200">
		<Dialog.Header>
			<div class="flex items-center gap-2">
				<div class="p-2 bg-gradient-to-br from-gold-500 to-gold-600 rounded-lg">
					<UserPlus class="h-5 w-5 text-white" />
				</div>
				<Dialog.Title class="text-deep-blue-900">Create Account</Dialog.Title>
			</div>
			<Dialog.Description>Sign up to start playing fantasy golf.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<Label for="name" class="flex items-center gap-2 text-deep-blue-800">
					<User class="h-4 w-4 text-gold-600" />
					Name
				</Label>
				<Input
					id="name"
					type="text"
					bind:value={name}
					required
					class="border-gold-200 focus:border-gold-500 focus:ring-gold-500"
				/>
			</div>

			<div class="space-y-2">
				<Label for="email" class="flex items-center gap-2 text-deep-blue-800">
					<Mail class="h-4 w-4 text-gold-600" />
					Email
				</Label>
				<Input
					id="email"
					type="email"
					bind:value={email}
					required
					class="border-gold-200 focus:border-gold-500 focus:ring-gold-500"
				/>
			</div>

			<div class="space-y-2">
				<Label for="password" class="flex items-center gap-2 text-deep-blue-800">
					<Lock class="h-4 w-4 text-gold-600" />
					Password
				</Label>
				<Input
					id="password"
					type="password"
					bind:value={password}
					required
					class="border-gold-200 focus:border-gold-500 focus:ring-gold-500"
				/>
			</div>

			<div class="space-y-2">
				<Label for="passwordConfirm" class="flex items-center gap-2 text-deep-blue-800">
					<CheckCircle class="h-4 w-4 text-gold-600" />
					Confirm Password
				</Label>
				<Input
					id="passwordConfirm"
					type="password"
					bind:value={passwordConfirm}
					required
					class="border-gold-200 focus:border-gold-500 focus:ring-gold-500"
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
					class="bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-white"
				>
					{#if loading}
						Creating Account...
					{:else}
						<UserPlus class="h-4 w-4 mr-2" />
						Create Account
					{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
