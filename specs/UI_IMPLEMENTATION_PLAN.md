# SavSpot UI Modernization — Implementation Plan

## Design Philosophy: "Calm Premium"

Clean, spacious, confident — with moments of delight. Not maximalist effects.
Not sterile enterprise gray. A UI that feels as polished as Linear or Calendly
while staying fast, accessible, and maintainable.

---

## Impact Summary

| Metric | Count |
|--------|-------|
| Total TSX files | 109 |
| UI component files | 14 |
| Files importing UI components | ~80 unique |
| Dialog consumers (direct) | 14 (was incorrectly listed as 0) |
| Select consumers | 18 (all use native `<option>` pattern) |
| Vitest unit/component tests | 24 |
| Playwright E2E tests | 8 (includes auth.setup.ts) |
| E2E test data fixture | 1 (test-data.ts) |
| Unused deps to remove | `react-dnd`, `react-dnd-html5-backend` (0 imports) |

**Risk Assessment:** Changes are layered so each phase can ship independently.
Phases 1-2 are purely additive (no breaking changes). Phase 3 replaces
components with API-compatible versions. Phase 4 touches page-level layouts.

---

## Phase 1: Foundation

**Goal:** Install dependencies, set up typography, create theme infrastructure.

> **Note:** Step 1.3 (OKLCH migration) requires Step 1.3a (inline style fixes)
> to be done first. Steps 1.1, 1.2, 1.4, 1.5 are purely additive with zero
> visual regressions. Step 1.3 + 1.3a together are non-breaking (the inline
> style fixes neutralize the CSS var format change).

### Step 1.1: Install Dependencies

```bash
cd apps/web
pnpm add motion sonner next-themes geist
```

| Package | Purpose | Size |
|---------|---------|------|
| `motion` | Animation library (Framer Motion successor) | ~17kb |
| `sonner` | Toast notifications | ~5kb |
| `next-themes` | Dark mode with SSR, localStorage, system pref | ~2kb |
| `geist` | Vercel's Geist Sans + Geist Mono fonts | Font files |

**No packages removed.** Existing deps stay untouched.

### Step 1.2: Typography — Add Geist Sans

**File: `apps/web/src/app/layout.tsx`**

Replace Inter-only setup with Geist Sans (headings) + Inter (body/UI).

```tsx
import { GeistSans } from 'geist/font/sans';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**File: `apps/web/src/app/globals.css`**

Add font variables to `@theme inline`:

```css
@theme inline {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-heading: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  /* ... existing color vars ... */
}
```

**Usage convention:** Apply `font-heading` to `<h1>`–`<h3>` elements via a
base layer rule. Body text continues using Inter via `font-sans` (default).

```css
@layer base {
  h1, h2, h3 {
    font-family: var(--font-heading);
  }
}
```

**Test impact:** None. Font changes are purely visual. No component API changes.

### Step 1.3: Color System — Migrate HSL → OKLCH

> **CRITICAL ORDERING: Step 1.3a (below) MUST be completed BEFORE changing
> CSS variable values.** The steps are numbered 1.3 then 1.3a for grouping,
> but execution order is: **1.3a first, then 1.3.**

**Phase 1.3a — Fix inline style refs (do this FIRST):**
See Step 1.3a section below. Update all `hsl(var(--...))` inline refs in
component files to `var(--...)`. This is safe to do while vars still contain
HSL values (browsers resolve `var(--primary)` to `222.2 84% 4.9%` which is
not a valid color on its own — but with the `@theme inline` wrapper
`hsl(var(--primary))`, it works. After 1.3a, `var(--primary)` will be used
directly, which also works when wrapped by `@theme inline`'s `hsl()`.)

**Phase 1.3 — Then change CSS variable values:**

**File: `apps/web/src/app/globals.css`**

Replace HSL values with OKLCH equivalents.

```css
@layer base {
  :root {
    --background: oklch(100% 0 0);
    --foreground: oklch(15% 0.02 260);
    --card: oklch(100% 0 0);
    --card-foreground: oklch(15% 0.02 260);
    --popover: oklch(100% 0 0);
    --popover-foreground: oklch(15% 0.02 260);
    --primary: oklch(30% 0.07 265);
    --primary-foreground: oklch(97% 0.005 260);
    --secondary: oklch(96% 0.005 260);
    --secondary-foreground: oklch(30% 0.07 265);
    --muted: oklch(96% 0.005 260);
    --muted-foreground: oklch(55% 0.015 260);
    --accent: oklch(96% 0.005 260);
    --accent-foreground: oklch(30% 0.07 265);
    --destructive: oklch(55% 0.2 25);
    --destructive-foreground: oklch(97% 0.005 260);
    --border: oklch(91% 0.01 260);
    --input: oklch(91% 0.01 260);
    --ring: oklch(30% 0.07 265);
    --radius: 0.5rem;

    /* New semantic tokens */
    --success: oklch(55% 0.17 145);
    --success-foreground: oklch(97% 0.005 145);
    --warning: oklch(70% 0.17 75);
    --warning-foreground: oklch(25% 0.05 75);
  }

  .dark {
    --background: oklch(14% 0.01 260);
    --foreground: oklch(93% 0.005 260);
    --card: oklch(17% 0.015 260);
    --card-foreground: oklch(93% 0.005 260);
    --popover: oklch(17% 0.015 260);
    --popover-foreground: oklch(93% 0.005 260);
    --primary: oklch(93% 0.005 260);
    --primary-foreground: oklch(17% 0.015 260);
    --secondary: oklch(22% 0.02 260);
    --secondary-foreground: oklch(93% 0.005 260);
    --muted: oklch(22% 0.02 260);
    --muted-foreground: oklch(65% 0.01 260);
    --accent: oklch(22% 0.02 260);
    --accent-foreground: oklch(93% 0.005 260);
    --destructive: oklch(40% 0.15 25);
    --destructive-foreground: oklch(93% 0.005 260);
    --border: oklch(25% 0.02 260);
    --input: oklch(25% 0.02 260);
    --ring: oklch(75% 0.02 260);

    --success: oklch(45% 0.14 145);
    --success-foreground: oklch(93% 0.005 145);
    --warning: oklch(60% 0.14 75);
    --warning-foreground: oklch(93% 0.005 75);
  }
}
```

**Critical:** The `@theme inline` block currently wraps values with `hsl()`.
Since CSS vars will now store complete `oklch(...)` values (not raw numbers),
the wrapper must change from `hsl(var(--X))` to just `var(--X)`:

```css
@theme inline {
  /* BEFORE: --color-primary: hsl(var(--primary));   */
  /* AFTER:  --color-primary: var(--primary);         */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  /* ... radius vars unchanged ... */
}
```

### Step 1.3a: Fix Inline Style References (REQUIRED)

**BEFORE** changing CSS var values, update all inline `hsl(var(--...))` refs
in component files. Otherwise `hsl(oklch(...))` = invalid CSS = invisible UI.

**File: `apps/web/src/app/(dashboard)/calendar/page.tsx` (~27 instances)**

The calendar page has a large `<style>` block for react-big-calendar theming.
Every reference like:
```css
background-color: hsl(var(--primary));
border-color: hsl(var(--border));
color: hsl(var(--muted-foreground));
```
Must become:
```css
background-color: var(--primary);
border-color: var(--border);
color: var(--muted-foreground);
```

**File: `apps/web/src/app/book/[slug]/page.tsx` (1 instance)**

Hardcoded HSL gradient fallback:
```tsx
// BEFORE:
`linear-gradient(135deg, hsl(222.2 47.4% 11.2%), hsl(222.2 47.4% 25%))`
// AFTER:
`linear-gradient(135deg, var(--primary), oklch(35% 0.07 265))`
```

**Full file list requiring inline style changes:**
1. `apps/web/src/app/(dashboard)/calendar/page.tsx` — 24 `hsl(var(--...))` refs
2. `apps/web/src/app/book/[slug]/page.tsx` — 1 hardcoded HSL gradient

**Test impact:**
- `format-utils.spec.ts` — Tests `getStatusColor()` which returns Tailwind
  class strings like `bg-green-100 text-green-800`. These return utility
  classes, not raw colors, so **no breakage**.
- `calendar-helpers.spec.ts` — Tests `getStatusStyle()` which returns inline
  hex color styles (`#3b82f6`). These are **hardcoded hex values, not theme
  tokens**, so **no breakage**.
