# LABYRINTHOS - Quick Deployment Guide

## 🚀 Quick & Free Deployment Options

### Option 1: Render (Recommended - Easiest)

**Free tier includes everything you need!**

#### Deploy Backend (FastAPI):
1. Go to [Render.com](https://render.com) and sign up
2. Click **New +** → **Web Service**
3. Connect your GitHub repo: `ayothedoc3/LABYRINTHOS`
4. Configure:
   - **Name**: `labyrinthos-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     ```
     MONGO_URL=<your-mongodb-atlas-url>
     DB_NAME=labyrinth_db
     CORS_ORIGINS=https://labyrinthos-frontend.onrender.com
     EMERGENT_LLM_KEY=<optional>
     OPENROUTER_API_KEY=<optional>
     ```
5. Click **Create Web Service**
6. Copy the backend URL (e.g., `https://labyrinthos-backend.onrender.com`)

#### Deploy Frontend (React):
1. In Render, click **New +** → **Static Site**
2. Select your GitHub repo
3. Configure:
   - **Name**: `labyrinthos-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install --legacy-peer-deps && npm run build`
   - **Publish Directory**: `build`
   - **Environment Variables**:
     ```
     REACT_APP_BACKEND_URL=https://labyrinthos-backend.onrender.com
     ```
4. Click **Create Static Site**

#### Setup MongoDB Atlas (Free):
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free M0 cluster
3. Create a database user
4. Add IP `0.0.0.0/0` to Network Access (allow all)
5. Get connection string and add to backend env vars

**Total time: ~10-15 minutes**

---

### Option 2: Railway (Also Great)

1. Go to [Railway.app](https://railway.app)
2. Click **New Project** → **Deploy from GitHub**
3. Select your repo
4. Railway will auto-detect and deploy both services
5. Add environment variables in the Railway dashboard
6. Railway provides MongoDB plugin (or use Atlas)

**Total time: ~5-10 minutes**

---

### Option 3: Vercel (Frontend) + Render (Backend)

#### Frontend on Vercel:
1. Go to [Vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install --legacy-peer-deps && npm run build`
   - **Output Directory**: `build`
   - **Environment Variables**:
     ```
     REACT_APP_BACKEND_URL=https://labyrinthos-backend.onrender.com
     ```
4. Deploy

#### Backend on Render (same as Option 1)

---

### Option 4: Docker Compose (Local/VPS)

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=labyrinth_db
      - CORS_ORIGINS=http://localhost:3000
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8000
    depends_on:
      - backend

volumes:
  mongo-data:
```

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

Create `frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Deploy:**
```bash
docker-compose up -d
```

---

## 📋 Post-Deployment Steps

After deployment, you MUST seed the database with templates:

### 1. Seed via API:
```bash
curl -X POST "https://your-backend-url.com/api/workflowviz/seed?force=true"
```

### 2. Or run the reseed script:
```bash
# SSH into your backend server
cd backend
python reseed_templates.py
```

---

## 🔐 Environment Variables Required

### Backend:
- `MONGO_URL` - MongoDB connection string (required)
- `DB_NAME` - Database name (default: labyrinth_db)
- `CORS_ORIGINS` - Frontend URL for CORS (required)
- `EMERGENT_LLM_KEY` - For AI features (optional)
- `OPENROUTER_API_KEY` - For AI features (optional)

### Frontend:
- `REACT_APP_BACKEND_URL` - Backend API URL (required)

---

## ⚡ Fastest Option (Literally 60 seconds)

**Use Emergent Agent Platform** (if you have access):

The app is already configured for Emergent. Just:
1. Push to GitHub (done ✅)
2. Emergent auto-deploys to: https://full-canvas-mode.preview.emergentagent.com
3. Done!

---

## 🔍 Verify Deployment

After deployment, check:
1. **Backend health**: `https://your-backend/api/health`
2. **Frontend loads**: Visit your frontend URL
3. **Templates loaded**: `https://your-backend/api/workflowviz/action-templates`
4. **Database connected**: Should see data in dashboard

---

## 💡 Pro Tips

1. **Free tier limitations**:
   - Render: Services sleep after 15min inactivity
   - Vercel: Serverless functions have execution limits
   - Railway: 500 hours/month free

2. **For production**:
   - Use paid tier for always-on services
   - Enable auto-scaling
   - Add monitoring (Sentry, LogRocket)

3. **Cost**:
   - Render free tier: $0/month
   - Vercel free tier: $0/month
   - MongoDB Atlas M0: $0/month
   - **Total: FREE!** 🎉

---

## 📞 Need Help?

- Render Docs: https://render.com/docs
- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
