# 🚀 Quick Start Guide - Halal-X

Get the app running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

This will install:
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Lucide React (icons)

## Step 2: Run Development Server

```bash
npm run dev
```

The app will start at: **http://localhost:3000**

## Step 3: Open in Browser

### On Your Computer:
```
http://localhost:3000
```

### On Your Phone (same WiFi):
1. Find your computer's IP address:
   - **macOS:** System Preferences → Network → IP Address
   - **Or run:** `ifconfig | grep "inet " | grep -v 127.0.0.1`
   
2. Example: If your IP is `192.168.1.100`, open:
   ```
   http://192.168.1.100:3000
   ```

## Step 4: Test Features

### ✅ Eligibility Checker
1. Click "Semak Kelayakan" / "Check Eligibility"
2. Select business type (e.g., Restaurant)
3. Choose "No, all halal"
4. Click submit
5. See AI reasoning with Chain of Thought!

### 📸 NCR Risk Scanner
1. Click "Imbas Kilang" / "Scan Factory"
2. Upload any kitchen/factory photo
3. Wait for AI analysis (~3 seconds)
4. See risk score and issues found

### 💧 Sertu Guide
1. Click "Panduan Sertu" / "Sertu Guide"
2. Select equipment type (e.g., Knife)
3. Select previous use (e.g., Pork)
4. Get step-by-step cleansing instructions

### 📄 Form Helper
1. Click "Pembantu Borang" / "Form Helper"
2. Try example question: "Apa itu carta aliran pengeluaran?"
3. Get AI answer with suggested values

### 👥 Mock Audit
1. Click "Latihan Audit" / "Mock Audit"
2. Start practice session
3. Answer questions like real JAKIM auditor
4. See expected answers and tips

## Step 5: Test Language Toggle

Switch between **Bahasa Malaysia (BM)** and **English (EN)** using the toggle in the top-right corner.

## Optional: Build for Production

```bash
# Build optimized production bundle
npm run build

# Run production server
npm start
```

## Troubleshooting

### Port 3000 already in use?
```bash
# Use different port
PORT=3001 npm run dev
```

### TypeScript errors?
```bash
# Clean and reinstall
rm -rf node_modules .next
npm install
```

### Icons not showing?
The SVG icons work for development. For PWA installation, convert them to PNG:
```bash
# See ICONS.md for detailed instructions
```

## Next Steps

1. ✅ Test all 5 features
2. ✅ Try both languages (BM/EN)
3. ✅ Test on mobile device
4. ✅ Review Chain of Thought reasoning
5. ✅ Check README.md for full documentation

## Demo Day Checklist

- [ ] App running on your phone
- [ ] Test eligibility checker (show AI reasoning)
- [ ] Upload factory photo (show 73.5% stat)
- [ ] Show Sertu guide (explain failure rate)
- [ ] Highlight JamAI Base Chain of Thought
- [ ] Emphasize cost savings: RM3,500 → RM50

---

**Need Help?** Check `README.md` for detailed documentation.

**Ready to Present?** The app is demo-ready with mock data!

🕌 **Halal-X** - Built with ❤️ for Malaysian SMEs
