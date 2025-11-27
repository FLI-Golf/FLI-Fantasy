# Product Sync Guide - PocketBase to Stripe

## Overview

This guide shows you how to sync products from your PocketBase database to Stripe, making them available for checkout.

---

## How It Works

The sync script:
1. ✅ Reads products from PocketBase `products` collection
2. ✅ Creates corresponding products in Stripe
3. ✅ Creates prices in Stripe (in cents)
4. ✅ Syncs product variants (sizes, colors) as separate prices
5. ✅ Updates PocketBase with Stripe product/price IDs
6. ✅ Handles product images (converts PocketBase URLs)

---

## Prerequisites

Before syncing, you need products in PocketBase:

### Step 1: Create Product Categories

Access PocketBase Admin: `https://pocketbase-production-e678.up.railway.app/_/`

1. Go to **Collections** → **product_categories**
2. Click **"New record"**
3. Create categories like:
   - **Apparel** (slug: `apparel`)
   - **Tickets** (slug: `tickets`)
   - **Fantasy Leagues** (slug: `fantasy-leagues`)

### Step 2: Create Products

1. Go to **Collections** → **products**
2. Click **"New record"**
3. Fill in the fields:

**Example: T-Shirt**
```
name: FLI Golf Tour T-Shirt
slug: fli-golf-tour-tshirt
description: Official FLI Golf Tour t-shirt with logo
short_description: Official tour t-shirt
category: [Select Apparel]
product_type: clothing
price: 2999 (= $29.99 in cents)
is_active: true
is_featured: true
requires_shipping: true
stock_quantity: 100
images: [Upload product images]
```

**Example: Event Ticket**
```
name: FLI Golf Championship - VIP Pass
slug: championship-vip-pass
description: VIP access to the championship event
category: [Select Tickets]
product_type: ticket
price: 15000 (= $150.00 in cents)
is_active: true
requires_shipping: false
stock_quantity: 50
```

**Example: Fantasy League**
```
name: Premium Fantasy League
slug: premium-fantasy-league
description: Unlock premium fantasy league features
category: [Select Fantasy Leagues]
product_type: fantasy_league
price: 999 (= $9.99 in cents)
is_active: true
requires_shipping: false
```

### Step 3: Create Product Variants (Optional - for clothing)

1. Go to **Collections** → **product_variants**
2. Click **"New record"**
3. Create variants:

**Example: T-Shirt Sizes**
```
product: [Select FLI Golf Tour T-Shirt]
name: Small - Black
size: S
color: Black
sku: FLIGOLF-TSHIRT-S-BLACK
price_adjustment: 0
stock_quantity: 25
is_active: true
```

Repeat for other sizes (M, L, XL) and colors.

---

## Running the Sync

### Sync All Products

```bash
pnpm run stripe:sync
```

This will:
- Read all products from PocketBase
- Create them in Stripe
- Update PocketBase with Stripe IDs

### What You'll See

```
🚀 Starting Product Sync to Stripe...

📍 PocketBase: https://pocketbase-production-e678.up.railway.app
📍 Stripe: Test Mode

🔐 Authenticating as admin...
✅ Authenticated successfully

📋 Fetching products from PocketBase...
✅ Found 3 product(s)

📦 Syncing product: FLI Golf Tour T-Shirt
   ✅ Created Stripe product: prod_xxxxx
   ✅ Created Stripe price: price_xxxxx
   ✅ Updated PocketBase product with Stripe IDs

   🔄 Syncing variants for product...
   📦 Found 4 variant(s)
      ✅ Synced variant "Small - Black" (price_xxxxx)
      ✅ Synced variant "Medium - Black" (price_xxxxx)
      ✅ Synced variant "Large - Black" (price_xxxxx)
      ✅ Synced variant "XL - Black" (price_xxxxx)
   ✅ Finished syncing variants

📦 Syncing product: Championship VIP Pass
   ✅ Created Stripe product: prod_yyyyy
   ✅ Created Stripe price: price_yyyyy
   ✅ Updated PocketBase product with Stripe IDs

📦 Syncing product: Premium Fantasy League
   ✅ Created Stripe product: prod_zzzzz
   ✅ Created Stripe price: price_zzzzz
   ✅ Updated PocketBase product with Stripe IDs

✅ Product sync completed!

📊 Summary:
   ✅ Successful: 3
   ❌ Failed: 0
   📦 Total: 3

🎉 Your products are now available in Stripe!
```

