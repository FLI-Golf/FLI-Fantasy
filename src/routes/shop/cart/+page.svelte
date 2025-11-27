<script lang="ts">
	import { cart } from '$lib/stores/cart';
	import { goto } from '$app/navigation';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	
	let total = $derived(cart.getTotal($cart));
	let itemCount = $derived(cart.getCount($cart));
	
	function formatPrice(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}
	
	function updateQuantity(itemId: string, newQuantity: number, variantId?: string) {
		cart.updateQuantity(itemId, newQuantity, variantId);
	}
	
	function removeItem(itemId: string, variantId?: string) {
		cart.removeItem(itemId, variantId);
	}
	
	async function proceedToCheckout() {
		if ($cart.length === 0) return;
		goto('/shop/checkout');
	}
</script>

<div class="max-w-4xl mx-auto space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="p-3 bg-black rounded-lg shadow-lg">
				<ShoppingCart class="h-8 w-8 text-white" />
			</div>
			<div>
				<h1 class="text-3xl font-bold text-white">Shopping Cart</h1>
				<p class="text-white/80">{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
			</div>
		</div>
		
		<Button href="/shop" variant="outline" class="bg-white/10 text-white border-white/20 hover:bg-white/20">
			<ArrowLeft class="h-4 w-4 mr-2" />
			Continue Shopping
		</Button>
	</div>

	{#if $cart.length === 0}
		<!-- Empty Cart -->
		<Card.Root class="bg-white">
			<Card.Content class="py-12 text-center">
				<div class="flex justify-center mb-4">
					<div class="p-4 bg-gray-100 rounded-full">
						<ShoppingCart class="h-12 w-12 text-gray-400" />
					</div>
				</div>
				<h3 class="text-xl font-semibold text-black mb-2">Your cart is empty</h3>
				<p class="text-gray-600 mb-6">Add some items to get started!</p>
				<Button href="/shop" class="bg-[#2F91F6] hover:bg-[#2580d6] text-white">
					Browse Products
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Cart Items -->
		<div class="space-y-4">
			{#each $cart as item}
				<Card.Root class="bg-white">
					<Card.Content class="p-6">
						<div class="flex gap-4">
							<!-- Product Image -->
							<div class="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
								{#if item.image}
									<img 
										src={item.image}
										alt={item.name}
										class="w-full h-full object-cover"
									/>
								{:else}
									<div class="w-full h-full bg-gradient-to-br from-[#2F91F6] to-black flex items-center justify-center">
										<ShoppingCart class="h-8 w-8 text-white/50" />
									</div>
								{/if}
							</div>
							
							<!-- Product Info -->
							<div class="flex-1">
								<h3 class="text-lg font-bold text-black">{item.name}</h3>
								{#if item.variant}
									<p class="text-sm text-gray-600">{item.variant.name}</p>
								{/if}
								<p class="text-lg font-semibold text-[#2F91F6] mt-2">
									{formatPrice(item.price)}
								</p>
							</div>
							
							<!-- Quantity Controls -->
							<div class="flex flex-col items-end gap-2">
								<div class="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
									<button
										onclick={() => updateQuantity(item.id, item.quantity - 1, item.variant?.id)}
										class="p-1 hover:bg-gray-200 rounded transition-colors"
										aria-label="Decrease quantity"
									>
										<Minus class="h-4 w-4" />
									</button>
									<span class="w-8 text-center font-semibold">{item.quantity}</span>
									<button
										onclick={() => updateQuantity(item.id, item.quantity + 1, item.variant?.id)}
										class="p-1 hover:bg-gray-200 rounded transition-colors"
										aria-label="Increase quantity"
									>
										<Plus class="h-4 w-4" />
									</button>
								</div>
								
								<p class="text-sm font-semibold text-black">
									{formatPrice(item.price * item.quantity)}
								</p>
								
								<button
									onclick={() => removeItem(item.id, item.variant?.id)}
									class="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
								>
									<Trash2 class="h-4 w-4" />
									Remove
								</button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Cart Summary -->
		<Card.Root class="bg-white">
			<Card.Content class="p-6">
				<div class="space-y-4">
					<div class="flex justify-between text-lg">
						<span class="text-gray-600">Subtotal</span>
						<span class="font-semibold text-black">{formatPrice(total)}</span>
					</div>
					
					<div class="flex justify-between text-lg">
						<span class="text-gray-600">Shipping</span>
						<span class="text-sm text-gray-500">Calculated at checkout</span>
					</div>
					
					<div class="border-t pt-4">
						<div class="flex justify-between text-2xl font-bold">
							<span class="text-black">Total</span>
							<span class="text-[#2F91F6]">{formatPrice(total)}</span>
						</div>
					</div>
					
					<Button 
						onclick={proceedToCheckout}
						class="w-full bg-[#2F91F6] hover:bg-[#2580d6] text-white text-lg py-6"
					>
						Proceed to Checkout
					</Button>
					
					<p class="text-sm text-gray-500 text-center">
						Secure checkout powered by Stripe
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
