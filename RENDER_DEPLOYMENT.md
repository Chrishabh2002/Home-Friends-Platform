# 🚀 Render Deployment Guide

## Backend Deployment on Render

### Step 1: Create PostgreSQL Database

1. Go to: https://dashboard.render.com/
2. Click **"New +"** → **"PostgreSQL"**
3. Settings:
   - **Name:** `homedb`
   - **Database:** `homedb`
   - **User:** `homedb_user`
   - **Region:** Choose closest to you
   - **Plan:** Free (or paid for production)
4. Click **"Create Database"**
5. **Copy the "Internal Database URL"** (starts with `postgresql://`)

### Step 2: Deploy Backend

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub: `Chrishabh2002/Home-Friends-Platform`
3. Settings:
   - **Name:** `home-friends-backend`
   - **Region:** Same as database
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Environment Variables** (Click "Advanced" → "Add Environment Variable"):

```env
DATABASE_URL=<paste-internal-database-url-from-step-1>
SECRET_KEY=your-super-secret-key-min-32-characters-change-this
MAIL_USERNAME=user@example.com
MAIL_PASSWORD=password
MAIL_FROM=admin@homie-app.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
DEBUG=False
```

5. Click **"Create Web Service"**

### Step 3: Wait for Deployment
- Render will build and deploy (takes 5-10 minutes)
- You'll get a URL like: `https://home-friends-backend.onrender.com`

### Step 4: Test Backend
Visit: `https://home-friends-backend.onrender.com/docs`
You should see the FastAPI Swagger UI ✅

---

## Frontend Deployment on Render (or Vercel)

### Option A: Render

1. Click **"New +"** → **"Static Site"**
2. Connect GitHub repo
3. Settings:
   - **Name:** `home-friends-app`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. **Environment Variables:**
```env
VITE_API_URL=https://home-friends-backend.onrender.com
```

5. Click **"Create Static Site"**

### Option B: Vercel (Recommended for Frontend)

1. Go to: https://vercel.com/new
2. Import `Chrishabh2002/Home-Friends-Platform`
3. Settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

4. **Environment Variables:**
```env
VITE_API_URL=https://home-friends-backend.onrender.com
```

5. Click **"Deploy"**

---

## Important: Update Frontend API URL

After backend is deployed, update `frontend/src/` files:

Replace all instances of:
```typescript
http://localhost:8000
```

With:
```typescript
import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

---

## Environment Variables Summary

### Backend (.env on Render):
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=your-secret-key-here-min-32-chars
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=admin@yourdomain.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
DEBUG=False
```

### Frontend (.env on Vercel/Render):
```env
VITE_API_URL=https://your-backend.onrender.com
```

---

## Troubleshooting

### Backend won't start:
- Check logs in Render dashboard
- Verify DATABASE_URL is correct
- Ensure all dependencies in requirements.txt

### Frontend can't connect to backend:
- Check CORS settings in `backend/app/main.py`
- Verify VITE_API_URL is set correctly
- Check browser console for errors

### Database connection fails:
- Use "Internal Database URL" not "External"
- Ensure backend and database are in same region

---

## Free Tier Limits

**Render Free Plan:**
- Backend sleeps after 15 min inactivity (cold start ~30s)
- 750 hours/month
- PostgreSQL: 90 days data retention

**Upgrade to Paid ($7/month):**
- No sleep
- Always-on database
- Better performance

---

## Post-Deployment Checklist

✅ Backend health check: `/docs` endpoint works
✅ Database connected: Can create user
✅ Frontend loads: UI appears
✅ API calls work: Login/signup functional
✅ WebSocket works: Chat messages send/receive
✅ CORS configured: No browser errors

---

**Need help?** Check Render logs or contact support!