- E2E tests — Test by text content and ARIA roles, not colors. **No breakage.**
- **Calendar page inline styles** — Visual-only change. No tests assert
  on these CSS values. **No test breakage, but must verify visually.**

### Step 1.4: Dark Mode Toggle Infrastructure

**New file: `apps/web/src/components/ui/theme-toggle.tsx`**

```tsx
'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

**Integration points:**
- `apps/web/src/components/layout/header.tsx` — Add ThemeToggle next to
  notification bell
- `apps/web/src/components/layout/mobile-nav.tsx` — Add ThemeToggle to
  mobile menu

**Test impact:**
- New component → new test file needed (see Phase 6).
- E2E tests run in light mode by default. No breakage.

### Step 1.5: Toast System — Sonner

**File: `apps/web/src/app/layout.tsx`**

Add Toaster inside ThemeProvider:

```tsx
import { Toaster } from 'sonner';

// Inside ThemeProvider:
<Toaster position="top-right" richColors closeButton />
```

**Usage pattern** (no immediate changes, available for future use):

```tsx
import { toast } from 'sonner';
toast.success('Booking confirmed');
toast.error('Payment failed');
```

**Test impact:** None. Toaster is passive until `toast()` is called.

### Phase 1 Test Plan

| Test file | Action needed | Reason |
|-----------|---------------|--------|
| All 24 Vitest tests | Run, expect pass | No component API changes |
| All 8 E2E tests | Run, expect pass | No DOM structure changes |
| New: `theme-toggle.spec.tsx` | Write | New component |
| **Visual verification** | Manually check calendar page | Inline style migration (Step 1.3a) |

**New test: `apps/web/src/components/ui/__tests__/theme-toggle.spec.tsx`**

```tsx
// Test: renders toggle button with aria-label
// Test: calls setTheme('dark') when in light mode
// Test: calls setTheme('light') when in dark mode
// Mock: next-themes useTheme hook
```

**Validation command:** `pnpm test && pnpm typecheck && pnpm build`

---

## Phase 2: Animation Layer (Additive Only)

**Goal:** Add Motion-based animations to existing components without changing
their API. Wrap existing elements, don't replace them.

### Step 2.1: Create Animation Primitives

**New file: `apps/web/src/components/ui/motion.tsx`**

Reusable animation wrappers that any component can use:

```tsx
'use client';

import { motion, AnimatePresence } from 'motion/react';

