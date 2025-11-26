# E-Commerce Collections Schema

This document defines the collections needed for the FLI Golf Shop (clothing, tickets, fantasy league purchases) with Stripe integration.

## Collections Overview

1. **products** - All products (clothing, tickets, fantasy leagues)
2. **product_variants** - Size/color variations for products
3. **product_categories** - Product categorization
4. **orders** - Customer orders
5. **order_items** - Individual items in an order
6. **payments** - Payment transactions (Stripe integration)
7. **shipping_addresses** - Customer shipping information

---

## 1. products

**Type:** Base Collection

**Purpose:** Store all products available for purchase

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `name` | text | Yes | min: 3, max: 200 | Product name |
| `slug` | text | Yes | unique, pattern: ^[a-z0-9-]+$ | URL-friendly identifier |
| `description` | text | No | max: 2000 | Product description |
| `short_description` | text | No | max: 200 | Brief description for listings |
| `category` | relation | Yes | product_categories (single) | Product category |
| `product_type` | select | Yes | clothing, ticket, fantasy_league | Type of product |
| `price` | number | Yes | min: 0 | Base price in cents (e.g., 2999 = $29.99) |
| `compare_at_price` | number | No | min: 0 | Original price for sale items |
| `images` | file | No | multiple, maxSize: 5MB | Product images |
| `is_active` | bool | Yes | default: true | Whether product is available |
| `is_featured` | bool | Yes | default: false | Featured on homepage |
| `stock_quantity` | number | No | min: 0 | Available quantity (null = unlimited) |
| `requires_shipping` | bool | Yes | default: true | Whether product needs shipping |
| `stripe_product_id` | text | No | - | Stripe product ID |
| `stripe_price_id` | text | No | - | Stripe price ID |
| `metadata` | json | No | - | Additional product data |

**Indexes:**
- `slug` (unique)
- `category` (for filtering)
- `product_type` (for filtering)
- `is_active` (for filtering)

**API Rules:**
- List: Public (anyone can view)
- View: Public
- Create: Admin only
- Update: Admin only
- Delete: Admin only

---

## 2. product_variants

**Type:** Base Collection

**Purpose:** Handle product variations (sizes, colors)

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `product` | relation | Yes | products (single) | Parent product |
| `name` | text | Yes | max: 100 | Variant name (e.g., "Large - Blue") |
| `sku` | text | No | unique | Stock keeping unit |
| `size` | text | No | max: 20 | Size (S, M, L, XL, etc.) |
| `color` | text | No | max: 50 | Color name |
| `price_adjustment` | number | No | - | Price difference from base (in cents) |
| `stock_quantity` | number | No | min: 0 | Available quantity |
| `is_active` | bool | Yes | default: true | Whether variant is available |
| `stripe_price_id` | text | No | - | Stripe price ID for this variant |

**Indexes:**
- `product` (for filtering)
- `sku` (unique)

**API Rules:**
- List: Public
- View: Public
- Create: Admin only
- Update: Admin only
- Delete: Admin only

---

## 3. product_categories

**Type:** Base Collection

**Purpose:** Organize products into categories

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `name` | text | Yes | min: 2, max: 100 | Category name |
| `slug` | text | Yes | unique, pattern: ^[a-z0-9-]+$ | URL-friendly identifier |
| `description` | text | No | max: 500 | Category description |
| `parent_category` | relation | No | product_categories (single) | Parent category for hierarchy |
| `image` | file | No | maxSize: 2MB | Category image |
| `sort_order` | number | Yes | default: 0 | Display order |
| `is_active` | bool | Yes | default: true | Whether category is visible |

**Indexes:**
- `slug` (unique)
- `parent_category` (for hierarchy)

**API Rules:**
- List: Public
- View: Public
- Create: Admin only
- Update: Admin only
- Delete: Admin only

---

## 4. orders

**Type:** Base Collection

**Purpose:** Track customer orders

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `order_number` | text | Yes | unique | Unique order identifier |
| `user` | relation | No | users (single) | Customer (null for guest checkout) |
| `email` | email | Yes | - | Customer email |
| `status` | select | Yes | pending, processing, shipped, delivered, cancelled, refunded | Order status |
| `subtotal` | number | Yes | min: 0 | Subtotal in cents |
| `tax` | number | Yes | min: 0 | Tax amount in cents |
| `shipping_cost` | number | Yes | min: 0 | Shipping cost in cents |
| `total` | number | Yes | min: 0 | Total amount in cents |
| `currency` | text | Yes | default: "usd" | Currency code |
| `shipping_address` | relation | No | shipping_addresses (single) | Shipping address |
| `billing_email` | email | Yes | - | Billing email |
| `notes` | text | No | max: 1000 | Order notes |
| `stripe_payment_intent_id` | text | No | - | Stripe payment intent ID |
| `stripe_checkout_session_id` | text | No | - | Stripe checkout session ID |
| `paid_at` | date | No | - | Payment completion timestamp |
| `shipped_at` | date | No | - | Shipping timestamp |
| `delivered_at` | date | No | - | Delivery timestamp |

