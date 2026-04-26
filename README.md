<p align="center">
  <strong>IMS-Viviana</strong><br/>
  <sub>Inventory & Warehouse Management System</sub>
</p>

---

# IMS-Viviana

A full-stack, bilingual (EN/TR) inventory and warehouse management system built as a monorepo. The platform provides real-time dashboards, inventory CRUD, bulk stock operations, inter-warehouse transfers, QR label generation, and CSV data exports — all backed by a Supabase (PostgreSQL) database.

## Tech Stack

| Layer | Technology |
|---|---|
| **Web App** | Next.js 16 · React 19 · TypeScript 5 |
| **Mobile App** | Expo 54 · React Native 0.81 |
| **Database** | Supabase (PostgreSQL) |
| **Styling** | Tailwind CSS 4 · CSS Custom Properties (design tokens) |
| **Charts** | Recharts 3 |
| **Animations** | Framer Motion 12 |
| **Icons** | Lucide React |
| **Monorepo** | npm Workspaces |
| **Fonts** | Bricolage Grotesque · DM Sans · JetBrains Mono |

## Project Structure

```
ims-viviana/
├── apps/
│   ├── web/                      # Next.js web dashboard
│   │   ├── app/
│   │   │   ├── dashboard/        # Command Center — KPIs, telemetry charts, live feed
│   │   │   ├── inventory/        # Inventory Directory — CRUD, search, filters, QR codes
│   │   │   ├── settings/         # System Configuration — preferences, warehouse mgmt
│   │   │   ├── components/       # Shared UI (Modal, Sidebar, ThemeProvider, etc.)
│   │   │   ├── utils/            # Validation helpers (SKU, quantity)
│   │   │   ├── layout.tsx        # Root layout with providers
│   │   │   └── globals.css       # Design system tokens & theme variables
│   │   └── lib/                  # Utility functions (cn)
│   │
│   └── mobile/                   # Expo / React Native companion app
│       ├── app/
│       │   ├── (tabs)/
│       │   │   ├── index.tsx     # Operations — QR/barcode scanning, manual SKU entry
│       │   │   ├── stock.tsx     # Inventory — filterable stock list with stats
│       │   │   └── profile.tsx   # Profile — theme, warehouse prefs, haptic toggle
│       │   ├── _layout.tsx       # Root stack with splash screen & fonts
│       │   └── modal.tsx         # About screen
│       ├── components/
│       │   ├── QRScanner.tsx     # Camera-based QR/barcode scanner with torch
│       │   ├── OperationSheet.tsx # Stock in/out/transfer confirmation sheet
│       │   ├── ItemCard.tsx      # Inventory list item card
│       │   ├── StatusBadge.tsx   # Optimal/Low/Critical status indicator
│       │   └── Themed.tsx        # Theme-aware View & Text primitives
│       ├── constants/            # Colors & theme design tokens
│       └── lib/                  # Mobile Supabase client (AsyncStorage auth)
│
├── packages/
│   ├── database/                 # Shared Supabase client (web + mobile)
│   ├── utils/                    # Shared utilities (date formatting, SKU validation)
│   ├── i18n/                     # Bilingual translation system (EN/TR)
│   └── config/                   # Shared ESLint configuration
│
└── package.json                  # Workspace root
```

## Features

### Web Dashboard (`apps/web`)

- **Dashboard** — Real-time KPIs (active SKUs, critical stock, inbound/outbound volume), throughput telemetry charts, live transaction feed, bulk inbound/outbound operations, inter-warehouse transfers, SKU lookup
- **Inventory Directory** — Paginated & filterable inventory table, entity registration, stock adjustments (inbound/outbound with supplier/recipient tracking), profile editing, QR code generation & printing, CSV export, archive/restore
- **Settings** — System parameters (facility ID, locale, sync rate), interface preferences (dark mode, high contrast, reduced motion), alert configuration, warehouse location management (add/remove)
- **Design System** — Industrial-editorial aesthetic with CSS custom properties, light/dark theme support, glassmorphism, micro-animations

### Mobile App (`apps/mobile`)

- **Operations** — QR/barcode scanning (EAN-13, Code 128, QR) with camera torch toggle, manual SKU entry, multi-item scanning with session management
- **Stock In / Stock Out** — Batch inventory adjustments via `process_inventory_adjustment_bulk` RPC, supplier/recipient tracking, reference number generation
- **Transfers** — Inter-warehouse stock transfers via `transfer_stock` RPC with source/destination warehouse selection
- **Inventory Lookup** — Real-time stock levels by location, search by SKU/name, filter by category/status/warehouse
- **Profile & Settings** — Default warehouse preference (persisted via AsyncStorage), light/dark/system theme toggle, haptic feedback control

### Shared

- **Bilingual** — English and Turkish translations via shared `@ims-viviana/i18n` package

## Database Schema

The `public` schema contains the following tables and views:

| Table / View | Description |
|---|---|
| `items` | Master product registry — `stock_code` (PK), name, category, unit, min_stock, status |
| `batches` | Stock batches per item per location — quantity, batch_number, expiry_date, location |
| `transactions` | Audit log of all stock movements — type, qty_changed, location, partner, operator, timestamps |
| `warehouses` | Authorized storage locations |
| `profiles` | Operator profiles linked to `auth.users` |
| `inventory_summary` | Aggregated view joining items + batches for dashboard/inventory queries |

**Key relationships:**
- `transactions.item_stock_code → items.stock_code`
- `transactions.batch_id → batches.id`
- `batches.item_stock_code → items.stock_code`
- `profiles.id → auth.users.id`

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A [Supabase](https://supabase.com) project with the schema applied

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ims-viviana
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

   For mobile, create `apps/mobile/.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Run the web app**
   ```bash
   npm run dev --workspace=@ims-viviana/web
   ```
   Open [http://localhost:3000](http://localhost:3000)

5. **Run the mobile app** (optional)
   ```bash
   npm run start --workspace=@ims-viviana/mobile
   ```

## Scripts

| Command | Description |
|---|---|
| `npm run dev -w @ims-viviana/web` | Start Next.js dev server |
| `npm run build -w @ims-viviana/web` | Production build |
| `npm run lint -w @ims-viviana/web` | Lint the web app |
| `npm run start -w @ims-viviana/mobile` | Start Expo dev server |

## License

This project is proprietary and intended for academic/internal use.
