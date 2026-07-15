# 🔍 Pre-Audit File Upload Debugging Guide

## Issue: Files Not Reaching JamAI Base

**Symptom:** User uploads "Sijil Latihan Halal (Training Certificate)" → Shows as uploaded in frontend → But file doesn't appear in JamAI Base table `Pre_Audit_System`

---

## ✅ Field Name Mapping Verification

### Frontend → JamAI Base Column Names
```
Frontend Field                              → JamAI Column Name
──────────────────────────────────────────────────────────────────
"Menu List"                                 → Menu_File ✅
"Ingredient List"                           → Ingredient_File ✅
"Carta Alir Proses (Flow Chart)"           → ChartFlow ✅
"Sijil Latihan Halal (Training Certificate)" → Training_cert ✅
"Halal Policy Poster"                       → Halal_policy_poster ✅
"Pest Control Contract"                     → Pest_Control_Contract ✅
"Kitchen/Factory Photos"                    → Kitchen_Photo ✅
```

**Status:** ✅ **CORRECT** - All field names match exactly

---

## 🔄 Data Flow with Enhanced Debugging

### **Step 1: Frontend Upload** (`app/pre-audit/page.tsx`)

**Code Location:** Line ~510
```typescript
if (trainingCertFile?.file) {
  formData.append('Training_cert', trainingCertFile.file)
  console.log('📋 [Frontend] Adding Training_cert:', trainingCertFile.name)
}
```

**New Debug Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [DEBUG] Pre-Audit Submission Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Menu_File: ❌ Missing
Ingredient_File: ✅ 1.webp (62472 bytes)
ChartFlow: ❌ Missing
Training_cert: ✅ Sijil-LAtihan_halal.jpg (123456 bytes)
Halal_policy_poster: ❌ Missing
Pest_Control_Contract: ❌ Missing
Kitchen_Photo: ❌ Missing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What to Check:**
- ✅ File object exists (`trainingCertFile` not null)
- ✅ File has `.file` property with actual File object
- ✅ File size is > 0 bytes
- ✅ FormData appended with exact key `Training_cert`

---

### **Step 2: API Route Reception** (`app/api/pre-audit/route.ts`)

**Code Location:** Line ~24
```typescript
const trainingCert = formData.get('Training_cert') as File | null
console.log('📋 [Pre-Audit API] Training_cert:', trainingCert?.name)
```

**New Debug Output:**
```
📋 [Pre-Audit API] Processing request...
📋 [Pre-Audit API] Training_cert: Sijil-LAtihan_halal.jpg
```

**What to Check:**
- ✅ File received from FormData
- ✅ File name matches uploaded file
- ✅ File size > 0 bytes

---

### **Step 3: File Upload to JamAI Storage** (`app/api/pre-audit/route.ts`)

**Code Location:** Line ~79
```typescript
if (trainingCert && trainingCert.size > 0) {
  console.log('📤 Uploading Training_cert...')
  trainingCertUri = await uploadFileToJamAI(trainingCert, projectId, apiKey)
}
```

**New Debug Output:**
```
📤 Uploading Training_cert...
📤 Uploading file: Sijil-LAtihan_halal.jpg (123456 bytes)
✅ File uploaded successfully: s3://devcloud-file/raw/org_xxx/proj_xxx/xxx/Sijil-LAtihan_halal.jpg
```

**What to Check:**
- ✅ File uploaded successfully to s3://
- ✅ S3 URI returned (not empty string)
- ❌ Upload failed? Check error message

---

### **Step 4: URI Summary Before Submission**

**New Debug Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [DEBUG] File URIs Before Submission:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Menu_File: ❌ EMPTY
Ingredient_File: s3://devcloud-file/raw/.../1.webp
ChartFlow: ❌ EMPTY
Training_cert: s3://devcloud-file/raw/.../Sijil-LAtihan_halal.jpg
Halal_policy_poster: ❌ EMPTY
Pest_Control_Contract: ❌ EMPTY
Kitchen_Photo: ❌ EMPTY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What to Check:**
- ✅ `Training_cert` has s3:// URI (not empty)
- ❌ If empty → File upload failed in Step 3

---

### **Step 5: JamAI Base API Call** (`lib/jamai-api.ts`)