// Fade in on mount
export function FadeIn({ children, delay = 0, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Page transition wrapper
export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// Step transition for booking wizard (slide left/right)
export function StepTransition({ children, direction, stepKey }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: direction === 'forward' ? 40 : -40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction === 'forward' ? -40 : 40 }}
        transition={{ duration: 0.25 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Export AnimatePresence for direct use
export { motion, AnimatePresence };
```

### Step 2.2: Animate Booking Wizard Step Transitions

**File: `apps/web/src/components/booking/booking-wizard.tsx`**

Wrap `renderStep()` output in `StepTransition`. This is the highest-impact
animation — users see it during the core booking flow.

**Change:**
```tsx
// Before:
<div className="min-h-[300px]">{renderStep()}</div>

// After:
<div className="min-h-[300px]">
  <StepTransition
    stepKey={currentStepType}
    direction={/* track direction in state */}
  >
    {renderStep()}
  </StepTransition>
</div>
```

Add a `direction` state variable:
- Set `'forward'` in `goToNextStep`
- Set `'backward'` in `goToPrevStep`

**Test impact:**
- `booking-progress.spec.tsx` — Tests the progress bar, not the wizard.
  **No breakage.**
- `booking-types.spec.ts` — Tests types only. **No breakage.**
- E2E `booking-flow.spec.ts` — Tests by text content ("Book Now", business
  name heading). Animations don't affect text presence. May need a small
  `waitFor` if AnimatePresence delays unmount, but Playwright's auto-waiting
  handles this. **Low risk.**

### Step 2.3: Animate Dashboard Cards

**File: `apps/web/src/app/(dashboard)/dashboard/page.tsx`**

Wrap stat cards with staggered `FadeIn`:

```tsx
<FadeIn delay={0}><Card>...</Card></FadeIn>
<FadeIn delay={0.05}><Card>...</Card></FadeIn>
<FadeIn delay={0.1}><Card>...</Card></FadeIn>
```

**Test impact:** Dashboard page has no unit test. E2E tests don't test the
dashboard page content beyond navigation. **No breakage.**

### Step 2.4: Animate Page Content Areas

**File: `apps/web/src/app/(dashboard)/layout.tsx`**

Wrap `<main>` content with `PageTransition`:

```tsx
// Before:
<main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>

// After:
<main className="min-w-0 flex-1 p-4 lg:p-6">
  <PageTransition>{children}</PageTransition>
</main>
```

**Test impact:**
- E2E tests navigate between pages and check content. Playwright's
  auto-waiting handles fade-in. **No breakage.**

### Step 2.5: Replace CSS Keyframe Animations

**File: `apps/web/src/components/booking/confirmation-step.tsx`**

Replace the CSS-only confirmation animation with a richer Motion-based version:
checkmark draw, subtle confetti/particle burst.

**File: `apps/web/src/app/globals.css`**

Remove the three `@keyframes` blocks (`confirm-ring`, `confirm-pop`,
`confirm-check`) after the confirmation step is updated.

**Test impact:** No tests reference these keyframes. **No breakage.**

### Step 2.6: Button Press Feedback

**File: `apps/web/src/components/ui/button.tsx`**

Add subtle scale-down on press via `whileTap`:

```tsx
import { motion } from 'motion/react';

// Wrap the <button> with motion.button:
<motion.button
  whileTap={{ scale: 0.97 }}
  transition={{ duration: 0.1 }}
  className={cn(/* existing classes */)}
  ref={ref}
  {...props}
/>
```

**Test impact:**
- `button.spec.tsx` — Tests render, click events, variants, ref forwarding.
  `motion.button` renders as a `<button>` element, so `getByRole('button')`
  still works. Click events propagate normally. **Low risk** — verify ref
  forwarding works with `motion.button`. If not, use `forwardRef` from motion.
- All 48 files importing Button — no API change. **No breakage.**

### Phase 2 Test Plan

| Test file | Action needed | Reason |
|-----------|---------------|--------|
| `button.spec.tsx` | Run, verify pass | motion.button ref forwarding |
| `booking-progress.spec.tsx` | Run, expect pass | No changes to component |
| E2E `booking-flow.spec.ts` | Run, expect pass | Playwright auto-waits |
| E2E `admin-login.spec.ts` | Run, expect pass | Page transitions passive |
| New: `motion.spec.tsx` | Write | New animation primitives |

**New test: `apps/web/src/components/ui/__tests__/motion.spec.tsx`**

```tsx
// Test: FadeIn renders children
// Test: PageTransition renders children
// Test: StepTransition renders children with given key
// Test: StepTransition animates (verify initial styles or mock motion)
```

**Validation command:** `pnpm test && pnpm test:e2e`

---

## Phase 3: Component Upgrades (Surgical Replacements)

**Goal:** Replace hand-rolled UI components with shadcn/ui v4 components
(Radix-based) for accessibility and completeness. Maintain identical import
paths so consuming files need zero changes.

### Strategy: In-Place Replacement

Each component in `apps/web/src/components/ui/` gets replaced with the
shadcn/ui equivalent. The key constraint: **export names and prop interfaces
must remain compatible.** Where shadcn adds new variants/props, that's fine —
existing usage just doesn't pass them.

### Step 3.1: Initialize shadcn/ui v4

```bash
cd apps/web
pnpm dlx shadcn@latest init
```

Configure:
- Style: New York
- Base color: Neutral (we override with our OKLCH tokens)
- CSS variables: Yes
- Tailwind CSS: v4
- Components path: `src/components/ui`
- Utils path: `src/lib/utils`

> **Important:** When shadcn init detects existing files, choose to NOT
> overwrite. We'll replace manually to ensure API compatibility.

**Radix peer dependencies:** shadcn/ui components use `@radix-ui/*` packages
under the hood. The `shadcn add` command auto-installs these. For manually
replaced components, ensure these are installed:

```bash
# These will be auto-installed by `shadcn add` for new components.
# For manual replacements, verify these exist in package.json after Phase 3:
@radix-ui/react-dialog
@radix-ui/react-select
@radix-ui/react-checkbox
@radix-ui/react-avatar
@radix-ui/react-separator
@radix-ui/react-label
@radix-ui/react-tabs
@radix-ui/react-slot        # Required by shadcn Button (asChild prop)
```

**Strategy:** Use `pnpm dlx shadcn@latest add <component>` for ALL
replacements (not just new components). This ensures Radix deps are installed
and the component uses the correct Tailwind 4 + React 19 versions. Then
manually adjust the generated file to preserve API compatibility (e.g.,
add `md` size alias to Button).

### Step 3.2: Replace Components (Ordered by Risk)

**Batch 1 — Zero consumers (safe to replace entirely):**

| Component | Consumers | Action |
|-----------|-----------|--------|
| `tabs.tsx` | 0 | Replace with shadcn Tabs (Radix-based) |

**Batch 1b — Table (9 consumers, was incorrectly listed as 0):**

| Component | Consumers | Action |
|-----------|-----------|--------|
| `table.tsx` | **9** | Replace with shadcn Table. **Must verify API compatibility.** Current Table exports: Table, TableHeader, TableBody, TableRow, TableHead, TableCell. shadcn Table uses the same export names. Verify each consumer file uses compatible props. |

Table consumer files:
1. `app/(dashboard)/payments/page.tsx`
2. `app/(dashboard)/bookings/page.tsx`
3. `app/(dashboard)/clients/[id]/page.tsx`
4. `app/(dashboard)/services/page.tsx`
5. `app/(dashboard)/settings/tax-rates/page.tsx`
6. `app/(dashboard)/settings/discounts/page.tsx`
7. `app/(portal)/portal/bookings/page.tsx`
8. `app/(portal)/portal/payments/page.tsx`
9. `components/team/member-list.tsx`

**Batch 2 — Low consumers (verify 2-4 files):**

| Component | Consumers | Action |
|-----------|-----------|--------|
| `checkbox.tsx` | 2 | Replace with shadcn Checkbox (Radix) |
| `avatar.tsx` | 4 | Replace with shadcn Avatar (Radix) |

**Batch 3 — Medium consumers (verify interface compat):**

| Component | Consumers | Action |
|-----------|-----------|--------|
| `separator.tsx` | 16 | Replace with shadcn Separator (Radix) |
| `select.tsx` | 18 | Replace with shadcn Select (Radix). **Breaking change risk**: current Select is a styled `<select>` wrapper. shadcn Select uses Radix with `<SelectTrigger>`, `<SelectContent>`, `<SelectItem>`. **All 18 consuming files must be updated.** |
| `badge.tsx` | 20 | Replace with shadcn Badge. Ensure variant names match. |

**Batch 4 — High consumers (most careful):**

| Component | Consumers | Action |
|-----------|-----------|--------|
| `input.tsx` | 25 | Replace. Interface is identical (forwardRef'd input). Safe. |
| `label.tsx` | 28 | Replace. Interface is identical. Safe. |
| `skeleton.tsx` | 27 | Replace. Interface is identical. Safe. |
| `textarea.tsx` | 14 | Replace. Interface is identical (forwardRef'd textarea). Safe. |
| `card.tsx` | 36 | Replace. Ensure Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter exports match. |
| `button.tsx` | 48 | Replace. **Must preserve** variant names (`default`, `outline`, `ghost`) and size names (`sm`, `md`, `lg`). shadcn uses `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` for variants and `default`, `sm`, `lg`, `icon` for sizes. Our `md` maps to shadcn's `default`. Add a `md` alias. |

**Batch 5 — Dialog (custom → Radix):**

| Component | Consumers | Action |
|-----------|-----------|--------|
| `dialog.tsx` | **14 direct** | Replace with shadcn Dialog (Radix). **Export names must match**: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription. Current custom implementation uses the same names. The main difference: Radix handles focus trapping, scroll locking, and portal rendering automatically. |

> **AUDIT CORRECTION:** Dialog has 14 direct consumers, not 0. The original
> audit missed these because the Grep search was case-sensitive or limited.

**All 14 Dialog consumer files:**
1. `components/bookings/walk-in-dialog.tsx`
2. `components/calendar/booking-popover.tsx`
3. `components/team/invite-dialog.tsx`
4. `components/team/member-list.tsx`
5. `components/feedback/feedback-widget.tsx`
6. `components/support/support-widget.tsx`
7. `app/(dashboard)/bookings/[id]/page.tsx`
8. `app/(dashboard)/settings/calendar/page.tsx`
9. `app/(dashboard)/settings/tax-rates/page.tsx`
10. `app/(dashboard)/settings/discounts/page.tsx`
11. `app/(dashboard)/settings/gallery/page.tsx`
12. `app/(dashboard)/calendar/page.tsx`
13. `app/(portal)/portal/bookings/[id]/page.tsx`
14. `app/(portal)/portal/settings/page.tsx`

**Migration risk for Dialog:** The custom Dialog uses the same compound
component pattern as shadcn/Radix (Dialog > DialogContent > DialogHeader, etc.)
with matching export names. The key behavioral differences are:
- **Radix adds portal rendering** (content renders outside DOM tree)
- **Radix adds focus trapping** (tab key stays within dialog)
- **Radix adds scroll locking** (no body scroll when open)

All 14 files use `open`/`onOpenChange` props (controlled) and the same
sub-component pattern. **Prop interface is compatible — no file changes needed
for Dialog consumers**, only the Dialog component itself is replaced.

**Exception:** If any consumer relies on Dialog NOT using a portal (e.g.,
testing by parent DOM relationship), that will break. The E2E audit found
`team-settings.spec.ts` uses `getByRole('dialog')` which works with Radix
since it sets `role="dialog"`.

**Additional exception:** `walk-in-dialog.tsx` and `booking-popover.tsx` use
DialogTrigger — verify Radix DialogTrigger accepts the same children pattern.

### Step 3.3: Add New Components

These don't exist yet. Add via shadcn CLI:

```bash
pnpm dlx shadcn@latest add tooltip
pnpm dlx shadcn@latest add dropdown-menu
pnpm dlx shadcn@latest add popover
pnpm dlx shadcn@latest add sheet
pnpm dlx shadcn@latest add command
pnpm dlx shadcn@latest add accordion
pnpm dlx shadcn@latest add progress
pnpm dlx shadcn@latest add switch
pnpm dlx shadcn@latest add scroll-area
```

No existing files affected. These are available for future use.

> **Note:** The Command component requires `cmdk` as a peer dependency
> (auto-installed by `shadcn add command`). The Sheet component requires
> `@radix-ui/react-dialog` (shared with Dialog — no extra install).

### Step 3.4: Select Component Migration (Highest Risk)

The current `select.tsx` wraps a native `<select>` element. shadcn Select
uses Radix with a completely different API:

**Current usage pattern** (18 files):
```tsx
<Select value={val} onChange={handleChange} className="...">
  <option value="a">Option A</option>
  <option value="b">Option B</option>
</Select>
```

**shadcn pattern:**
```tsx
<Select value={val} onValueChange={handleChange}>
  <SelectTrigger>
    <SelectValue placeholder="Pick one" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
    <SelectItem value="b">Option B</SelectItem>
  </SelectContent>
</Select>
```

**Migration approach:**
1. Add shadcn Select as `select-new.tsx`
2. Create a codemod script or migrate each of the 18 files manually
3. Each file is a page or feature component — changes are mechanical
4. After all 18 files migrated, delete old `select.tsx`, rename `select-new.tsx`

**Files to migrate (all 18, full paths from `apps/web/src/`):**
- `components/bookings/walk-in-dialog.tsx`
- `components/team/invite-dialog.tsx`
- `components/team/member-list.tsx`
- `components/feedback/feedback-widget.tsx`
- `components/support/ticket-form.tsx`
- `components/booking/questionnaire-step.tsx`
- `app/(dashboard)/bookings/page.tsx`
- `app/(dashboard)/bookings/[id]/page.tsx`
- `app/(dashboard)/settings/calendar/page.tsx` (NOT `(dashboard)/calendar/page.tsx`)
- `app/(dashboard)/settings/discounts/page.tsx`
- `app/(dashboard)/settings/availability/page.tsx`
- `app/(dashboard)/settings/profile/page.tsx`
- `app/(dashboard)/clients/page.tsx`
- `app/(dashboard)/payments/page.tsx`
- `app/(dashboard)/services/[id]/page.tsx`
- `app/(dashboard)/services/new/page.tsx`
- `app/onboarding/page.tsx`
- `app/(portal)/portal/bookings/page.tsx`

### Phase 3 Test Plan

| Test file | Action needed | Reason |
|-----------|---------------|--------|
| `button.spec.tsx` | Update if variant/size names change | Verify `md` alias works |
| `input.spec.tsx` | Run, expect pass | Interface identical |
| `dialog.spec.tsx` | **Rewrite** | Radix Dialog has different internal structure. Must test: open/close, ESC key, overlay click, focus trap, aria attributes. Radix handles some of this automatically. |
| `separator.spec.tsx` | Update | Radix Separator may render differently |
| `ticket-form.spec.tsx` | Update | Uses Select — now Radix Select |
| `feedback-widget.spec.tsx` | Update | Uses Select — now Radix Select |
| `settings-page.spec.tsx` | Run, expect pass | Tests Card text content |
| `notifications-page.spec.tsx` | Run, expect pass | Uses local `ToggleSwitch` component (not shadcn Switch) — unaffected by component replacements |
| E2E `booking-flow.spec.ts` | Run, expect pass | Tests by text content |
| E2E `admin-bookings.spec.ts` | **Verify** | Tests filter selects — DOM structure changes with Radix |
| E2E `settings-flow.spec.ts` | Run, expect pass | Tests Card links |
| E2E `team-settings.spec.ts` | **Verify** | Tests Dialog open — Radix portal may change query |
| E2E `mobile-responsive.spec.ts` | **Verify** | Tests hamburger menu — MobileNav unchanged |

**High-risk E2E tests for Select migration:**

`admin-bookings.spec.ts` tests filter controls:
```ts
// Current: tests by getByRole('combobox') or similar
// After: Radix Select renders a <button> trigger, not a <select>
// May need to update selectors
```

**New tests needed:**
- `apps/web/src/components/ui/__tests__/select.spec.tsx` — Radix Select
- `apps/web/src/components/ui/__tests__/tooltip.spec.tsx` — if used
- `apps/web/src/components/ui/__tests__/sheet.spec.tsx` — if used

**Validation:** After each batch, run `pnpm test && pnpm typecheck`.
After Batch 5 + Select migration, run `pnpm test:e2e`.

---

## Phase 4: Layout & Visual Polish

**Goal:** Modernize page layouts and visual details. These are page-level
changes, not component-level.

### Step 4.1: Sidebar Refinement

**File: `apps/web/src/components/layout/sidebar.tsx`**

Changes:
- Add ThemeToggle to sidebar footer (above logout)
- Refine active state: subtle left border accent instead of full bg-primary
  (less visually heavy, more modern)
- Add hover transition: `transition-all duration-150`
- Logo: Use `font-heading` class for brand name
- Subtle separator between nav sections

```tsx
// Active state change:
// Before: 'bg-primary text-primary-foreground'
// After: 'bg-accent text-foreground border-l-2 border-primary font-medium'
```

**Test impact:**
- E2E `admin-login.spec.ts` — Tests navigation items by text content
  ("Dashboard", "Bookings", etc.). **No breakage.**
- E2E `mobile-responsive.spec.ts` — Tests hamburger menu, not sidebar
  styling. **No breakage.**

### Step 4.2: Card Visual Enhancement

Apply to all Card usages via the base component:

**File: `apps/web/src/components/ui/card.tsx`**

```tsx
// Add subtle hover elevation for interactive cards:
'rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md'
// Changed: rounded-lg → rounded-xl, added transition-shadow hover:shadow-md
```

**Test impact:** No tests check border-radius or shadow classes. **No breakage.**

### Step 4.3: Dashboard Bento Grid

**File: `apps/web/src/app/(dashboard)/dashboard/page.tsx`**

Restructure stat cards into a bento-style grid:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {/* Primary metric: spans 2 cols on lg */}
  <FadeIn className="lg:col-span-2">
    <Card className="h-full">...</Card>
  </FadeIn>
  {/* Secondary metrics */}
  <FadeIn delay={0.05}><Card>...</Card></FadeIn>
  <FadeIn delay={0.1}><Card>...</Card></FadeIn>
  {/* Action cards */}
  <FadeIn delay={0.15} className="sm:col-span-2">
    <Card>...</Card>
  </FadeIn>
</div>
```

**Test impact:** No dashboard unit tests exist. E2E doesn't test dashboard
layout. **No breakage.**

### Step 4.4: Booking Progress Bar Refinement

**File: `apps/web/src/components/booking/booking-progress.tsx`**

Modernize the step indicator:
- Reduce circle size slightly (h-7 w-7)
- Add `motion.div` for completed state transition (scale pop)
- Use a gradient line connector instead of solid
- Add subtle pulse on current step

**Test impact:**
- `booking-progress.spec.tsx` — Tests step labels, numbers, checkmarks,
  list structure. Changes are visual only (classes, not structure).
  **Verify** that `getByText('1')` still finds step numbers. If we change
  rendering, update test. **Low risk.**

### Step 4.5: Loading States

Replace the spinner in dashboard layout with a branded skeleton:

**File: `apps/web/src/app/(dashboard)/layout.tsx`**

```tsx
// Before:
<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />

// After: Full-page skeleton matching dashboard layout
<div className="flex min-h-screen">
  <div className="hidden lg:block w-64 border-r bg-card" />
  <div className="flex-1 p-6">
    <Skeleton className="h-8 w-48 mb-6" />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  </div>
</div>
```

**Test impact:** E2E auth setup logs in before tests run. The loading
skeleton is only shown during initial auth check, which completes before
test assertions. **No breakage.**

### Phase 4 Test Plan

| Test file | Action needed | Reason |
|-----------|---------------|--------|
| `booking-progress.spec.tsx` | **Verify** | Visual changes to step indicator |
| E2E `admin-login.spec.ts` | Run, expect pass | Tests nav text content |
| E2E `mobile-responsive.spec.ts` | Run, expect pass | Tests mobile menu |
| E2E all others | Run, expect pass | Layout changes don't affect text queries |

**Validation:** `pnpm test && pnpm test:e2e`

---

## Phase 5: Booking Flow UX Polish

**Goal:** The booking flow is SavSpot's most critical user-facing surface.
Apply UX research findings to improve conversion.

### Step 5.1: Service Selection — Smart Defaults

**File: `apps/web/src/components/booking/service-selection-step.tsx`**

- Add "Most Popular" badge to the most-booked service (requires API data or
  heuristic: first service, or service with lowest price)
- Add subtle hover animation on service cards (lift + shadow)
- Show duration + price more prominently

### Step 5.2: Date/Time Picker — Feedback

**File: `apps/web/src/components/booking/date-time-picker-step.tsx`**

- Auto-select next available date (don't show empty today)
- Gray out unavailable slots with tooltip: "This time is booked"
- Add skeleton loading during availability fetch
- Animate time slots appearing with staggered FadeIn

### Step 5.3: Confirmation — Celebration

**File: `apps/web/src/components/booking/confirmation-step.tsx`**

- Replace CSS keyframe animation with Motion-based checkmark draw
- Add subtle particle burst on confirmation
- Include "Add to Calendar" button (generates .ics link)
- Show "Share booking page" CTA for repeat bookings

### Step 5.4: Error States

**File: `apps/web/src/components/booking/booking-wizard.tsx`**

- Animate error banner in with `FadeIn`
- Add dismiss button to error banner
- Auto-dismiss non-critical errors after 5 seconds

### Phase 5 Test Plan

| Test file | Action needed | Reason |
|-----------|---------------|--------|
| `booking-progress.spec.tsx` | Run, expect pass | No changes |
| `booking-types.spec.ts` | Run, expect pass | No type changes |
| E2E `booking-flow.spec.ts` | **Verify** | Service card changes, "Most Popular" badge. Tests check for "Book Now" buttons — ensure they still render. Auto-selecting a date may change the flow slightly. |
| E2E `mobile-responsive.spec.ts` | **Verify** | Booking page renders on mobile |

**New tests:**
- Unit test for "Most Popular" badge logic
- Unit test for error banner auto-dismiss

**Validation:** `pnpm test && pnpm test:e2e`

---

## Phase 6: Comprehensive Test Updates

**Goal:** Ensure all existing tests pass and add coverage for new components.

### New Test Files to Create

| File | Tests |
|------|-------|
| `ui/__tests__/theme-toggle.spec.tsx` | Renders, toggles dark/light, aria-label |
| `ui/__tests__/motion.spec.tsx` | FadeIn/PageTransition/StepTransition render children |
| `ui/__tests__/select.spec.tsx` | Radix Select open/close, selection, keyboard nav |
| `ui/__tests__/tooltip.spec.tsx` | Tooltip appears on hover, aria attributes |
| `ui/__tests__/sheet.spec.tsx` | Sheet open/close, overlay click, ESC |
| `ui/__tests__/switch.spec.tsx` | Switch toggle, checked state, disabled |
| `ui/__tests__/dropdown-menu.spec.tsx` | Open/close, item selection |
| `ui/__tests__/accordion.spec.tsx` | Expand/collapse, multiple items |
| `ui/__tests__/progress.spec.tsx` | Value display, aria-valuenow |

### Existing Tests to Update

| File | Change needed |
|------|---------------|
| `button.spec.tsx` | Verify motion.button renders as button, ref forwarding, add tests for new variants (`destructive`, `secondary`, `link`, `icon` size) |
| `dialog.spec.tsx` | **Full rewrite** for Radix Dialog. Test: portal rendering, focus trap, scroll lock, compound component API |
| `separator.spec.tsx` | Update for Radix Separator if DOM output changes |
| `ticket-form.spec.tsx` | Update Select interactions (Radix trigger/content pattern) |
| `feedback-widget.spec.tsx` | Update Select interactions |
| `booking-progress.spec.tsx` | Verify after visual refinements |
| `login-form.spec.tsx` | Run, expect pass — imports Button/Input/Label which keep same API |
| `register-form.spec.tsx` | Run, expect pass — imports Button/Input/Label which keep same API |
| `notifications-page.spec.tsx` | Run, expect pass — uses local `ToggleSwitch`, not shadcn Switch |

### E2E Tests to Verify/Update

| File | Risk | Action |
|------|------|--------|
| `smoke.spec.ts` | None | Run, expect pass |
| `admin-login.spec.ts` | Low | Verify sidebar nav items still found by text |
| `booking-flow.spec.ts` | Medium | Verify service cards, "Book Now" buttons, wizard rendering after animation additions |
| `client-portal.spec.ts` | Low | Verify navbar items still found by text |
| `admin-bookings.spec.ts` | **High** | Filter selects change from native `<select>` to Radix. Update selectors: use `getByRole('combobox')` for Radix trigger |
| `settings-flow.spec.ts` | Low | Cards unchanged in text content |
| `team-settings.spec.ts` | Medium | Dialog open may change with Radix portal |
| `mobile-responsive.spec.ts` | Low | Mobile nav structure unchanged |

### E2E `admin-bookings.spec.ts` Migration Guide

Current test likely does:
```ts
await page.selectOption('select[name="status"]', 'CONFIRMED');
```

After Radix migration:
```ts
// Click the trigger button
await page.getByRole('combobox', { name: /status/i }).click();
// Select the option from the dropdown
await page.getByRole('option', { name: /confirmed/i }).click();
```

### E2E `team-settings.spec.ts` Migration Guide

Current test:
```ts
await page.getByRole('button', { name: /invite member/i }).click();
// Then checks dialog is visible
```

Radix Dialog renders in a portal (`<div data-radix-portal>`). Playwright's
`getByRole('dialog')` should still work because Radix sets `role="dialog"`.
**Verify, likely no change needed.**

---

## Execution Order & Dependencies

```
Phase 1 (Foundation)         ← Ship first
  ├── 1.1 Install deps + remove unused (react-dnd*)
  ├── 1.2 Typography (Geist Sans + Inter)
  ├── 1.3a Fix inline hsl(var(--)) refs (24 in calendar, 1 in book page)
  ├── 1.3 Colors (HSL → OKLCH, @theme inline wrappers)
  ├── 1.4 Dark mode infra (next-themes + ThemeToggle)
  └── 1.5 Toast system (Sonner)

Phase 2 (Animation)          ← Additive only, ship after Phase 1
  ├── 2.1 Animation primitives (FadeIn, PageTransition, StepTransition)
  ├── 2.2 Booking wizard step transitions
  ├── 2.3 Dashboard card animations
  ├── 2.4 Page content transitions
  ├── 2.5 Confirmation animation (replace CSS keyframes)
  ├── 2.6 Button press feedback (motion.button)
  ├── 2.7 Landing page hero/feature card FadeIn (from Appendix A)
  └── 2.8 Onboarding step transitions (from Appendix A)

Phase 3 (Components)         ← Surgical replacements, highest risk
  ├── 3.1 shadcn init (generates components.json)
  ├── 3.2 Replace components (6 batches, ordered by risk)
  │   ├── Batch 1: tabs (0 consumers)
  │   ├── Batch 1b: table (9 consumers — was incorrectly 0)
  │   ├── Batch 2: checkbox (2), avatar (4)
  │   ├── Batch 3: separator (16), badge (20), select (18 — see 3.4)
  │   ├── Batch 4: input (25), label (28), skeleton (27), textarea (14),
  │   │           card (36), button (48)
  │   └── Batch 5: dialog (14 consumers — was incorrectly 0)
  ├── 3.3 Add new components (tooltip, dropdown, popover, sheet, etc.)
  └── 3.4 Select migration (18 files, all identical pattern)

Phase 4 (Layout)             ← Page-level changes
  ├── 4.1 Sidebar refinement
  ├── 4.2 Card enhancement (rounded-xl, hover shadow)
  ├── 4.3 Dashboard bento grid
  ├── 4.4 Progress bar refinement
  ├── 4.5 Loading states (branded skeleton)
  └── 4.6 Portal layout dark mode fix (bg-gray-50 → bg-muted, from Appendix E)

Phase 5 (Booking UX)         ← UX polish
  ├── 5.1 Smart defaults ("Most Popular" badge)
  ├── 5.2 Date picker feedback
  ├── 5.3 Confirmation celebration
  └── 5.4 Error states

Phase 6 (Tests)              ← Runs alongside each phase
  ├── New component tests (9 files)
  ├── Updated component tests (9 files, including auth form verifications)
  └── E2E verification (8 files, 2 high-risk: admin-bookings, team-settings)
```

## Parallelization Strategy

Phases are sequential (1→2→3→4→5), but steps within each phase can be
parallelized where files don't overlap.

**Phase 1 — Sequential (single branch: `feature/ui-foundation`):**
Steps 1.1→1.3a→1.3→1.4→1.5 must be sequential because they all modify
`globals.css` and `layout.tsx`. One agent, one worktree.

**Phase 2 — Partially parallel after Phase 1 merges:**

| Agent | Scope | Isolation | Notes |
|-------|-------|-----------|-------|
| Agent A | 2.1 + 2.2 + 2.5 (animation primitives + booking) | worktree | Core animation work |
| Agent B | 2.3 + 2.4 (dashboard + page transitions) | worktree | Layout-level animations |
| Agent C | 2.6 (button press feedback) | worktree | Single file change |

Agents A and B touch different files. Agent C only touches `button.tsx`.
Safe to parallelize. Tests for new components (Phase 6) can start after
Agents A-C complete, not during — tests need the components to exist first.

**Phase 3 — Sequential (highest risk):**
Batch 1→1b→2→3→4→5 must be sequential. Each batch should run
`pnpm test && pnpm typecheck` before proceeding. Select migration (3.4)
and Dialog replacement (Batch 5) are the highest risk — run E2E after each.

**Phase 4-5 — Partially parallel after Phase 3:**

| Agent | Scope | Isolation |
|-------|-------|-----------|
| Agent D | 4.1 + 4.2 + 4.5 + 4.6 (sidebar, card, loading, portal fix) | worktree |
| Agent E | 4.3 + 4.4 (dashboard bento, progress bar) | worktree |
| Agent F | 5.1 + 5.2 + 5.3 + 5.4 (booking UX) | worktree |

Agents D and E touch different files. Agent F only touches booking components.
Safe to parallelize.

---

## Files Changed Summary

### New files (15 components + 9 tests = 24):
- `apps/web/src/components/ui/theme-toggle.tsx`
- `apps/web/src/components/ui/motion.tsx`
- `apps/web/src/components/ui/tooltip.tsx` (shadcn)
- `apps/web/src/components/ui/dropdown-menu.tsx` (shadcn)
- `apps/web/src/components/ui/popover.tsx` (shadcn)
- `apps/web/src/components/ui/sheet.tsx` (shadcn)
- `apps/web/src/components/ui/command.tsx` (shadcn)
- `apps/web/src/components/ui/accordion.tsx` (shadcn)
- `apps/web/src/components/ui/progress.tsx` (shadcn)
- `apps/web/src/components/ui/switch.tsx` (shadcn)
- `apps/web/src/components/ui/scroll-area.tsx` (shadcn)
- `components.json` (shadcn config, generated by `shadcn init`)
- 9 new test files (see Phase 6)

### Modified files (~48, plus 14 Dialog consumers to verify):
- `apps/web/package.json` (4 new deps, 2 removed: react-dnd*)
- `apps/web/src/app/layout.tsx` (fonts, ThemeProvider, Toaster)
- `apps/web/src/app/globals.css` (OKLCH colors, font vars, @theme inline
  wrappers, remove keyframes)
- **OKLCH inline style fixes (AUDIT ADDITION):**
  - `apps/web/src/app/(dashboard)/calendar/page.tsx` (24 `hsl(var(--))` → `var(---)`)
  - `apps/web/src/app/book/[slug]/page.tsx` (1 hardcoded HSL gradient)
- **Dark mode fix (AUDIT ADDITION):**
  - `apps/web/src/app/(portal)/layout.tsx` (`bg-gray-50` → `bg-muted`)
- `apps/web/src/components/ui/button.tsx` (motion.button)
- `apps/web/src/components/ui/card.tsx` (rounded-xl, hover shadow)
- `apps/web/src/components/ui/dialog.tsx` (Radix replacement)
- `apps/web/src/components/ui/select.tsx` (Radix replacement)
- `apps/web/src/components/ui/checkbox.tsx` (Radix replacement)
- `apps/web/src/components/ui/avatar.tsx` (Radix replacement)
- `apps/web/src/components/ui/separator.tsx` (Radix replacement)
- `apps/web/src/components/ui/input.tsx` (shadcn replacement)
- `apps/web/src/components/ui/label.tsx` (shadcn replacement)
- `apps/web/src/components/ui/skeleton.tsx` (shadcn replacement)
- `apps/web/src/components/ui/badge.tsx` (shadcn replacement)
- `apps/web/src/components/ui/table.tsx` (shadcn replacement)
- `apps/web/src/components/ui/tabs.tsx` (shadcn replacement)
- `apps/web/src/components/ui/textarea.tsx` (shadcn replacement)
- `apps/web/src/components/layout/sidebar.tsx` (visual refinement)
- `apps/web/src/components/layout/header.tsx` (ThemeToggle)
- `apps/web/src/components/layout/mobile-nav.tsx` (ThemeToggle)
- `apps/web/src/components/booking/booking-wizard.tsx` (StepTransition)
- `apps/web/src/components/booking/booking-progress.tsx` (visual refinement)
- `apps/web/src/components/booking/confirmation-step.tsx` (Motion animation)
- `apps/web/src/components/booking/service-selection-step.tsx` (smart defaults)
- `apps/web/src/components/booking/date-time-picker-step.tsx` (UX polish)
- `apps/web/src/app/(dashboard)/layout.tsx` (PageTransition, skeleton loading)
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` (bento grid, FadeIn)
- 18 files for Select migration (see Step 3.4 / Appendix C)
- **14 Dialog consumer files (AUDIT ADDITION)** — no changes needed if
  Radix Dialog maintains same prop interface (verified: it does), but must
  verify each renders correctly after portal/focus-trap behavior changes

### Test files modified (7 unit + 2 E2E = 9):
- `button.spec.tsx`, `dialog.spec.tsx`, `separator.spec.tsx`
- `ticket-form.spec.tsx`, `feedback-widget.spec.tsx`
- `notifications-page.spec.tsx`, `booking-progress.spec.tsx`
- **E2E (AUDIT ADDITION):**
  - `admin-bookings.spec.ts` — `getByLabel(/status/i)` selector must work
    with Radix Select (verify label association post-migration)
  - `team-settings.spec.ts` — `getByRole('dialog')` works with Radix (verified)

### Test files created (9):
- `theme-toggle.spec.tsx`, `motion.spec.tsx`, `select.spec.tsx`
- `tooltip.spec.tsx`, `sheet.spec.tsx`, `switch.spec.tsx`
- `dropdown-menu.spec.tsx`, `accordion.spec.tsx`, `progress.spec.tsx`

---

## Appendix A: Pages Not Covered (Audit Finding)

The original plan focused on dashboard, booking flow, and components but
missed several page surfaces. Assessment of each:

### Landing Page (`apps/web/src/app/page.tsx`)
- Clean Tailwind-only implementation, no inline styles or hardcoded colors
- Uses semantic classes (`bg-primary`, `text-muted-foreground`)
- **Action:** Phase 2 — wrap hero section and feature cards with `FadeIn`.
  Phase 4 — apply `font-heading` to hero heading. No structural changes needed.

### Onboarding Page (`apps/web/src/app/onboarding/page.tsx`)
- Multi-step wizard using Card, Input, Label, Textarea, Select, Button, Badge
- Uses Select with native `<option>` pattern (included in 18-file migration)
- **Action:** Already covered by Select migration (Phase 3). Add step
  transition animations (Phase 2). Consider `FadeIn` on business type cards.

### Auth Pages (`apps/web/src/app/(auth)/`)
- Login, Register, Forgot Password, Reset Password
- Auth layout uses `bg-muted/50` (semantic — compatible with theme changes)
- **Action:** No changes needed. Font update via base layer rule applies
  automatically to headings.

### Portal Pages (`apps/web/src/app/(portal)/`)
- Portal layout uses `bg-gray-50` — **should be `bg-muted` or `bg-background`**
  for dark mode compatibility
- Portal navbar is separate from dashboard sidebar
- **Action:** Phase 4 — change `bg-gray-50` to `bg-muted` in portal layout.
  This is a one-line fix but required for dark mode.

### Auth Layout (`apps/web/src/app/(auth)/layout.tsx`)
- Uses `bg-muted/50` — semantic, dark-mode compatible
- **Action:** No changes needed.

## Appendix B: E2E Fragile Selectors (Audit Finding)

The E2E selector audit found selectors that could break during modernization.
These must be addressed proactively, not discovered during test failures.

### CRITICAL: CSS Class Dependencies

**`mobile-responsive.spec.ts` (lines 74-80):**
```ts
locator('.rbc-agenda-view')
locator('button.rbc-active', { hasText: 'Agenda' })
```
These depend on react-big-calendar's internal CSS classes. Not affected by
our UI changes (we're not replacing react-big-calendar), but they are
fragile selectors that should be noted.
**Action:** No change needed for this plan. Flag for future calendar redesign.

**`team-settings.spec.ts` (lines 81-83):**
```ts
locator('button').filter({ has: page.locator('svg.lucide-arrow-left') })
```
Depends on Lucide icon CSS class inside a button. Fragile but not affected
by our changes (we're keeping lucide-react).
**Action:** No change needed. Consider adding `aria-label="Back"` to the
back button for resilience.

### HIGH: Label-Based Selectors vs Radix Select

**`admin-bookings.spec.ts` (lines 47-50):**
```ts
getByLabel(/status/i)
getByLabel(/start date/i)
getByLabel(/end date/i)
getByLabel(/search/i)
```

After Radix Select migration, `getByLabel(/status/i)` must still work.
Radix Select's `<SelectTrigger>` can be associated with a label via
`aria-labelledby` or by wrapping in a `<Label>`. **Verify that each
migrated Select preserves label association.**

**Migration pattern for labeled selects:**
```tsx
// Ensure Label has htmlFor matching SelectTrigger's id:
<Label htmlFor="status-filter">Status</Label>
<Select value={val} onValueChange={setVal}>
  <SelectTrigger id="status-filter">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All</SelectItem>
  </SelectContent>
</Select>
```

### MEDIUM: DOM Hierarchy Selectors

**`client-portal.spec.ts`:**
```ts
locator('header').getByText('SavSpot')
```
Assumes "SavSpot" text is inside a `<header>` element. Not affected by our
changes (portal navbar structure unchanged), but fragile.

**`settings-flow.spec.ts` (lines 58, 80):**
```ts
getByRole('heading', { name: 'Team' })  // then .click()
getByRole('heading', { name: 'Branding' })  // then .click()
```
Clicking headings as navigation. Relies on settings cards having clickable
headings. Not affected by Card visual changes (rounded-xl, shadow), but
if Card structure changes, could break.

## Appendix C: Select Migration Detail (All 18 Files)

All 18 files follow an identical pattern. The migration is mechanical:

**Current pattern (100% consistent across all 18 files):**
```tsx
import { Select } from '@/components/ui/select';

<Select
  id="my-select"
  value={state}
  onChange={(e) => setState(e.target.value)}
  disabled={isLoading}
>
  <option value="">All</option>
  {items.map((item) => (
    <option key={item.id} value={item.value}>{item.label}</option>
  ))}
</Select>
```

**Target pattern:**
```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

<Select
  value={state}
  onValueChange={(value) => setState(value)}
  disabled={isLoading}
>
  <SelectTrigger id="my-select">
    <SelectValue placeholder="All" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="__all__">All</SelectItem>
    {items.map((item) => (
      <SelectItem key={item.id} value={item.value}>{item.label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Key migration notes:**
1. `onChange={(e) => setState(e.target.value)}` → `onValueChange={(value) => setState(value)}`
   (Radix passes value directly, not an event)
2. `<option>` → `<SelectItem>` (different component name)
3. Empty string values (`value=""`) → use a sentinel like `value="__all__"`
   (Radix Select doesn't allow empty string values)
4. `id` moves from `<Select>` to `<SelectTrigger>` for label association
5. `className` for width (e.g., `w-[120px]` in member-list) moves to `<SelectTrigger>`
6. **Business logic change required:** Filter components that use `value=""`
   for "show all" must change to a sentinel like `"__all__"`. The filter
   handler must also be updated: `if (value === '__all__') setFilter('')`
   or equivalent. This affects bookings/page.tsx, clients/page.tsx,
   payments/page.tsx, and portal/bookings/page.tsx filter selects.

## Appendix D: Unused Dependencies

**`react-dnd` and `react-dnd-html5-backend`** are listed in `package.json`
but have zero imports across the entire codebase. They were likely added for
planned calendar drag-and-drop that uses react-big-calendar's built-in DnD
instead.

**Action:** Remove in Phase 1 (Step 1.1):
```bash
pnpm remove react-dnd react-dnd-html5-backend
```

> Note: No `@types/react-dnd` exists in package.json (types are bundled).

This reduces bundle size with zero risk.

## Appendix E: Portal Layout Dark Mode Fix

**File: `apps/web/src/app/(portal)/layout.tsx`**

Currently uses `bg-gray-50` which is a fixed Tailwind color — it won't
respond to dark mode. Must change to semantic token.

```tsx
// BEFORE:
<div className="min-h-screen bg-gray-50">

// AFTER:
<div className="min-h-screen bg-muted">
```

**Phase:** 4 (Layout & Visual Polish). One-line change. No test impact.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OKLCH not supported in older browsers | Safari 15.4+, Chrome 111+, Firefox 113+ all support OKLCH. Check analytics — if needed, add PostCSS fallback plugin |
| **`hsl(var(--))` inline refs break after OKLCH migration** | **Step 1.3a added (AUDIT FIX).** Update all 24 calendar inline styles and 1 booking page gradient BEFORE changing CSS var values. Run `pnpm build` and visually verify calendar page |
| motion.button breaks ref forwarding | Test in button.spec.tsx. Fallback: use CSS `active:scale-[0.97]` instead |
| Radix Select changes E2E selectors | Run E2E after each batch. Radix uses standard ARIA roles, so `getByRole` queries should work. **Key risk:** `getByLabel(/status/i)` in admin-bookings E2E — must ensure Radix SelectTrigger has `id` matching Label's `htmlFor` |
| **Radix Select empty value** | Native `<option value="">` doesn't work in Radix. Use sentinel value like `"__all__"` for "show all" options. Update filter logic accordingly in all 18 consumer files |
| **Dialog portal breaks DOM-relative selectors** | Radix Dialog renders in a portal (outside parent DOM). Any test or code that finds dialog content by parent relationship will break. E2E audit found `getByRole('dialog')` which works with Radix. Unit test `dialog.spec.tsx` needs full rewrite |
| **14 Dialog consumers, not 0** | Original plan undercounted. Prop interface is compatible (verified), but must visually verify all 14 files after Radix replacement for focus trap and scroll lock behavior |
| Animation causes layout shift | All animations use `opacity` and `transform` only (GPU-composited, no layout recalc) |
| Dark mode flash on load | `suppressHydrationWarning` on `<html>` + next-themes handles script injection |
| **Portal layout `bg-gray-50` in dark mode** | Fixed in Appendix E — change to `bg-muted`. One-line fix, Phase 4 |
| Too many changes at once | Each phase ships independently. Phase 1 alone is valuable |
