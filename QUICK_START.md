# 🚀 Quick Reference - Vercel OCR Deployment

## Deployment Complete! ✅

**Production URL:** https://acom-aim-fe.vercel.app  
**API Status:** ✅ HEALTHY  
**Deployment Time:** ~35 seconds

---

## ⚡ Quick Commands

### Deploy to Production
```bash
vercel --prod
```

### Watch Logs Live
```bash
vercel logs --follow
```

### Check Health
```bash
curl https://acom-aim-fe.vercel.app/api/ocr2/process
```

### Update Environment Variables
```bash
./update-vercel-env.sh
```

---

## 🔍 What Was Fixed

**Problem:** OCR processing would timeout on Vercel after uploading files to OpenAI

**Root Cause:** Vercel's 60s function limit + 90s OpenAI timeout = silent failure

**Solution:**
1. ✅ Added `maxDuration = 300` to OCR API route
2. ✅ Added `maxDuration = 60` to upload route
3. ✅ Reduced OpenAI timeout to 60s
4. ✅ Enhanced error handling for timeouts
5. ✅ Added detailed performance logging

---

## 📊 Expected Behavior

### Before (Broken on Vercel):
```
[INFO] Uploading PDF to OpenAI Files API
❌ [Silence... function killed by Vercel timeout]
```

### After (Fixed):
```
[INFO] Uploading PDF to OpenAI Files API
[INFO] PDF uploaded successfully
[INFO] Sending request to OpenAI API ← NEW
[INFO] OpenAI API call completed ← NEW
[INFO] Response received (text: 619 chars)
[INFO] Airtable record updated
✅ Success!
```

---

## 🧪 Test It Now

1. **Go to app:** https://acom-aim-fe.vercel.app/upload

2. **Upload a test PDF** (1 page invoice)

3. **Watch logs:**
   ```bash
   vercel logs --follow
   ```

4. **Check Airtable** - File should show "Processed" status

---

## 📈 Performance Targets

| Metric | Target | Alert If |
|--------|--------|----------|
| Total time | 20-30s | >50s |
| OpenAI call | 15-20s | >40s |
| Success rate | >95% | <90% |

---

## 🔧 Environment Variables Set

```bash
OPENAI_TIMEOUT_SECONDS=60      # ✅ Updated
MAX_VISION_RETRIES=0           # ✅ Updated
OPENAI_API_KEY=sk-...          # ✅ Set
AIRTABLE_PAT=pat...            # ✅ Set
AIRTABLE_BASE_ID=app...        # ✅ Set
```

---

## ⚠️ Troubleshooting

### "Function timeout" errors?
- Check Vercel plan (need Pro or higher)
- Verify `OPENAI_TIMEOUT_SECONDS=60` is set
- Try with smaller PDF

### Still seeing old behavior?
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Clear cache in Vercel dashboard
- Check environment variables are in "Production" scope

### No logs appearing?
```bash
vercel logs --since 1h
```

---

## 📚 Full Documentation

1. **VERCEL_TIMEOUT_FIX.md** - Technical deep dive
2. **VERCEL_ENV_VARS.md** - All environment variables
3. **VERCEL_DEPLOYMENT_CHECKLIST.md** - Deployment guide
4. **DEPLOYMENT_SUMMARY.md** - This deployment's details

---

## 🎯 Success Checklist

After uploading a test PDF:

- [ ] File uploads to Vercel Blob
- [ ] Airtable record created with Status = "Queued"
- [ ] OCR processing starts
- [ ] Logs show "Sending request to OpenAI API"
- [ ] Logs show "OpenAI API call completed"
- [ ] Status changes to "Processed"
- [ ] Raw text populated in Airtable
- [ ] Invoice record created
- [ ] Invoice details linked
- [ ] Total time < 30 seconds

---

## 🆘 Need Help?

1. **Check logs first:** `vercel logs --follow`
2. **Compare with local:** Run same PDF locally
3. **Check OpenAI status:** https://status.openai.com
4. **Review docs:** See VERCEL_TIMEOUT_FIX.md
5. **Rollback if needed:** See DEPLOYMENT_SUMMARY.md

---

## 🎉 Next Steps

1. ✅ Test with a sample PDF
2. ✅ Monitor logs for first few uploads
3. ✅ Verify Airtable records
4. ✅ Share with team for testing
5. Monitor costs on OpenAI dashboard

---

**Last Updated:** November 5, 2025  
**Deployed By:** matinesfahani-3361  
**Status:** ✅ Live and Ready for Testing