**Code Location:** Line ~98
```typescript
const payload = {
  ID: data.id,
  Menu_File: data.menuFileUri,
  Ingredient_File: data.ingredientFileUri,
  ChartFlow: data.chartFlowUri,
  Training_cert: data.trainingCertUri,
  Halal_policy_poster: data.halalPolicyUri,
  Pest_Control_Contract: data.pestControlUri,
  Kitchen_Photo: data.kitchenPhotoUri,
}
```

**New Debug Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [DEBUG] JamAI Base API Call:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Table: Pre_Audit_System (action)
Payload: {
  "ID": "Company - Restaurant - 1764243780",
  "Menu_File": "",
  "Ingredient_File": "s3://devcloud-file/raw/.../1.webp",
  "ChartFlow": "",
  "Training_cert": "s3://devcloud-file/raw/.../Sijil-LAtihan_halal.jpg",
  "Halal_policy_poster": "",
  "Pest_Control_Contract": "",
  "Kitchen_Photo": ""
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What to Check:**
- ✅ `Training_cert` field has s3:// URI
- ✅ Column name exactly `Training_cert` (case-sensitive)
- ❌ If empty string → Upload failed or URI not passed

---

### **Step 6: JamAI Base Response**

**New Debug Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ JamAI Base Raw Response:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "object": "gen_table.completion.rows",
  "rows": [
    {
      "object": "gen_table.completion.chunks",
      "columns": {
        "ID": { "value": "Company - Restaurant - 1764243780" },
        "Menu_File": { "value": "" },
        "Ingredient_File": { "value": "s3://..." },
        "Training_cert": { "value": "s3://..." },
        "Final_report_card": { ... },
        "Certification_Validation": { ... }
      }
    }
  ]
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What to Check:**
- ✅ Row created successfully
- ✅ `Training_cert` column shows s3:// URI in response
- ✅ Output columns generated (Final_report_card, etc.)

---

## 🔍 Debugging Checklist

### **When File Upload Fails:**

**[ ] Step 1: Verify Frontend State**
```javascript
// Check in browser console:
console.log('trainingCertFile:', trainingCertFile)
// Should show: { id: '...', name: 'Sijil-LAtihan_halal.jpg', file: File, ... }
```

**[ ] Step 2: Check FormData Contents**
```javascript
// In startAudit function, before fetch:
for (let [key, value] of formData.entries()) {
  console.log(key, value)
}
// Should show: Training_cert File { name: "Sijil-LAtihan_halal.jpg", ... }
```

**[ ] Step 3: Verify API Route Receives File**
```
// Check server console (terminal running npm run dev):
📋 [Pre-Audit API] Training_cert: Sijil-LAtihan_halal.jpg
```

**[ ] Step 4: Check File Upload Success**
```
📤 Uploading Training_cert...
✅ File uploaded successfully: s3://devcloud-file/...
```

**[ ] Step 5: Verify URI Not Empty**
```
Training_cert: s3://devcloud-file/raw/org_xxx/proj_xxx/Sijil-LAtihan_halal.jpg
// NOT: ❌ EMPTY
```

**[ ] Step 6: Verify JamAI Base Receives URI**
```json
{
  "Training_cert": "s3://devcloud-file/raw/..."
}
```

---

## 🐛 Common Issues & Solutions

### **Issue 1: File Shows in Frontend, But URI is Empty**

**Symptoms:**
```
🔍 [DEBUG] File URIs Before Submission:
Training_cert: ❌ EMPTY
```

**Root Cause:** File upload to JamAI storage failed

**Solutions:**
1. Check `.env.local` credentials:
   ```bash
   NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID=proj_xxxxx
   PRE_AUDIT_API_KEY=jamai_pat_xxxxx
   ```
2. Check file size limit (max 10MB)
3. Check JamAI API key permissions
4. Check network connectivity to JamAI Base

---

### **Issue 2: Wrong Field Name Sent to JamAI**

**Symptoms:**
```json
{
  "training_cert": "s3://..."  // Wrong: lowercase
}
```

**Root Cause:** Field name doesn't match JamAI table column

**Solution:** Must be exact match:
```typescript
Training_cert  // ✅ Correct (capital T, underscore)
training_cert  // ❌ Wrong
TrainingCert   // ❌ Wrong
```

---

### **Issue 3: File Object Missing .file Property**

**Symptoms:**
```javascript
trainingCertFile: { id: '123', name: 'file.jpg', url: 'data:image...' }
// Missing: file: File
```

**Root Cause:** File reader didn't store original File object

**Solution:** Verify in `handleFileUpload`:
```typescript
const newFile: UploadedFile = {
  id: Date.now().toString(),
  name: file.name,
  type: specificType,
  url: reader.result as string,
  size: file.size,
  file: file  // ← Must include original File object
}
```

---

### **Issue 4: JamAI Base Table Column Mismatch**

**Symptoms:**
- File uploaded successfully
- URI sent to JamAI
- But column not populated in table

**Root Cause:** Table column name doesn't match payload key

**Solution:** Verify in JamAI Base dashboard:
1. Go to Pre_Audit_System table
2. Check input columns exactly match:
   - `Training_cert` (File type)
   - `Menu_File`, `Ingredient_File`, etc.

---

## 📊 How to Read Debug Output

### **Full Debug Flow Example:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [DEBUG] Pre-Audit Submission Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Training_cert: ✅ Sijil-LAtihan_halal.jpg (123456 bytes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 [Frontend] Submitting to /api/pre-audit...

📋 [Pre-Audit API] Training_cert: Sijil-LAtihan_halal.jpg
📤 Uploading Training_cert...
📤 Uploading file: Sijil-LAtihan_halal.jpg (123456 bytes)
✅ File uploaded successfully: s3://devcloud-file/raw/org_xxx/proj_xxx/xxx/Sijil-LAtihan_halal.jpg

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [DEBUG] File URIs Before Submission:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Training_cert: s3://devcloud-file/raw/org_xxx/proj_xxx/xxx/Sijil-LAtihan_halal.jpg
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 [DEBUG] JamAI Base API Call:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Payload: {
  "Training_cert": "s3://devcloud-file/raw/org_xxx/proj_xxx/xxx/Sijil-LAtihan_halal.jpg"
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ [Pre-Audit API] JamAI Base Response:
Certification_Validation: ✅ Present
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Interpretation:**
- ✅ File uploaded in frontend (123456 bytes)
- ✅ API received file
- ✅ File uploaded to JamAI storage → Got s3:// URI
- ✅ URI sent to JamAI Base
- ✅ Response contains Certification_Validation output

**Status:** 🎉 **WORKING CORRECTLY**

---

## 🧪 Testing Steps

### **Test 1: Upload Training Certificate**
1. Go to `/pre-audit`
2. Click on "Sijil Latihan Halal (Training Certificate)" dropzone
3. Upload `Sijil-LAtihan_halal.jpg`
4. Check browser console for:
   ```
   📋 [Frontend] Adding Training_cert: Sijil-LAtihan_halal.jpg
   ```

### **Test 2: Submit Form**
1. Click "Start Pre-Audit Check"
2. Check browser console for debug summary
3. Check server terminal for:
   ```
   📋 [Pre-Audit API] Training_cert: Sijil-LAtihan_halal.jpg
   📤 Uploading Training_cert...
   ✅ File uploaded successfully: s3://...
   ```

### **Test 3: Verify JamAI Base**
1. Go to JamAI Base dashboard
2. Open `Pre_Audit_System` table
3. Find row with your company name
4. Check `Training_cert` column has s3:// URI
5. Check `Certification_Validation` output column has data

---

## 🎯 Quick Diagnosis Table

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| ❌ File not in frontend state | File upload handler not triggered | Check console for "Adding Training_cert" |
| ❌ API doesn't receive file | FormData key mismatch | Check FormData key is `Training_cert` |
| ❌ Upload returns empty URI | JamAI storage upload failed | Check API credentials, file size |
| ❌ URI not in payload | Variable not passed correctly | Check debug output "File URIs Before Submission" |
| ❌ Row created but column empty | Column name mismatch | Check table column is exactly `Training_cert` |
| ❌ No output generated | JamAI processing issue | Wait longer, check Action Table status |

---

## 📞 Next Steps

1. **Run the updated code** with enhanced debugging
2. **Upload a Training Certificate**
3. **Copy all console output** from both browser and server
4. **Share the debug logs** to identify exact failure point

The debug output will show exactly where the file is being lost in the pipeline! 🔍
