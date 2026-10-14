# Next.js Dynamic QR Code & Analytics Platform

A standalone web application for generating dynamic QR codes with real-time scan analytics, device detection, and on-the-fly destination updating.

---

## 🚀 Quick Start (Local)

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## ⚡ Deploy to Vercel

### Option 1: Vercel Dashboard (Easiest)
1. Go to [vercel.com/new](https://vercel.com/new).
2. Select your repository.
3. In **Root Directory**, click **Edit** and select **`qr-code-app`**.
4. Click **Deploy**.

### Option 2: Vercel CLI
```bash
cd qr-code-app
npx vercel
```

---

## 📊 Features
* **Dynamic Redirects (`/r/[slug]`):** Point QR codes to short links and change the destination website at any time without reprinting.
* **Scan Analytics:** Tracks total scans, mobile vs desktop breakdown, browser, operating system, and timestamp.
* **High-Res Downloads:** Export crisp **1024x1024 PNG** or **Vector SVG** ready for business card printing.