**Indexes:**
- `order_number` (unique)
- `user` (for customer orders)
- `status` (for filtering)
- `email` (for lookup)

**API Rules:**
- List: User can see their own orders, admin sees all
- View: User can see their own orders, admin sees all
- Create: Authenticated users
- Update: Admin only (status changes)
- Delete: Admin only

---

## 5. order_items

**Type:** Base Collection

**Purpose:** Individual items within an order

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `order` | relation | Yes | orders (single, cascade delete) | Parent order |
| `product` | relation | Yes | products (single) | Product purchased |
| `variant` | relation | No | product_variants (single) | Product variant |
| `product_name` | text | Yes | - | Product name at time of purchase |
| `variant_name` | text | No | - | Variant name at time of purchase |
| `quantity` | number | Yes | min: 1 | Quantity purchased |
| `unit_price` | number | Yes | min: 0 | Price per unit in cents |
| `total_price` | number | Yes | min: 0 | Total price in cents |

**Indexes:**
- `order` (for order details)
- `product` (for analytics)

**API Rules:**
- List: User can see items from their orders, admin sees all
- View: User can see items from their orders, admin sees all
- Create: System only (created with order)
- Update: Admin only
- Delete: Admin only

---

## 6. payments

**Type:** Base Collection

**Purpose:** Track payment transactions

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `order` | relation | Yes | orders (single) | Associated order |
| `stripe_payment_intent_id` | text | Yes | unique | Stripe payment intent ID |
| `stripe_charge_id` | text | No | - | Stripe charge ID |
| `amount` | number | Yes | min: 0 | Payment amount in cents |
| `currency` | text | Yes | default: "usd" | Currency code |
| `status` | select | Yes | pending, succeeded, failed, refunded | Payment status |
| `payment_method` | text | No | - | Payment method type |
| `last4` | text | No | - | Last 4 digits of card |
| `receipt_url` | url | No | - | Stripe receipt URL |
| `refund_amount` | number | No | min: 0 | Refunded amount in cents |
| `refunded_at` | date | No | - | Refund timestamp |
| `metadata` | json | No | - | Additional payment data |

**Indexes:**
- `order` (for order payments)
- `stripe_payment_intent_id` (unique)
- `status` (for filtering)

**API Rules:**
- List: Admin only
- View: User can see their own payments, admin sees all
- Create: System only (Stripe webhook)
- Update: System only (Stripe webhook)
- Delete: Admin only

---

## 7. shipping_addresses

**Type:** Base Collection

**Purpose:** Store customer shipping addresses

**Fields:**

| Field Name | Type | Required | Options | Description |
|------------|------|----------|---------|-------------|
| `user` | relation | No | users (single) | User (null for guest) |
| `full_name` | text | Yes | max: 200 | Recipient name |
| `address_line1` | text | Yes | max: 200 | Street address |
| `address_line2` | text | No | max: 200 | Apartment, suite, etc. |
| `city` | text | Yes | max: 100 | City |
| `state` | text | Yes | max: 100 | State/Province |
| `postal_code` | text | Yes | max: 20 | ZIP/Postal code |
| `country` | text | Yes | max: 2 | Country code (ISO 3166-1 alpha-2) |
| `phone` | text | No | max: 20 | Contact phone |
| `is_default` | bool | Yes | default: false | Default address for user |

**Indexes:**
- `user` (for user addresses)

**API Rules:**
- List: User can see their own addresses, admin sees all
- View: User can see their own addresses, admin sees all
- Create: Authenticated users
- Update: User can update their own addresses, admin updates all
- Delete: User can delete their own addresses, admin deletes all

---

## Stripe Integration Notes

### Product Setup
1. Create products in PocketBase first
2. Sync to Stripe using API
3. Store `stripe_product_id` and `stripe_price_id` in PocketBase

### Checkout Flow
1. User adds items to cart (frontend state)
2. Create order in PocketBase with status "pending"
3. Create Stripe Checkout Session with order items
4. Redirect to Stripe Checkout
5. Stripe webhook updates order status to "processing" on success
6. Create payment record from webhook

### Webhook Events to Handle
- `checkout.session.completed` - Order paid
- `payment_intent.succeeded` - Payment successful
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund processed

### Security
- All Stripe operations happen server-side
- Webhook signature verification required
- Store minimal payment data (no card details)
- Use Stripe Customer Portal for subscription management

---

## Example Product Types

### Clothing
- T-shirts, hoodies, hats
- Requires variants (size, color)
- Requires shipping
- Stock tracking enabled

### Tickets
- Event tickets, tournament passes
- No variants needed
- No shipping required
- Limited quantity

### Fantasy Leagues
- Premium league features
- Subscription or one-time purchase
- No shipping required
- Unlimited quantity
- May link to `fantasy_seasons` collection
