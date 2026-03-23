# RE-DEV MODELER

Real Estate Development Financial Modeling Platform.

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run locally (uses localStorage - no Supabase needed)
npm run dev
```

Open http://localhost:5173

## Deploy to Production

### Step 1: Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Wait for project to initialize
3. Go to **SQL Editor** → paste contents of `supabase/schema.sql` → Run
4. Go to **Settings → API** → copy **Project URL** and **anon public key**

### Step 2: GitHub

```bash
git init
git add .
git commit -m "RE-DEV MODELER v1.0"
git remote add origin https://github.com/YOUR_USERNAME/re-dev-modeler.git
git push -u origin main
```

### Step 3: Vercel (Hosting)

1. Go to [vercel.com](https://vercel.com) → Import Git Repository
2. Select your GitHub repo
3. Add Environment Variables:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click Deploy
5. Go to **Settings → Domains** → Add your custom domain

### Step 4: Custom Domain

In your domain registrar (e.g. GoDaddy, Namecheap):
- Add CNAME record: `redev` → `cname.vercel-dns.com`
- Or A record: `@` → `76.76.21.21`

Then in Vercel → Settings → Domains → Add `redev.yourdomain.com`

## Architecture

```
src/
  App.jsx              - Main application (all 5 phases)
  main.jsx             - React entry point
  excelExport.js       - Excel export (platform → Excel template)
  engine/              - Calculation engine
  lib/
    supabase.js        - Supabase client
    storage.js         - Storage adapter (Supabase / localStorage)

templates/
  ZAN_Full_Model_v11_AUDITED.xlsx  - Excel model template (26,208 formulas)

docs/excel/
  EXCEL_MODEL.md       - Full reference (inputs, outputs, formula chain)
  EXCEL_CHANGELOG.md   - Version history
  EXCEL_WORKFLOW.md    - How to add/modify inputs and outputs
  excel_model_spec.json - Machine-readable cell map (524 inputs, 56 outputs)

tests/                 - 633+ automated tests
supabase/
  schema.sql           - Database schema
```

## Excel Model

The platform exports a fully dynamic Excel file (not just static numbers). The template at `templates/ZAN_Full_Model_v11_AUDITED.xlsx` contains 26,208 formulas across 15 sheets. The platform fills 524 input cells, and all outputs recalculate automatically when the user opens the file.

Full documentation: [`docs/excel/README.md`](docs/excel/README.md)

## Features

- **Phase 1**: Project Engine (assets, CAPEX, revenue, IRR/NPV)
- **Phase 2**: Financing Engine (debt, equity, DSCR, Islamic finance)
- **Phase 3**: Waterfall Engine (GP/LP, 4-tier distributions)
- **Phase 4**: Report Generator (bank pack, investor memo, PDF)
- **Phase 5**: Scenario Manager (8 scenarios, sensitivity, break-even)
- **Incentives**: CAPEX grant, interest subsidy, land rent rebate, fee rebates
- **Bilingual**: English / Arabic
