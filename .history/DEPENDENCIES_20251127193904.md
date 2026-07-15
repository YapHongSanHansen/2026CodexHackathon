# 📦 AMANA Dependencies Documentation

This document lists all dependencies required to run the AMANA platform.

---

## 🎯 Project Type

**Technology:** Node.js with Next.js 14 (App Router)  
**Package Manager:** npm (compatible with pnpm/yarn)  
**Language:** TypeScript 5.3.3  

---

## 📋 Production Dependencies

### **Core Framework**
```json
{
  "next": "^14.1.0",           // React framework with App Router, SSR, API routes
  "react": "^18.2.0",          // UI library
  "react-dom": "^18.2.0"       // React DOM renderer
}
```

### **AI & Backend Integration**
```json
{
  "jamaibase": "^0.4.0",       // JamAI Base SDK for Action/Knowledge Tables
  "dotenv": "^17.2.3"          // Environment variable management
}
```

### **UI Components & Styling**
```json
{
  "lucide-react": "^0.316.0",  // Icon library (CheckCircle, Upload, etc.)
  "framer-motion": "^12.23.24" // Animation library for smooth transitions
}
```

### **File Management**
```json
{
  "react-dropzone": "^14.3.8"  // Drag-and-drop file upload
}
```

### **Markdown & Reporting**
```json
{
  "react-markdown": "^10.1.0", // Render markdown in React components
  "remark-gfm": "^4.0.1"       // GitHub Flavored Markdown support (tables, etc.)
}
```

### **PDF Generation**
```json
{
  "jspdf": "^3.0.4",           // Client-side PDF generation
  "html2canvas": "^1.4.1"      // HTML to canvas for PDF conversion
}
```

### **Browser Automation** (IHCS Manual Generation)
```json
{
  "puppeteer": "^24.31.0"      // Headless Chrome for server-side PDF generation
}
```

---

## 🛠️ Development Dependencies

### **TypeScript & Types**
```json
{
  "typescript": "^5.3.3",            // TypeScript compiler
  "@types/node": "^20.19.25",        // Node.js type definitions
  "@types/react": "^18.2.48",        // React type definitions
  "@types/react-dom": "^18.2.18",    // React DOM type definitions
  "@types/jspdf": "^1.3.3"           // jsPDF type definitions
}
```

### **CSS & Styling**
```json
{
  "tailwindcss": "^3.4.1",     // Utility-first CSS framework
  "postcss": "^8.4.33",        // CSS transformation tool
  "autoprefixer": "^10.4.17"   // CSS vendor prefix automation
}
```

---

## 📦 Full package.json

```json
{
  "name": "halal-x",
  "version": "1.0.0",
  "description": "AI-Powered JAKIM Halal Certification Assistant",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "dotenv": "^17.2.3",
    "framer-motion": "^12.23.24",
    "html2canvas": "^1.4.1",
    "jamaibase": "^0.4.0",
    "jspdf": "^3.0.4",
    "lucide-react": "^0.316.0",
    "next": "^14.1.0",
    "puppeteer": "^24.31.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-dropzone": "^14.3.8",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1"
  },
  "devDependencies": {
    "@types/jspdf": "^1.3.3",
    "@types/node": "^20.19.25",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3"
  }
}
```

---

## 🔧 Installation Commands

### **Install all dependencies:**
```bash
npm install
```

### **Install production dependencies only:**
```bash
npm install --production
```

### **Update all dependencies:**
```bash
npm update
```

### **Audit security vulnerabilities:**
```bash
npm audit
npm audit fix
```

---

## 🌐 External Services Dependencies

