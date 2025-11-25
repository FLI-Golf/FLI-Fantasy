# Theme System

The FLI Fantasy Golf app uses a centralized theme system for easy color management and consistency.

## Color Palette

### Brand Colors
- **Deep Blue** (`#0f172a`) - Primary brand color, backgrounds, headers
- **Purple** (`#a855f7`) - Primary actions, buttons, links  
- **Gold** (`#eab308`) - Accents, highlights, success states

## How to Use

### 1. Using Brand Colors in Components

```svelte
<!-- Using CSS variable references -->
<div class="bg-brand-deep-blue text-brand-gold">
  Brand colors via CSS variables
</div>

<!-- Using static color scales -->
<div class="bg-deep-blue-950 text-gold-400">
  Granular control with color scales
</div>

<!-- Using semantic Tailwind colors -->
<Button>Uses primary (purple)</Button>
<Button variant="secondary">Uses secondary (deep blue)</Button>
```

### 2. Updating Theme Colors

To change the theme colors:

**Option A: Update CSS Variables (Recommended)**

Edit `src/app.css`:

```css
:root {
  --brand-deep-blue: 222.2 84% 4.9%;  /* Change HSL values */
  --brand-purple: 271.5 81.3% 55.9%;
  --brand-gold: 45.4 93.4% 47.5%;
}
```

**Option B: Update at Runtime**

```typescript
import { theme } from '$lib/theme';

theme.updateTheme({
  'brand-purple': '280 90% 60%',  // New purple
  'brand-gold': '50 95% 50%'      // New gold
});
```

### 3. Available Color Classes

#### Brand Colors (CSS Variables)
- `bg-brand-deep-blue` / `text-brand-deep-blue`
- `bg-brand-deep-blue-light` / `text-brand-deep-blue-light`
- `bg-brand-purple` / `text-brand-purple`
- `bg-brand-purple-light` / `text-brand-purple-light`
- `bg-brand-gold` / `text-brand-gold`
- `bg-brand-gold-light` / `text-brand-gold-light`

#### Static Color Scales (50-950)
- `deep-blue-{50-950}` - Navy blue scale
- `purple-{50-950}` - Purple scale
- `gold-{50-950}` - Gold/yellow scale

#### Semantic Colors (Shadcn UI)
- `primary` - Maps to brand purple
- `secondary` - Maps to brand deep blue
- `accent` - Maps to brand gold
- `background`, `foreground`, `card`, `muted`, etc.

## Examples

### Gradient Backgrounds
```svelte
<div class="bg-gradient-to-br from-deep-blue-950 via-purple-900 to-deep-blue-900">
  Multi-color gradient
</div>
```

### Buttons with Brand Colors
```svelte
<button class="bg-gradient-to-r from-purple-600 to-deep-blue-600">
  Purple to Blue Gradient
</button>

<button class="border-2 border-gold-400 text-gold-400 hover:bg-gold-400">
  Gold Outline
</button>
```

### Icons with Brand Colors
```svelte
<Trophy class="text-gold-400" />
<Users class="text-brand-purple" />
```

## Theme Structure

```
src/
├── app.css              # CSS custom properties (theme source)
├── lib/
│   └── theme.ts         # Theme utilities and documentation
└── tailwind.config.js   # Tailwind color mappings
```

## Best Practices

1. **Use CSS variables for main brand colors** - Easier to update globally
2. **Use static scales for granular control** - When you need specific shades
3. **Use semantic colors in components** - For consistency with shadcn UI
4. **Keep gradients consistent** - Use the same color combinations throughout

## Future Updates

To add new theme colors:

1. Add CSS variable in `src/app.css`:
   ```css
   --brand-new-color: 180 50% 50%;
   ```

2. Add to Tailwind config in `tailwind.config.js`:
   ```js
   brand: {
     'new-color': 'hsl(var(--brand-new-color))'
   }
   ```

3. Document in `src/lib/theme.ts`

4. Use in components:
   ```svelte
   <div class="bg-brand-new-color">
   ```
