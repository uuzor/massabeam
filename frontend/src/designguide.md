# Massabeam Design Guidelines

## Core Design Philosophy
Technical cyberpunk aesthetic inspired by Reactive.network's matrix-like interface. Create a precision-focused UI visualizing cross-chain coordination as a real-time computational system—like monitoring network traffic in a sophisticated terminal.

---

## Visual System

### Color Palette

**Dark Mode Foundation:**
```css
--bg-base: 12 8% 8%        /* Deep charcoal background */
--surface-1: 12 8% 12%      /* Card backgrounds */
--surface-2: 12 8% 16%      /* Elevated elements/inputs */
--border: 12 8% 24%         /* Dividers/grid lines */
```

**Accent System:**
```css
--primary: 142 76% 48%      /* Electric green - active/success */
--secondary: 210 100% 56%   /* Cyan - info/secondary */
--warning: 38 92% 50%       /* Amber - pending */
--error: 0 84% 60%          /* Red - errors/cancel */
```

**Text:**
```css
--text-primary: 0 0% 98%    /* Near white */
--text-secondary: 0 0% 71%  /* Muted gray */
--text-disabled: 0 0% 45%   /* Dim gray */
```

**Semantic (Order States):**
- Active: Green (142 76% 48%)
- Filled: Cyan (210 100% 56%)
- Cancelled: Red (0 84% 60%)
- Pending: Amber (38 92% 50%)

### Typography

**Font:** `'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace` (all text)

**Scale:**
- Display: `text-5xl md:text-7xl font-bold tracking-tight`
- H1: `text-3xl md:text-4xl font-semibold tracking-tight`
- H2: `text-xl md:text-2xl font-medium`
- H3: `text-lg md:text-xl font-medium`
- Body: `text-sm md:text-base tracking-wide`
- Label/Caption: `text-xs md:text-sm tracking-wider uppercase`

**Rules:**
- Labels/technical data: UPPERCASE with increased letter-spacing
- Addresses: Truncate with ellipsis (0x1234...5678)
- Numbers: Right-align in tables, use tabular figures
- Monospace for all inputs

### Layout

**Spacing:** Use 2, 4, 6, 8, 12, 16, 20, 24
- Micro: `gap-2 p-2` (8px)
- Component: `gap-4 p-4` (16px)
- Section: `gap-8 p-8` (32px)
- Page margins: `px-4 md:px-8 lg:px-16`

**Containers:**
- Main content: `max-w-7xl mx-auto`
- Dashboard: `grid grid-cols-1 lg:grid-cols-12 gap-6`

**Grid Background:** Apply to body/main
```css
background-image: repeating-linear-gradient(0deg, rgba(142,76,48,0.03) 0px, transparent 1px, transparent 24px),
                  repeating-linear-gradient(90deg, rgba(142,76,48,0.03) 0px, transparent 1px, transparent 24px);
background-size: 24px 24px;
```

---

## Component Patterns

### Navigation
```
- Fixed top: backdrop-blur-xl bg-[hsl(12,8%,8%)]/80
- Layout: Logo left, wallet right, chain switcher dropdown
- Active route: electric green underline
```

### Cards
```
bg-[hsl(12,8%,12%)] border border-[hsl(12,8%,24%)] rounded-lg p-6
hover: border-[hsl(142,76%,48%)]
```

### Buttons
```
Primary: bg-[hsl(142,76%,48%)] text-black font-medium px-6 py-3 rounded-md
Secondary: border border-[hsl(142,76%,48%)] text-[hsl(142,76%,48%)] bg-transparent
Destructive: bg-[hsl(0,84%,60%)] text-white
Ghost: text-[hsl(0,0%,71%)] hover:text-[hsl(0,0%,98%)]
Image overlay: backdrop-blur-md bg-black/40
```

### Inputs
```
bg-[hsl(12,8%,16%)] border border-[hsl(12,8%,24%)] px-4 py-3 rounded-md
focus: border-[hsl(142,76%,48%)] ring-2 ring-[hsl(142,76%,48%)]
placeholder: text-[hsl(0,0%,45%)]
```

### Tables
```
Header: uppercase text-xs text-[hsl(0,0%,71%)]
Rows: border-b border-[hsl(12,8%,24%)]
Hover: bg-[hsl(12,8%,16%)]
Alignment: Numbers right, text left
```

### Modals
```
Backdrop: bg-black/80 backdrop-blur-sm
Container: Same as cards with elevated shadow
Animation: fade + scale-95 to scale-100 (200ms)
```

