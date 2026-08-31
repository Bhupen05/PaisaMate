# Render.com Deployment Guide

Complete step-by-step instructions for deploying PaisaMate on Render.com.

---

## 🚀 Quick Deploy (Recommended)

### Option 1: Using Docker (Most Reliable)

**Requirements:**
- GitHub account with repo pushed
- Render.com account
- MongoDB Atlas cluster

**Steps:**

1. **Go to Render Dashboard** → New → Web Service
2. **Connect GitHub repo**
3. **Set configuration:**
   - Name: `paisamate-api`
   - Environment: `Docker`
   - Build Command: (leave default)
   - Start Command: (leave default - uses Dockerfile)
   - Plan: `Starter` (free tier)

4. **Add Environment Variables:**
   ```
   MONGODB_URL = mongodb+srv://username:password@cluster.mongodb.net/suraty?retryWrites=true&w=majority
   DB_NAME = suraty_prod
   SECRET_KEY = (Render will auto-generate)
   ```

5. **Deploy** → Done!

---

### Option 2: Using Native Python Runtime

1. **Go to Render Dashboard** → New → Web Service
2. **Connect GitHub repo**
3. **Set configuration:**
   - Name: `paisamate-api`
   - Environment: `Python 3.11`
   - Root Directory: `.` (or `/server` if Render supports)
   - Build Command:
     ```bash
     cd server && pip install --upgrade pip setuptools wheel && pip install --no-build-isolation --prefer-binary -r requirements.txt
     ```
   - Start Command:
     ```bash
     cd server && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --no-reload
     ```
   - Plan: `Starter`

4. **Add Environment Variables:**
   ```
   MONGODB_URL = mongodb+srv://username:password@cluster.mongodb.net/suraty
   DB_NAME = suraty_prod
   SECRET_KEY = (auto-generated)
   ```

5. **Deploy**

---

## 🐛 Troubleshooting

### "No open ports detected on 0.0.0.0"

**Cause:** App is binding to `localhost` instead of `0.0.0.0`

**Fix:**
- Ensure `--host 0.0.0.0` is in start command
- Use Docker method (most reliable)
- Restart deployment

### "Timed Out" / "Port scan timeout"

**Cause:** App takes too long to start or crashes on startup

**Fix:**
1. Check logs: Render Dashboard → Logs
2. Look for errors like missing env vars or MongoDB connection issues
3. Verify `MONGODB_URL` is correct
4. Restart service

### "Build failed - Python wheel compilation"

**Cause:** Trying to compile from source

**Fix:**
- Use Python 3.11 runtime (not 3.14)
- Use Docker method
- Ensure `--prefer-binary` flag is set

### Can't connect from frontend

**Cause:** CORS or incorrect API URL

**Fix:**
1. Frontend must have correct `NEXT_PUBLIC_API_URL`
2. Backend must allow frontend origin in CORS
3. Check that both services are running

---

## 📊 Verify Deployment

Once deployed:

1. **Check API is running:**
   ```
   curl https://paisamate-api.onrender.com/docs
   ```
   Should show Swagger UI

2. **Check MongoDB connection:**
   ```
   curl -X GET https://paisamate-api.onrender.com/api/auth/me \
     -H "Authorization: Bearer invalid-token"
   ```
   Should return a response (even if 401 Unauthorized)

3. **Check logs:**
   - Render Dashboard → Services → paisamate-api → Logs
   - Look for "Application startup complete"

---

## 🌐 Frontend on Render

After backend is deployed:

1. **New Web Service** → GitHub
2. **Configuration:**
   - Name: `paisamate-web`
   - Environment: `Node 18`
   - Build Command: `cd apps/web && npm install && npm run build`
   - Start Command: `cd apps/web && npm start`
   - Plan: `Starter`

3. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL = https://paisamate-api.onrender.com/api
   ```

4. **Deploy**

---

## 🔄 Continuous Deployment

- Every push to `main` branch automatically deploys
- Render auto-detects GitHub changes
- Deployments take 2-5 minutes

---

## 💰 Pricing

- **Starter Plan (Free tier):**
  - 750 hours/month (enough for 1 service always-on)
  - Auto-spins down after 15 min inactivity (free tier)
  - Perfect for dev/testing

- **Pro Plan ($7/month):**
  - No auto spin-down
  - 24/7 uptime
  - Recommended for production

---

## 📝 Environment Variables Reference

| Variable | Example | Required |
|----------|---------|----------|
| `MONGODB_URL` | `mongodb+srv://user:pass@cluster.mongodb.net/suraty` | Yes |
| `DB_NAME` | `suraty_prod` | Yes |
| `SECRET_KEY` | (auto-generated) | Yes |
| `NEXT_PUBLIC_API_URL` | `https://paisamate-api.onrender.com/api` | Yes (frontend) |

---

## 🔐 Security Checklist

- [ ] Use strong `SECRET_KEY` (Render generates one)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] Using HTTPS (Render provides free SSL)
- [ ] No hardcoded secrets in code
- [ ] CORS origins limited to your domain

---

## 📱 Custom Domain

1. **Buy domain** (Namecheap, GoDaddy, etc.)
2. **Render Dashboard** → Service → Settings → Custom Domain
3. **Add DNS records** (follow Render instructions)
4. **Wait 24-48 hours** for DNS propagation

---

## 🆘 Need Help?

- **Render Docs:** https://render.com/docs
- **Common Issues:** https://render.com/docs/troubleshooting-deploys
- **API Logs:** Render Dashboard → Logs tab