---

## Verify in Stripe Dashboard

1. Go to [Stripe Dashboard - Products](https://dashboard.stripe.com/test/products)
2. You should see your products listed
3. Click on a product to see:
   - Product details
   - Prices
   - Metadata (PocketBase ID, product type, etc.)

---

## Re-running the Sync

The script is **idempotent** - you can run it multiple times safely:

- ✅ Products already synced will be skipped
- ✅ New products will be created
- ✅ Existing products won't be duplicated

To force re-sync:
1. Delete `stripe_product_id` and `stripe_price_id` from PocketBase
2. Run sync again

---

## Product Data Mapping

### PocketBase → Stripe

| PocketBase Field | Stripe Field | Notes |
|------------------|--------------|-------|
| `name` | `product.name` | Product name |
| `description` | `product.description` | Full description |
| `images` | `product.images` | Converted to full URLs |
| `is_active` | `product.active` | Active status |
| `price` | `price.unit_amount` | Already in cents |
| `id` | `metadata.pocketbase_id` | For reference |
| `product_type` | `metadata.product_type` | clothing/ticket/fantasy_league |
| `slug` | `metadata.slug` | URL slug |

### Variants

| PocketBase Field | Stripe Field | Notes |
|------------------|--------------|-------|
| `name` | `metadata.variant_name` | Variant name |
| `size` | `metadata.size` | Size (S, M, L, XL) |
| `color` | `metadata.color` | Color name |
| `price_adjustment` | Calculated into `unit_amount` | Added to base price |

---

## Troubleshooting

### "No products to sync"

**Solution:** Create products in PocketBase first
- Access: `https://pocketbase-production-e678.up.railway.app/_/`
- Go to Collections → products
- Add at least one product

### "Authentication failed"

**Solution:** Check your `.env` file has correct credentials:
```bash
POCKETBASE_ADMIN_EMAIL=your-email@example.com
POCKETBASE_ADMIN_PASSWORD=your-password
```

### "Stripe API error"

**Solution:** Check your Stripe secret key:
```bash
STRIPE_SECRET_KEY=sk_test_...
```

### Images not showing in Stripe

**Cause:** PocketBase images need to be publicly accessible

**Solution:** 
- Make sure images are uploaded to PocketBase
- Check PocketBase is accessible from internet
- Images will use format: `https://your-pocketbase.com/api/files/...`

### Variants not syncing

**Solution:**
- Make sure variants are linked to the correct product
- Check `product` field in variant points to product ID
- Ensure base product was synced first

---

## Price Format

⚠️ **Important:** Prices in PocketBase should be in **cents**

| Display Price | PocketBase Value | Stripe Value |
|---------------|------------------|--------------|
| $9.99 | 999 | 999 |
| $29.99 | 2999 | 2999 |
| $150.00 | 15000 | 15000 |

---

## Next Steps

After syncing products:

1. ✅ Products are in Stripe
2. ⏳ Build product listing page
3. ⏳ Create shopping cart
4. ⏳ Implement checkout flow
5. ⏳ Test with Stripe test cards
6. ⏳ Go live!

---

## Useful Commands

```bash
# Sync products to Stripe
pnpm run stripe:sync

# View products in Stripe CLI
stripe products list

# View prices in Stripe CLI
stripe prices list

# Delete a product (if needed)
stripe products delete prod_xxxxx
```

---

## Example Product JSON

For reference, here's what a complete product looks like in PocketBase:

```json
{
  "name": "FLI Golf Tour T-Shirt",
  "slug": "fli-golf-tour-tshirt",
  "description": "Official FLI Golf Tour t-shirt featuring the tour logo",
  "short_description": "Official tour t-shirt",
  "category": "category_id_here",
  "product_type": "clothing",
  "price": 2999,
  "compare_at_price": 3999,
  "images": ["image1.jpg", "image2.jpg"],
  "is_active": true,
  "is_featured": true,
  "stock_quantity": 100,
  "requires_shipping": true,
  "stripe_product_id": "prod_xxxxx",
  "stripe_price_id": "price_xxxxx"
}
```

---

## Resources

- [Stripe Products API](https://stripe.com/docs/api/products)
- [Stripe Prices API](https://stripe.com/docs/api/prices)
- [PocketBase Collections](https://pocketbase.io/docs/collections/)