### Status Badges
```
rounded-full px-3 py-1 text-xs uppercase
Colors: Use semantic palette based on state
```

---

## Animations (Minimal)

**Allowed:**
- Chain switch: 200ms fade
- Status update: Single pulse (`animate-pulse` once)
- Pending: Spinner (`border-t-transparent animate-spin`)
- Success: 300ms green flash
- Page load: 200ms fade-in

**Interactive States:**
- Hover: `brightness-110`
- Active: `scale-98`
- Focus: `ring-2 ring-[hsl(142,76%,48%)]`
- Disabled: `opacity-40 cursor-not-allowed`

**Prohibited:** Scale effects, floating animations, parallax, auto-carousels

---

## Page Specifications

### Bridge Interface (Order Placement)
**Layout:** 60/40 split desktop

**Left (Config):**
- Chain selector (From/To) with visual switcher
- Token selectors + balance
- Amount inputs + max button
- Advanced accordion: slippage, premium, duration
- Price feed toggle
- "Place Order" CTA (bottom)

**Right (Preview):**
- Expected output
- Premium calculation
- Protocol fees
- Estimated time
- Route visualization (A → Reactive → B)

**Enhancements:** Animated connection line, real-time price flash, gas estimate

### Order Dashboard
**Top Bar:** Filter tabs (All/Active/Filled/Cancelled), search, chain filter, time range

**Grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

**Card Content:**
- Order ID (large mono)
- Status badge (animated if pending)
- Token pair + amounts
- Origin → Destination (icons)
- Timestamp (relative)
- Fill progress bar
- Actions: View Details / Cancel

**Empty State:** ASCII art + "No orders found" + CTA

### Order Detail
**Layout:** `max-w-4xl` centered

**Header:** Order ID, status badge, timestamp, breadcrumb

**Timeline (Vertical):**
1. Order Placed (Origin)
2. Reactive Processing
3. Order Received (Dest)
4. Market Maker Fill
5. Fill Confirmed (Origin)
6. Finalized (Dest)

Each step: Name, tx hash (clickable), timestamp, gas, status icon

**Details Card:** Amounts, addresses, orderer, MM, premium, fees, slippage, price data

**Logs:** Accordion with RVM transactions, event logs, syntax-highlighted JSON

**Actions:** Cancel (modal confirm), share, export JSON

### Market Maker Fill
**Filters:** Chain pair, min premium, token pair, amount range

**Cards:** Premium % prominent, profit calc, balance check, "Fill Order" CTA

**Fill Modal:**
- Order summary
- Fill amount input (partial support)
- Slippage preview
- Output calculation
- Token approval flow
- "Confirm Fill"

**Active Fills Tab:** Pending fills, cross-chain status, completion ETA

### Wallet Connection
**States:**
- Disconnected: "Connect Wallet" (outline)
- Connecting: Spinner + "Connecting..."
- Connected: Address (truncated) + chain badge + dropdown

**Chain Switcher Dropdown:**
- Sonic Testnet (icon + name + status)
- Base Testnet (icon + name + status)
- 200ms transition on switch

**Wallet Menu:** Address + copy, balance, switch chain, disconnect, view explorer

---

## Implementation Details

### Icons (No Large Images)
Use geometric SVG/Unicode:
- Chains: ◆ ● ▲ (shapes per chain)
- Status: ✓ ⟳ ⏸ ✕
- Actions: → ← ↔
- Chain/wallet logos: 20×20px SVG only

### Accessibility
- 4.5:1 contrast minimum
- Keyboard navigation (all interactive)
- Visible focus indicators (green ring)
- Screen reader labels on icon buttons
- ARIA labels for status updates

### Responsive
- Mobile <768px: Single column, stacked
- Tablet 768-1024px: 2-column grids
- Desktop >1024px: 3-column grids, multi-panel

### Voice
- **Tone:** Technical, precise, confident
- **Style:** Short declarative sentences, active voice, no fluff
- **Errors:** Specific + actionable ("Insufficient USDC. Need 100, have 50")
- **Success:** Minimal ("Order #1234 placed. Waiting for fill.")

---

## Landing Page (Built Last)

**Hero (100vh):** Grid overlay, centered protocol name + tagline, ASCII art visualization, "Launch App" CTA (green), no images

**Features (80vh):** 3-column grid—Cross-Chain / MM Network / Anti-MEV. Geometric icons (accent colors), mono descriptions, code snippets

**Stats (60vh):** 4-column—Volume / Active Orders / MMs / Chains. Large animated numbers, real-time data

**Footer:** Minimal links/social/docs, darker bg (12 8% 6%)