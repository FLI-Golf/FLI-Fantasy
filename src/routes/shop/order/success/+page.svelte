<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Home from '@lucide/svelte/icons/home';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	
	let sessionId = $state('');
	
	onMount(() => {
		sessionId = $page.url.searchParams.get('session_id') || '';
	});
</script>

<div class="max-w-2xl mx-auto space-y-6">
	<!-- Success Message -->
	<Card.Root class="bg-white">
		<Card.Content class="py-12 text-center">
			<div class="flex justify-center mb-6">
				<div class="p-4 bg-green-100 rounded-full">
					<CheckCircle class="h-16 w-16 text-green-600" />
				</div>
			</div>
			
			<h1 class="text-3xl font-bold text-black mb-2">
				Order Confirmed!
			</h1>
			
			<p class="text-lg text-gray-600 mb-6">
				Thank you for your purchase from FLI Golf Shop
			</p>
			
			{#if sessionId}
				<div class="bg-gray-50 rounded-lg p-4 mb-6">
					<p class="text-sm text-gray-500 mb-1">Session ID</p>
					<p class="text-sm font-mono text-gray-700 break-all">{sessionId}</p>
				</div>
			{/if}
			
			<div class="space-y-4 text-left max-w-md mx-auto">
				<div class="flex items-start gap-3">
					<CheckCircle class="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
					<div>
						<p class="font-semibold text-black">Payment Successful</p>
						<p class="text-sm text-gray-600">Your payment has been processed</p>
					</div>
				</div>
				
				<div class="flex items-start gap-3">
					<CheckCircle class="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
					<div>
						<p class="font-semibold text-black">Order Confirmed</p>
						<p class="text-sm text-gray-600">We've received your order</p>
					</div>
				</div>
				
				<div class="flex items-start gap-3">
					<CheckCircle class="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
					<div>
						<p class="font-semibold text-black">Confirmation Email</p>
						<p class="text-sm text-gray-600">Check your inbox for order details</p>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- What's Next -->
	<Card.Root class="bg-white">
		<Card.Header>
			<h2 class="text-xl font-bold text-black">What's Next?</h2>
		</Card.Header>
		<Card.Content class="space-y-4">
			<p class="text-gray-600">
				For physical items, we'll process your order and send you tracking information once it ships.
			</p>
			<p class="text-gray-600">
				For digital items and tickets, you'll receive access details via email shortly.
			</p>
		</Card.Content>
	</Card.Root>

	<!-- Actions -->
	<div class="flex gap-4">
		<Button href="/shop" class="flex-1 bg-[#2F91F6] hover:bg-[#2580d6] text-white">
			<ShoppingBag class="h-4 w-4 mr-2" />
			Continue Shopping
		</Button>
		<Button href="/" variant="outline" class="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20">
			<Home class="h-4 w-4 mr-2" />
			Go Home
		</Button>
	</div>

	<!-- Support -->
	<Card.Root class="bg-white/10 border-white/20">
		<Card.Content class="p-4 text-center">
			<p class="text-sm text-white/80">
				Questions about your order? Contact us at{' '}
				<a href="mailto:support@fligolf.com" class="underline">support@fligolf.com</a>
			</p>
		</Card.Content>
	</Card.Root>
</div>
