<script lang="ts">
	import { cart } from '$lib/stores/cart';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Plus from '@lucide/svelte/icons/plus';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();
	
	function formatPrice(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}
	
	function addToCart(product: any) {
		cart.addItem({
			id: product.id,
			name: product.name,
			price: product.price,
			quantity: 1,
			stripe_price_id: product.stripe_price_id,
			image: product.images?.[0] || null
		});
	}
</script>

<div class="max-w-7xl mx-auto space-y-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="p-3 bg-black rounded-lg shadow-lg">
				<ShoppingBag class="h-8 w-8 text-white" />
			</div>
			<div>
				<h1 class="text-3xl font-bold text-white">FLI Golf Shop</h1>
				<p class="text-white/80">Official merchandise and tickets</p>
			</div>
		</div>
		
		<a href="/shop/cart">
			<Button class="bg-white text-[#2F91F6] hover:bg-gray-100">
				<ShoppingCart class="h-4 w-4 mr-2" />
				Cart ({$cart.length})
			</Button>
		</a>
	</div>

	<!-- Categories Filter -->
	{#if data.categories.length > 0}
		<div class="flex gap-2 flex-wrap">
			<Button variant="outline" class="bg-white/10 text-white border-white/20 hover:bg-white/20">
				All Products
			</Button>
			{#each data.categories as category}
				<Button variant="outline" class="bg-white/10 text-white border-white/20 hover:bg-white/20">
					{category.name}
				</Button>
			{/each}
		</div>
	{/if}

	<!-- Products Grid -->
	{#if data.products.length === 0}
		<Card.Root class="bg-white">
			<Card.Content class="py-12 text-center">
				<div class="flex justify-center mb-4">
					<div class="p-4 bg-gray-100 rounded-full">
						<ShoppingBag class="h-12 w-12 text-gray-400" />
					</div>
				</div>
				<h3 class="text-xl font-semibold text-black mb-2">No Products Available</h3>
				<p class="text-gray-600">Check back soon for new items!</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each data.products as product}
				<Card.Root class="bg-white hover:shadow-2xl transition-shadow overflow-hidden">
					<!-- Product Image -->
					{#if product.images && product.images.length > 0}
						<div class="aspect-square bg-gray-100 flex items-center justify-center">
							<img 
								src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/${product.collectionId}/${product.id}/${product.images[0]}`}
								alt={product.name}
								class="w-full h-full object-cover"
							/>
						</div>
					{:else}
						<div class="aspect-square bg-gradient-to-br from-[#2F91F6] to-black flex items-center justify-center">
							<ShoppingBag class="h-16 w-16 text-white/50" />
						</div>
					{/if}
					
					<Card.Content class="p-6">
						<!-- Featured Badge -->
						{#if product.is_featured}
							<span class="inline-block px-2 py-1 bg-[#2F91F6] text-white text-xs font-semibold rounded mb-2">
								FEATURED
							</span>
						{/if}
						
						<!-- Product Name -->
						<h3 class="text-xl font-bold text-black mb-2">{product.name}</h3>
						
						<!-- Short Description -->
						{#if product.short_description}
							<p class="text-gray-600 text-sm mb-4 line-clamp-2">
								{product.short_description}
							</p>
						{/if}
						
						<!-- Price -->
						<div class="flex items-center justify-between mb-4">
							<div>
								<span class="text-2xl font-bold text-black">
									{formatPrice(product.price)}
								</span>
								{#if product.compare_at_price && product.compare_at_price > product.price}
									<span class="text-sm text-gray-400 line-through ml-2">
										{formatPrice(product.compare_at_price)}
									</span>
								{/if}
							</div>
							
							<!-- Product Type Badge -->
							<span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
								{product.product_type.replace('_', ' ').toUpperCase()}
							</span>
						</div>
						
						<!-- Stock Status -->
						{#if product.stock_quantity !== null}
							{#if product.stock_quantity > 0}
								<p class="text-sm text-green-600 mb-4">
									{product.stock_quantity} in stock
								</p>
							{:else}
								<p class="text-sm text-red-600 mb-4">Out of stock</p>
							{/if}
						{/if}
						
						<!-- Actions -->
						<div class="flex gap-2">
							<Button 
								onclick={() => addToCart(product)}
								class="flex-1 bg-[#2F91F6] hover:bg-[#2580d6] text-white"
								disabled={product.stock_quantity === 0}
							>
								<Plus class="h-4 w-4 mr-2" />
								Add to Cart
							</Button>
							<Button 
								href={`/shop/products/${product.slug}`}
								variant="outline"
								class="border-gray-300"
							>
								Details
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
