<script lang="ts">
	import { cart } from '$lib/stores/cart';
	import { currentUser } from '$lib/pocketbase';
	import { redirectToCheckout } from '$lib/stripe';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Lock from '@lucide/svelte/icons/lock';
	import LogIn from '@lucide/svelte/icons/log-in';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import LoginModal from '$lib/components/LoginModal.svelte';
	import RegisterModal from '$lib/components/RegisterModal.svelte';
	
	let loading = $state(false);
	let error = $state('');
	let showLogin = $state(false);
	let showRegister = $state(false);
	
	let total = $derived(cart.getTotal($cart));
	let isAuthenticated = $derived(!!$currentUser);
	let userEmail = $derived($currentUser?.email || '');
	
	onMount(() => {
		// Redirect if cart is empty
		if ($cart.length === 0) {
			goto('/shop');
		}
	});
	
	function formatPrice(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}
	
	async function handleCheckout() {
		if (!isAuthenticated) {
			error = 'Please login or create an account to continue';
			return;
		}
		
		loading = true;
		error = '';
		
		try {
			// Create checkout session
			const response = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items: $cart,
					customerEmail: userEmail,
					userId: $currentUser?.id
				})
			});
			
			const data = await response.json();
			
			if (!response.ok) {
				throw new Error(data.error || 'Failed to create checkout session');
			}
			
			// Redirect to Stripe Checkout
			await redirectToCheckout(data.sessionId);
			
			// Clear cart after successful redirect
			cart.clear();
			
		} catch (err: any) {
			console.error('Checkout error:', err);
			error = err.message || 'Something went wrong. Please try again.';
			loading = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<div class="p-3 bg-black rounded-lg shadow-lg">
			<CreditCard class="h-8 w-8 text-white" />
		</div>
		<div>
			<h1 class="text-3xl font-bold text-white">Checkout</h1>
			<p class="text-white/80">Secure payment with Stripe</p>
		</div>
	</div>

	<!-- Order Summary -->
	<Card.Root class="bg-white">
		<Card.Header>
			<h2 class="text-xl font-bold text-black">Order Summary</h2>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#each $cart as item}
				<div class="flex justify-between">
					<div>
						<p class="font-semibold text-black">{item.name}</p>
						{#if item.variant}
							<p class="text-sm text-gray-600">{item.variant.name}</p>
						{/if}
						<p class="text-sm text-gray-600">Qty: {item.quantity}</p>
					</div>
					<p class="font-semibold text-black">
						{formatPrice(item.price * item.quantity)}
					</p>
				</div>
			{/each}
			
			<div class="border-t pt-4">
				<div class="flex justify-between text-2xl font-bold">
					<span class="text-black">Total</span>
					<span class="text-[#2F91F6]">{formatPrice(total)}</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Auth Required Section (when not logged in) -->
	{#if !isAuthenticated}
		<Card.Root class="bg-white">
			<Card.Header>
				<h2 class="text-xl font-bold text-black">Account Required</h2>
				<p class="text-gray-600">Please login or create an account to complete your purchase</p>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<Button 
						onclick={() => showLogin = true}
						variant="outline"
						class="w-full py-6 text-lg border-2 border-[#2F91F6] text-[#2F91F6] hover:bg-[#2F91F6] hover:text-white"
					>
						<LogIn class="h-5 w-5 mr-2" />
						Login
					</Button>
					<Button 
						onclick={() => showRegister = true}
						class="w-full py-6 text-lg bg-[#2F91F6] hover:bg-[#2580d6] text-white"
					>
						<UserPlus class="h-5 w-5 mr-2" />
						Sign Up
					</Button>
				</div>
				
				{#if error}
					<div class="p-4 bg-red-50 border border-red-200 rounded-lg">
						<p class="text-sm text-red-600">{error}</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Checkout Form (when logged in) -->
		<Card.Root class="bg-white">
			<Card.Header>
				<h2 class="text-xl font-bold text-black">Contact Information</h2>
			</Card.Header>
			<Card.Content>
				<form onsubmit={(e) => { e.preventDefault(); handleCheckout(); }} class="space-y-4">
					<div class="space-y-2">
						<Label for="email">Email Address</Label>
						<Input
							id="email"
							type="email"
							value={userEmail}
							disabled
							class="bg-gray-100"
						/>
						<p class="text-sm text-gray-500">
							Order confirmation will be sent to your account email
						</p>
					</div>
					
					{#if error}
						<div class="p-4 bg-red-50 border border-red-200 rounded-lg">
							<p class="text-sm text-red-600">{error}</p>
						</div>
					{/if}
					
					<Button 
						type="submit"
						disabled={loading}
						class="w-full bg-[#2F91F6] hover:bg-[#2580d6] text-white text-lg py-6"
					>
						{#if loading}
							Processing...
						{:else}
							<Lock class="h-4 w-4 mr-2" />
							Pay {formatPrice(total)} with Stripe
						{/if}
					</Button>
					
					<div class="flex items-center justify-center gap-2 text-sm text-gray-500">
						<Lock class="h-4 w-4" />
						<span>Secure checkout powered by Stripe</span>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Test Card Info -->
	<Card.Root class="bg-white/10 border-white/20">
		<Card.Content class="p-4">
			<p class="text-sm text-white/80 mb-2">
				<strong>Test Mode:</strong> Use test card for payment
			</p>
			<p class="text-sm text-white/60 font-mono">
				Card: 4242 4242 4242 4242 | Exp: 12/34 | CVC: 123
			</p>
		</Card.Content>
	</Card.Root>
</div>

<LoginModal bind:open={showLogin} />
<RegisterModal bind:open={showRegister} />
