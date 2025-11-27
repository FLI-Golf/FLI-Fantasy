<script lang="ts">
	import { cart } from '$lib/stores/cart';
	import { redirectToCheckout } from '$lib/stripe';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Lock from '@lucide/svelte/icons/lock';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	
	let email = $state('');
	let loading = $state(false);
	let error = $state('');
	
	let total = $derived(cart.getTotal($cart));
	
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
		if (!email) {
			error = 'Please enter your email address';
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
					customerEmail: email
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

	<!-- Checkout Form -->
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
						bind:value={email}
						placeholder="your@email.com"
						required
						class="bg-white"
					/>
					<p class="text-sm text-gray-500">
						We'll send your order confirmation here
					</p>
				</div>
				
				{#if error}
					<div class="p-4 bg-red-50 border border-red-200 rounded-lg">
						<p class="text-sm text-red-600">{error}</p>
					</div>
				{/if}
				
				<Button 
					type="submit"
					disabled={loading || !email}
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
