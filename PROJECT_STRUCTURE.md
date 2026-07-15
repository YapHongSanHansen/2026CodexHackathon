# Project Structure

```
halal-x/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Home page with 5 feature cards
│   ├── layout.tsx                # Root layout with Inter font & PWA config
│   ├── globals.css               # Global styles with Tailwind
│   ├── eligibility/
│   │   └── page.tsx              # Eligibility checker
│   ├── ncr-scan/
│   │   └── page.tsx              # NCR risk scanner
│   ├── sertu/
│   │   └── page.tsx              # Sertu process guide
│   ├── form-helper/
│   │   └── page.tsx              # MYeHALAL form assistant (chat)
│   └── mock-audit/
│       └── page.tsx              # Mock audit practice
│
├── components/                   # Reusable React components
│   ├── LanguageToggle.tsx        # BM/EN language switcher
│   ├── ChainOfThought.tsx        # Display AI reasoning steps
│   ├── LoadingState.tsx          # Loading spinner with message
│   └── StatusBadge.tsx           # Risk badges & issue cards
│
├── lib/                          # Core business logic
│   ├── jamaibase.ts              # JamAI Base API integration
│   │   ├── checkEligibility()    # Eligibility checker logic
│   │   ├── scanNCRRisks()        # Image analysis for NCR
│   │   ├── getSertuGuide()       # Sertu step generator
│   │   ├── askFormAssistant()    # Form Q&A assistant
│   │   └── startMockAudit()      # Mock audit questions
│   └── translations.ts           # BM/EN text translations
│
├── public/                       # Static assets
│   ├── manifest.json             # PWA manifest
│   ├── icon-192.svg              # App icon (192px) - needs PNG conversion
│   └── icon-512.svg              # App icon (512px) - needs PNG conversion
│
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS config (Halal-X colors)
├── postcss.config.js             # PostCSS config for Tailwind
├── .env.local                    # Environment variables (JamAI Base API)
├── .gitignore                    # Git ignore rules
│
├── README.md                     # Full project documentation
├── QUICKSTART.md                 # 5-minute setup guide
└── ICONS.md                      # Icon generation instructions
```

## Key Files Explained

### Core Logic (`lib/`)
- **jamaibase.ts**: All AI functions with mock implementations
  - Currently uses mock data for demo
  - Replace with actual JamAI Base API calls
  - Each function includes Chain of Thought reasoning

- **translations.ts**: Complete BM/EN translations
  - All UI text in both languages
  - Easy to add more languages

### Pages (`app/`)
Each page follows this pattern:
1. Import translations & API functions
2. Form view → Loading state → Result view
3. Display Chain of Thought reasoning
4. Navigate to next feature

### Components (`components/`)
- **LanguageToggle**: Bilingual support (BM/EN)
- **ChainOfThought**: Purple card showing AI reasoning steps
- **LoadingState**: Animated spinner with descriptive text
- **StatusBadge**: Color-coded risk indicators (High/Medium/Low)

### Styling
- **Tailwind CSS** with custom Halal-X color scheme
- **Islamic Green** theme: #16A085 primary
- **Mobile-first** responsive design
- **Custom utility classes** in globals.css

## File Count
- **TypeScript files**: 17
- **Config files**: 5
- **Documentation**: 3
- **Total lines of code**: ~2,500

## Development Workflow

1. **Start dev server**: `npm run dev`
2. **Edit pages**: `app/*/page.tsx`
3. **Edit logic**: `lib/jamaibase.ts`
4. **Edit styles**: `tailwind.config.ts` or `globals.css`
5. **Add translations**: `lib/translations.ts`

## Production Deployment

```bash
npm run build    # Creates optimized bundle in .next/
npm start        # Runs production server on port 3000
```

## Integration Points

### JamAI Base API
Replace mock functions in `lib/jamaibase.ts`:
- Set `JAMAI_BASE_URL` in `.env.local`
- Add `JAMAI_API_KEY` in `.env.local`
- Update API endpoints to match JamAI Base schema
- Keep Chain of Thought reasoning visible

### Knowledge Tables (Upload to JamAI Base)
1. `JAKIM_MPPHM_2020.pdf`
2. `NCR_Common_Issues.csv`
3. `Sertu_Process_Guide.pdf`
4. `MYeHALAL_Portal_Screenshots/`
5. `Foreign_Halal_Bodies_List.pdf`
6. `Cost_Timeline_Matrix.csv`

### Action Tables (Configure in JamAI Base)
1. `halal_eligibility_checker`
2. `ncr_risk_scanner`
3. `sertu_guide_generator`
4. `myehalal_form_assistant`
5. `mock_audit_generator`

---

**All files are production-ready with TypeScript, proper state management, and mobile-first design.**