### **JamAI Base** (Required)
- **What:** Serverless AI platform for Action/Knowledge Tables
- **Purpose:** Backend AI logic, RAG, Vision AI, Whisper transcription
- **Signup:** [https://cloud.jamaibase.com](https://cloud.jamaibase.com)
- **Pricing:** Free tier available, pay-as-you-go for production
- **API Version:** v1 (https://api.jamaibase.com/v1)

### **Node.js** (Required)
- **Version:** 18+ LTS
- **Download:** [https://nodejs.org](https://nodejs.org)
- **Why:** Runtime for Next.js and all JavaScript packages

### **npm** (Required)
- **Version:** 9+ (comes with Node.js)
- **Alternative:** pnpm 8+ or yarn 1.22+

---

## 📊 Dependency Analysis

### **Total Size (node_modules):**
- **Production:** ~450 MB (includes Puppeteer/Chromium)
- **Development:** ~480 MB (with TypeScript compiler)

### **Critical Dependencies:**
1. **jamaibase** - Core AI functionality
2. **next** - Framework foundation
3. **react** - UI rendering
4. **react-markdown** - Report generation
5. **jspdf** - PDF export

### **Optional Dependencies** (can be removed if features unused):
- **puppeteer** - Only needed for IHCS server-side PDF generation (can use client-side jspdf instead)
- **framer-motion** - Only for animations (can remove for smaller bundle)

---

## 🔒 Security Considerations

### **Environment Variables (Never commit!):**
```env
JAMAI_API_KEY=                      # Sensitive - Ingredient Guard
PRE_AUDIT_API_KEY=                  # Sensitive - Pre-Audit
NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN=  # Sensitive - IHCS
```

### **Public Environment Variables (Safe to expose):**
```env
NEXT_PUBLIC_JAMAI_PROJECT_ID=       # Project ID (public)
NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID=   # Project ID (public)
NEXT_PUBLIC_JAMAI_BASE_URL=         # API URL (public)
```

### **Security Best Practices:**
1. Never commit `.env.local` to Git
2. Rotate API keys quarterly
3. Use separate JamAI projects for each feature
4. Enable API rate limiting in JamAI dashboard
5. Validate all file uploads (size, type, content)

---

## 🚀 Performance Optimization

### **Bundle Size Optimization:**
```bash
# Analyze bundle size
npm run build
npm run analyze  # (requires next-bundle-analyzer)
```

### **Lazy Loading:**
- Markdown rendering is lazy-loaded per page
- PDF generation only loads when needed
- Puppeteer is server-side only (not in client bundle)

### **Code Splitting:**
- Each page route is automatically code-split by Next.js
- Dynamic imports for heavy components (PDF generators)

---

## 🧪 Testing Dependencies (Future)

### **Recommended Testing Stack:**
```json
{
  "vitest": "^1.0.0",           // Unit testing framework
  "playwright": "^1.40.0",      // E2E testing
  "@testing-library/react": "^14.0.0",  // React component testing
  "@testing-library/jest-dom": "^6.1.0"  // DOM matchers
}
```

---

## 📝 Dependency Update Log

| Date | Package | Old Version | New Version | Reason |
|------|---------|-------------|-------------|--------|
| 2025-11-26 | react-markdown | 9.0.0 | 10.1.0 | Pre-Audit report rendering |
| 2025-11-26 | remark-gfm | 3.0.0 | 4.0.1 | GitHub tables support |
| 2025-11-26 | react-dropzone | - | 14.3.8 | Drag-and-drop file upload |
| 2025-11-26 | jamaibase | 0.3.x | 0.4.0 | SDK updates for file upload |

---

## 🆘 Troubleshooting

### **Common Issues:**

#### **1. Puppeteer Installation Fails**
```bash
# Skip Chromium download (use system Chrome)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install

# Or install Chromium manually
npx puppeteer browsers install chrome
```

#### **2. TypeScript Errors**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run dev
```

#### **3. Module Not Found**
```bash
# Check Node.js version
node -v  # Should be 18+

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### **4. JamAI SDK Errors**
```bash
# Verify environment variables
node scripts/verify-all-configs.js

# Test connection
node scripts/test-pre-audit-connection.js
```

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [JamAI Base SDK Docs](https://docs.jamaibase.com)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## 🔄 Automated Dependency Management

### **Use Dependabot (GitHub):**
Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### **Security Scanning:**
```bash
# Install audit tool
npm install -g npm-audit-resolver

# Run security audit
npm audit
```

---

**Last Updated:** November 27, 2025  
**Node.js Version:** 18+ LTS  
**Package Manager:** npm 9+
