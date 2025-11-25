<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';

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
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Create Account</Dialog.Title>
			<Dialog.Description>Sign up to start playing fantasy golf.</Dialog.Description>
		</Dialog.Header>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<Label for="name">Name</Label>
				<Input id="name" type="text" bind:value={name} required />
			</div>

			<div class="space-y-2">
				<Label for="email">Email</Label>
				<Input id="email" type="email" bind:value={email} required />
			</div>

			<div class="space-y-2">
				<Label for="password">Password</Label>
				<Input id="password" type="password" bind:value={password} required />
			</div>

			<div class="space-y-2">
				<Label for="passwordConfirm">Confirm Password</Label>
				<Input id="passwordConfirm" type="password" bind:value={passwordConfirm} required />
			</div>

			{#if error}
				<p class="text-sm text-red-500">{error}</p>
			{/if}

			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={loading}>
					{loading ? 'Creating Account...' : 'Create Account'}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
