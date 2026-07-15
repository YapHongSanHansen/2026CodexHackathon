# 🧪 IHCS JamAI Base Testing Checklist

## ✅ Setup Completed

- [ ] Created JamAI Base account
- [ ] Created project
- [ ] Got Project ID: `proj_________________`
- [ ] Created Personal Access Token: `pat_________________`
- [ ] Updated `.env.local` with credentials
- [ ] Created Action Table: `ihcs_content_transformer`
- [ ] Tested table manually in JamAI dashboard

---

## 📋 Action Table Configuration

**Table ID:** `ihcs_content_transformer`

### Input Columns:
1. ✅ `user_answer` (Text)
2. ✅ `company_name` (Text)
3. ✅ `business_type` (Text)
4. ✅ `chapter_number` (Text)
5. ✅ `language` (Text)

### Output Columns:
1. ✅ `formal_content` (Text) - AI generated
2. ✅ `compliance_score` (Text) - AI generated (returns number as text)
3. ✅ `suggestions` (Text) - AI generated (multiline)

---

## 🧪 Test Plan

### Test 1: Manual Test in JamAI Dashboard

**Before running code**, test the table directly:

1. Go to https://cloud.jamaibase.com
2. Open table: `ihcs_content_transformer`
3. Click "Add Row" or "Test"
4. Enter test data:
   ```
   user_answer: "We check supplier cert, must have halal logo"
   company_name: "ABC Food Manufacturing"
   business_type: "Food Manufacturing"
   chapter_number: "4"
   language: "bm"
   ```
5. Click "Run"
6. **Expected output:**
   - `formal_content`: Professional Bahasa Malaysia content with HTML formatting
   - `compliance_score`: Number between 70-95
   - `suggestions`: 3-5 bullet points with improvements

**✅ If this works, proceed to Test 2**

---

### Test 2: Test with Fallback (No JamAI)

Test that the system works WITHOUT JamAI (using templates):

1. **Temporarily break the connection:**
   - Open `.env.local`
   - Change PAT to: `NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN=invalid_token`

2. **Run the app:**
   ```powershell
   npm run dev
   ```

3. **Open:** http://localhost:3000/ihcs-architect

4. **Complete the 7 questions** and click "Generate PDF"

5. **Expected behavior:**
   - ⚠️ Console shows: `⚠️ JamAI API error, using fallback transformation`
   - ✅ PDF still generates (using template-based content)
   - 📊 Lower compliance scores (~70%)

**✅ If this works, your fallback system is working**

---

### Test 3: Test with Real JamAI Integration

Test with real AI transformation:

1. **Restore correct credentials:**
   - Open `.env.local`
   - Put back your real PAT: `NEXT_PUBLIC_JAMAI_PERSONAL_ACCESS_TOKEN=pat_your_real_token`

2. **Restart server:**
   ```powershell
   # Press Ctrl+C to stop
   npm run dev
   ```

3. **Open:** http://localhost:3000/ihcs-architect

4. **Complete the 7 questions:**
   - Use **informal/Manglish answers** like:
     - Q1: `"Our company ABC Food Sdn Bhd, been doing halal food since 2020 lah"`
     - Q2: `"We make kuih and kek for bakery shops"`
     - Q3: `"Boss is halal executive, supervisor check ingredients"`
     - Q4: `"Check supplier cert, must got JAKIM logo"`
     - Q5: `"Different area for halal and non-halal, separate tools"`
     - Q6: `"Keep logbook, take photo of delivery, scan cert"`
     - Q7: `"Training every month, teach staff about halal rules"`

5. **Click "Generate IHCS Manual"**

6. **Check terminal console** - You should see:
   ```
   🚀 Starting IHCS generation for: ABC Food Sdn Bhd
   🤖 Transforming answers with JamAI Base AI...
   ✨ Chapter 1 transformation: 88% compliance
   ✨ Chapter 2 transformation: 92% compliance
   ✨ Chapter 3 transformation: 85% compliance
   ...
   📄 Generating PDF...
   ✅ PDF generated successfully
   ```

7. **Download and open the PDF**

8. **Verify AI transformation:**
   - ✅ Content is in **formal Bahasa Malaysia** (not Manglish)
   - ✅ Includes **MPPHM 2020 section references**
   - ✅ Has **numbered procedures** and **responsibility statements**
   - ✅ Compliance scores are **higher (85-95%)**
   - ✅ Content is **professional and audit-ready**

