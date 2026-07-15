# Pre-Audit Readiness - JamAI Base Integration

## Overview
The Pre-Audit Readiness page connects to JamAI Base using a **two-step submission process**:
1. **Upload files** to JamAI Base storage
2. **Submit a row** to the `Pre_Audit_System` Action Table

## Environment Setup

Add these variables to your `.env.local` file:

```bash
# Pre-Audit Project ID (public - used in frontend)
NEXT_PUBLIC_PRE_AUDIT_PROJECT_ID=your_project_id_here

# Pre-Audit Personal Access Token (private - server-side only)
PRE_AUDIT_API_KEY=jamai_pat_your_token_here
```

### How to Get Credentials:
1. Go to [JamAI Base Console](https://cloud.jamaibase.com)
2. Navigate to **Settings** → **API Keys**
3. Copy your **Project ID** and **Personal Access Token**

## Action Table Setup

Create an Action Table named `Pre_Audit_System` with these columns:

### Input Columns:
- `ID` (Text) - Format: `{CompanyName} - {BusinessType}`
- `Menu_File` (File) - URI from file upload
- `Ingredient_File` (File) - URI from file upload
- `Kitchen_Photo` (File) - URI(s) from file upload (comma-separated for multiple)
- `Uploaded_Filenames` (Text) - Comma-separated names of supporting documents

### Output Column:
- `Final_report_card` (Chat) - AI-generated Markdown report with:
  - Overall readiness score
  - Document checklist (found/missing)
  - Menu-ingredient consistency check
  - Risky ingredient warnings
  - Actionable recommendations

## Integration Flow

### Frontend (`app/pre-audit/page.tsx`)
When user clicks **"Start Pre-Audit Check"**:

1. **Prepare FormData** with files and metadata
2. **POST** to `/api/pre-audit` with multipart form data
3. **Show "Uploading..." state** during Step A
4. **Show "Analyzing..." state** during Step B
5. **Display results** in the Right Column:
   - Score circle
   - Document checklist
   - Markdown report in modal

### API Route (`app/api/pre-audit/route.ts`)
Handles the server-side logic:

1. **Parse FormData** to extract files and metadata
2. **Step A: Upload Files**
   - Upload each file to `https://api.jamaibase.com/v1/projects/{PROJECT_ID}/files/upload`
   - Collect file URIs from responses
3. **Step B: Submit Row**
   - POST to `https://api.jamaibase.com/v1/gen_tables/action/Pre_Audit_System/rows/add`
   - Send: ID, Menu_File URI, Ingredient_File URI, Kitchen_Photo URI, Uploaded_Filenames
   - Receive: Final_report_card (Markdown)
4. **Return structured response** to frontend

### Helper Service (`lib/jamai-api.ts`)
Reusable functions for JamAI Base integration:

- `uploadFileToJamAI(file, projectId, apiKey)` - Upload single file
- `submitPreAuditRow(data, apiKey)` - Submit row to Action Table
- `submitPreAudit(submission, onProgress)` - Complete workflow with progress callbacks

## API Endpoints

### File Upload
```
POST https://api.jamaibase.com/v1/projects/{PROJECT_ID}/files/upload
Authorization: Bearer {JAMAI_API_KEY}
Content-Type: multipart/form-data

Body: FormData with 'file' field
```

**Response:**
```json
{
  "uri": "jamai://file-id-here",
  "filename": "menu.pdf"
}
```

### Action Table Row Addition
```
POST https://api.jamaibase.com/v1/gen_tables/action/Pre_Audit_System/rows/add
Authorization: Bearer {JAMAI_API_KEY}
Content-Type: application/json

Body:
{
  "table_id": "Pre_Audit_System",
  "data": [
    {
      "ID": "Ali Cafe - F&B",
      "Menu_File": "jamai://menu-file-uri",
      "Ingredient_File": "jamai://ingredient-file-uri",
      "Kitchen_Photo": "jamai://photo-1, jamai://photo-2",
      "Uploaded_Filenames": "halal_policy.pdf, training_cert.pdf"
    }
  ],
  "stream": false
}
```

**Response:**
```json
{
  "rows": [
    {
      "ID": "Ali Cafe - F&B",
      "Final_report_card": "# Pre-Audit Report\n\n## Score: 85/100\n..."
    }
  ]
}
```

## Error Handling

### Missing Credentials
If `NEXT_PUBLIC_JAMAI_PROJECT_ID` or `JAMAI_API_KEY` is missing:
- API returns 500 error with message: "Server configuration error"
- Frontend shows fallback local validation

### File Upload Failure
If file upload fails:
- Error logged to console with response details
- Frontend shows error message: "File upload failed"
- User can retry

### Action Table Submission Failure
If row submission fails:
- Error logged with response details
- Frontend shows error: "Pre-audit validation failed"
- User can check credentials and retry

## Testing

### Local Testing:
1. Start dev server: `npm run dev`
2. Navigate to Pre-Audit page
3. Upload at least 3 documents (Menu, Ingredient List, Photos)
4. Click "Start Pre-Audit Check"
5. Monitor console for upload/submission logs
6. Verify Final_report_card displays in modal

### Console Logs to Check:
- ✅ `[Frontend] Submitting Pre-Audit to API...`
- ✅ `[Pre-Audit API] Processing request...`
- ✅ `[Pre-Audit API] Uploading files...`
- ✅ `[Pre-Audit API] Submitting to Action Table...`
- ✅ `[Pre-Audit API] Success:` (with response data)

## Troubleshooting

### "Missing JamAI credentials" Error
- Check `.env.local` has both variables
- Restart dev server after adding env vars
- Verify variable names match exactly

### Files Not Uploading
- Check file size (max 10MB per file)
- Verify file types are accepted (.pdf, .jpg, .png, .docx, .xlsx)
- Check network tab for 401/403 errors (invalid API key)

### No Report Generated
- Verify Action Table exists with correct name: `Pre_Audit_System`
- Check output column is named: `Final_report_card`
- Ensure Action Table has valid prompt configuration
- Check JamAI Base dashboard for row creation

## Next Steps

### Enable Streaming (Optional)
To see AI generation in real-time:
1. Set `stream: true` in `submitPreAuditRow()`
2. Update frontend to handle SSE responses
3. Show progressive text in modal as it generates

### Add Retry Logic
For production resilience:
1. Add retry mechanism for failed uploads
2. Implement exponential backoff
3. Show retry button to user on errors

### Enhance Progress Feedback
For better UX:
1. Show individual file upload progress
2. Display "Uploading 1 of 3 files..." messages
3. Add progress bar with percentage
