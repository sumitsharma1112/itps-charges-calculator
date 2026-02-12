# ITPS Tariff Calculator

**India Post — International Tracked Packet Service**

A clean, browser-based postage calculator for India Post's ITPS service. Covers all **135 countries**, calculates the base tariff + additional weight slabs + 18% GST, and lets you download a formatted PDF receipt.

---

## ✨ Features

- **135 countries** from the official India Post ITPS tariff chart
- Automatic **max permissible weight** display on country selection
- Real-time **overweight warning**
- Full breakdown: base tariff → additional slabs → GST → **total payable**
- **Save as PDF** button that generates a print-ready receipt

---

## 🚀 Deploy to GitHub Pages (5 minutes)

### Step 1 — Create a new repository

1. Go to [github.com/new](https://github.com/new)
2. Name it anything, e.g. `itps-calculator`
3. Set visibility to **Public** (required for free GitHub Pages)
4. Click **Create repository**

### Step 2 — Upload the files

**Option A — GitHub web interface (no Git required)**

1. On your new repo page click **uploading an existing file**
2. Drag and drop **all files and folders** from this project:
   - `index.html`
   - `css/` folder
   - `js/` folder
   - `.github/` folder
3. Click **Commit changes**

**Option B — Git command line**

```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/itps-calculator.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages** (left sidebar)
2. Under **Source**, select **GitHub Actions**
3. Click **Save**

That's it! The workflow at `.github/workflows/deploy.yml` will run automatically and your site will be live at:

```
https://YOUR_USERNAME.github.io/itps-calculator/
```

> **Note:** First deployment takes 1–2 minutes. Subsequent pushes deploy automatically.

---

## 📁 Project Structure

```
itps-calculator/
│
├── index.html                    # Main HTML — structure & markup
│
├── css/
│   └── style.css                 # All styles (CSS variables, layout, responsive)
│
├── js/
│   ├── data.js                   # Tariff data for all 135 countries
│   └── script.js                 # Calculator logic + PDF export
│
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions auto-deploy workflow
│
└── README.md                     # This file
```

---

## 🧮 How the Tariff is Calculated

| Component | Formula |
|-----------|---------|
| Base tariff | Fixed rate for first 50g (or part thereof) |
| Additional weight | `ceil((weight − 50) / 50)` slabs × per-slab rate |
| Subtotal | Base + Additional |
| GST | Subtotal × 18% |
| **Total** | **Subtotal + GST** |

---

## 📄 PDF Receipt

Click **Save PDF** after calculating to download a receipt that includes:
- Destination country & packet weight
- Maximum permissible weight
- Itemised tariff breakdown
- GST calculation
- Total payable amount
- Timestamp

---

## ⚙️ Local Development

No build step required — it's plain HTML/CSS/JS.

```bash
# Option 1: just open the file
open index.html

# Option 2: use a simple local server (avoids any CORS issues)
npx serve .
# or
python3 -m http.server 8080
```

---

## 📋 Data Source

Tariff data sourced from the **Revised Tariff and Weight of ITPS** chart published by India Post, covering 135 countries. Rates are in Indian Rupees (INR).

> Tariffs are subject to revision. Always verify current rates with India Post before quoting customers.

---

## 📝 License

MIT — free to use, modify, and distribute.