---

## 🔍 How to Verify AI is Working

### Console Output Comparison:

**WITHOUT AI (Fallback):**
```
🚀 Starting IHCS generation for: ABC Food Sdn Bhd
⚠️ JamAI API error, using fallback transformation
📄 Generating PDF...
✅ PDF generated successfully
```

**WITH AI (JamAI Base):**
```
🚀 Starting IHCS generation for: ABC Food Sdn Bhd
🤖 Transforming answers with JamAI Base AI...
✨ Chapter 1 transformation: 88% compliance
✨ Chapter 2 transformation: 92% compliance
✨ Chapter 3 transformation: 85% compliance
✨ Chapter 4 transformation: 91% compliance
✨ Chapter 5 transformation: 87% compliance
✨ Chapter 6 transformation: 89% compliance
✨ Chapter 7 transformation: 90% compliance
📄 Generating PDF...
✅ PDF generated successfully
```

---

## 📊 Quality Comparison

### Input (User's Manglish Answer):
```
"Check supplier cert lah, make sure got halal logo"
```

### Output (Template-based):
```
Prosedur Semakan Pembekal:
Check supplier cert lah, make sure got halal logo

1. Semak sijil halal pembekal
2. Periksa label produk
```

### Output (AI-powered):
```html
<h3>4.3 Kawalan Bahan Mentah</h3>

<p>Syarikat kami melaksanakan kawalan ketat terhadap semua bahan mentah 
yang diterima mengikut MPPHM 2020 Seksyen 4.3:</p>

<ol>
  <li>Semak sijil halal pembekal (mesti sah dan dalam tempoh)</li>
  <li>Periksa label produk untuk logo halal yang diiktiraf JAKIM</li>
  <li>Rekodkan maklumat penerimaan dalam Borang Penerimaan Bahan</li>
  <li>Simpan salinan sijil halal dalam fail halal syarikat</li>
  <li>Sahkan sijil melalui portal JAKIM MyeHalal</li>
</ol>

<p><strong>Tanggungjawab:</strong> Pengurus Pembelian dan Halal Executive</p>
<p><em>Rujukan: MPPHM 2020 Seksyen 4.3 - Kawalan Bahan Mentah</em></p>
```

---

## ❌ Troubleshooting

### Issue: "Table not found: ihcs_content_transformer"
**Solution:**
- Check table name in JamAI dashboard (case-sensitive!)
- Verify you created it in the correct project
- Make sure Project ID in `.env.local` matches

### Issue: "Unauthorized" or "Invalid token"
**Solution:**
- Verify PAT is correct in `.env.local`
- Check if PAT has expired (generate new one)
- Restart dev server after changing `.env.local`

### Issue: Still using fallback (no AI)
**Solution:**
1. Check console for error messages
2. Verify table has all 5 input columns and 3 output columns
3. Test table manually in JamAI dashboard first
4. Check network tab for API response errors

### Issue: AI response is empty or incomplete
**Solution:**
- Check the prompts in your Action Table output columns
- Verify you selected a good AI model (GPT-4o or Claude 3.5)
- Test with shorter user answers first
- Check JamAI dashboard for table execution logs

---

## ✅ Success Criteria

Your integration is working correctly when:

1. ✅ Manual table test in JamAI dashboard works
2. ✅ Fallback system works when JamAI is disabled
3. ✅ Console shows compliance scores when JamAI is enabled
4. ✅ PDF content is formal and professional (not Manglish)
5. ✅ PDF includes MPPHM 2020 section references
6. ✅ Compliance scores are 85-95% (vs 70% with fallback)
7. ✅ No errors in browser console or terminal

---

## 📝 Next Steps After Testing

Once all tests pass:

1. **Optional: Add Knowledge Tables** (for even better quality)
   - Upload MPPHM 2020 PDF documents
   - Reference them in the Action Table prompts
   
2. **Fine-tune prompts** based on output quality

3. **Add streaming** for real-time content transformation display

4. **Deploy to production** (Vercel)

---

**Current Status:**
- [ ] Test 1: Manual JamAI dashboard test
- [ ] Test 2: Fallback system test
- [ ] Test 3: Full AI integration test

**Mark each test when completed!**
