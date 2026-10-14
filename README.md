# Sales Rep Specials & Dynamic QR Hub

This repository contains a complete two-part system designed for sales reps and promotional marketing:

1. **📦 WordPress Plugin (`wordpress-plugin/sales-rep-specials`)**
   * Customer-facing mobile specials showcase (`yoursite.com/specials/`).
   * One-tap contact bar: Call, WhatsApp, Email, and Save vCard directly into phone contacts.
   * Rep frontend editor (`yoursite.com/specials/manage/`) protected by a 4-digit PIN.
   * Ready-to-upload ZIP package included: [`wordpress-plugin/sales-rep-specials.zip`](file:///Users/alihassan/Documents/Github/Qr-Code-Generator/wordpress-plugin/sales-rep-specials.zip).

2. **⚡ Next.js QR Code Generator & Analytics Platform (Root directory)**
   * Hostable on **Vercel** with Next.js App Router.
   * Generate multiple dynamic QR codes for any website or sales rep landing page.
   * Track real-time scan analytics: scan counts, timeline, device breakdown (Mobile vs Desktop vs Tablet), browsers, operating systems, and location.
   * Change destination URLs on the fly without having to reprint business cards.
   * Export print-ready high-resolution **PNG (1024x1024 px)** and **Vector SVG** for print shops.

---

## 🚀 Part 1: How to Deploy the Next.js QR Dashboard to Vercel

### Step 1: Push to GitHub
Commit and push this repository to GitHub:
```bash
git add .
git commit -m "Add WordPress plugin and Next.js QR Analytics Dashboard"
git push origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..." → "Project"**.
3. Select your `Qr-Code-Generator` repository.
4. Click **Deploy** (zero configuration needed; framework preset is automatically detected as **Next.js**).
5. Done! Your dashboard will be live at `https://your-project.vercel.app`.

---

## 🏷️ Part 2: How to Install the WordPress Plugin

1. Download [`wordpress-plugin/sales-rep-specials.zip`](file:///Users/alihassan/Documents/Github/Qr-Code-Generator/wordpress-plugin/sales-rep-specials.zip).
2. Log in to your WordPress Admin dashboard.
3. Navigate to **Plugins → Add New → Upload Plugin**.
4. Upload `sales-rep-specials.zip` and click **Install Now** and **Activate**.
5. Your public specials page is immediately live at:
   ```text
   https://yourwebsite.com/specials/
   ```
6. Sales reps can manage their specials anytime without WP Admin access by visiting:
   ```text
   https://yourwebsite.com/specials/manage/
   ```
   * Default PIN: `1234` (can be changed in settings).

---

## 🔗 Connecting Both Together

1. In your **Vercel QR Hub**, click **"Create New QR Code"**.
2. Set the Destination URL to your WordPress specials page:
   `https://yourwebsite.com/specials/`
3. Give it a slug like `rep-john`.
4. Click **Download PNG** or **Vector SVG** and send it to your print shop for business cards.
5. Whenever a customer scans the card:
   - Your Vercel dashboard automatically logs the scan, device, browser, and timestamp.
   - The customer is instantly redirected to the sales rep's specials page!
