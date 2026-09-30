# AdmitPak — Master Project Notes

> Single source of truth for the entire AdmitPak project.
> If you're on a new machine, start here.

## 1. What is AdmitPak?

AdmitPak is Pakistan's free university admission hub — a website that aggregates admission deadlines, fees, programs, scholarships and eligibility criteria for top Pakistani universities, all in one place.

- Live URL: https://admitpak.onrender.com
- Repo: https://github.com/asimson296/AdmitPak
- Email: admitpak.pk@gmail.com
- Founder (persona): Pappu

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | MongoDB (local for dev, Atlas for production) |
| Auth | JWT (httpOnly cookie) + bcrypt |
| Frontend | Plain HTML + CSS + vanilla JavaScript |
| Hosting | Render.com (free tier) |
| Database (Prod) | MongoDB Atlas (M0 free cluster, Mumbai) |
| Monitoring | UptimeRobot (pings every 5 min) |
| Analytics | Google Analytics 4 |
| SEO | Google Search Console |
| Mascot | Pappu — custom JS tour + browser TTS |
| Images | WebP (converted from PNG via ImageMagick) |

Zero rupees spent. Everything runs on free tiers.


## 3. Folder Structure

```
AdmitRoute/                      <- project root
├── server.js                    <- Express server, all API routes
├── auth.js                      <- JWT + bcrypt helpers
├── db.js                        <- Mongoose connection + models
├── monitor-runner.js            <- Watches university pages
├── snapshot-manager.js          <- Saves page snapshots
├── change-report.js             <- Compares snapshots
├── source-processor.js          <- Extracts text from HTML/PDF
├── update-helper.js             <- CLI: edit universities.json safely
├── check-local-db.js            <- CLI: inspect local MongoDB
├── package.json                 <- Dependencies + scripts
├── .env                         <- Secrets (NEVER commit)
├── .gitignore
├── PROJECT-NOTES.md             <- This file
├── ROADMAP.md
│
├── data/
│   ├── universities.json        <- MAIN DATA (all 8 universities)
│   ├── monitor-config.json      <- Pages monitor watches
│   ├── source-snapshots/        <- (gitignored)
│   └── change-reports/          <- (gitignored)
│
└── public/                      <- Files served to browsers
    ├── index.html               <- Homepage
    ├── universities.html
    ├── university.html
    ├── signup.html / login.html
    ├── privacy.html / terms.html
    ├── sitemap.xml / robots.txt
    ├── favicon.ico + favicon/
    ├── style.css / blog.css / mascot.css
    ├── app.js / universities.js / university.js
    ├── signup.js / login.js
    ├── header.js / tracker.js / saved.js
    ├── feedback.js / mascot.js / floating-drag.js
    ├── home-count.js / animations.js
    ├── images/
    │   ├── mascot/pappu.webp
    │   └── universities/*.webp
    └── blog/
        ├── index.html
        ├── nust-net-test-pattern-2027.html
        ├── fast-fee-structure-2027.html
        ├── nust-vs-fast-for-cs.html
        ├── pakistani-university-deadlines-2027.html
        └── giki-admission-guide.html
```


## 4. Environment Variables

Stored in `.env` (project root). NEVER commit this file.

```env
JWT_SECRET=<long-random-string>
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/admitpak
```

Production (Render) env vars:
- `JWT_SECRET` — set in Render dashboard
- `NODE_ENV` — `production`
- `MONGODB_URI` — MongoDB Atlas connection string

Local points to local MongoDB. Production points to Atlas. Same code.

---

## 5. Setup on a New Machine

1. Clone repo:
   `git clone https://github.com/asimson296/AdmitPak.git`
2. `cd AdmitPak && npm install`
3. Create `.env` with the three variables above
4. Install + start MongoDB locally:
   - Kali/Debian: `sudo apt install mongodb-server mongodb-clients` then `sudo systemctl start mongodb && sudo systemctl enable mongodb`
   - macOS: `brew install mongodb-community && brew services start mongodb-community`
   - Windows: install MongoDB Community Server, run as service
5. Start server: `node server.js`
6. Open http://localhost:3000
7. Verify DB: `node check-local-db.js`

---

## 6. Database

### Local (dev)
- MongoDB on laptop
- URI: `mongodb://127.0.0.1:27017/admitpak`
- Start: `sudo systemctl start mongodb`
- Inspect: `node check-local-db.js`

### Production
- MongoDB Atlas M0 free tier, Mumbai region
- Cluster: AdmitPak-Cluster
- User: asimjoyia415_db_user
- Whitelist: must include 0.0.0.0/0 (for Render)

### Collections
- `users` — email, hashed password, tracked universities
- `feedbacks` — user feedback submissions

---

## 7. Running Locally

```
cd ~/Documents/Web\ Project/AdmitRoute
node server.js
```

Runs on http://localhost:3000

Optional auto-restart: `npm install -g nodemon && nodemon server.js`

---

## 8. Deploying

1. Edit files locally
2. `git add -A && git commit -m "message" && git push`
3. Render dashboard -> AdmitPak -> Manual Deploy -> Deploy latest commit
4. Wait 2 minutes
5. Live at https://admitpak.onrender.com

### Git auth
- User: asimson296
- Password: Personal Access Token (from github.com/settings/tokens)

### Render
- Dashboard: https://dashboard.render.com
- Free tier (sleeps after 15 min idle)
- UptimeRobot pings every 5 min to keep awake

---

## 9. Feature Reference

### 9.1 University Data
File: `data/universities.json`
Each uni has: id, name, slug, city, province, officialWebsite, applicationPortal, admission, fees, programs, scholarships, eligibility, about, sources, hec, heroImage.

### 9.2 Adding a New University
1. Collect data from official site
2. Add entry to `data/universities.json`
3. Add entry to `data/monitor-config.json`
4. Add hero image (webp) to `public/images/universities/`
5. Update `public/sitemap.xml`
6. Push + deploy

### 9.3 Updating University Data
`node update-helper.js <slug>` — interactive menu for status, fees, dates, etc.

### 9.4 Monitoring
`node monitor-runner.js` — checks all monitored pages, saves snapshots, detects changes, writes reports. Does NOT auto-update data (manual approval required).

### 9.5 Pappu Mascot
Files: `public/mascot.js` + `public/mascot.css`
- Browser speech synthesis voice
- 10-step tour
- Auto-starts on every visit
- Pause / Resume / Replay buttons
- Draggable (via floating-drag.js)
- Kali workaround: pause uses cancel+replay

### 9.6 Auth Routes
- `POST /api/signup` — create account
- `POST /api/login` — login
- `POST /api/logout` — logout
- `GET /api/me` — current user
- Cookie: `admitpak_token`
- Rate limits: 5 signup/min, 10 login/min per IP
- bcrypt 10 rounds

### 9.7 Tracking Routes
- `POST /api/track/:slug`
- `DELETE /api/track/:slug`
- `GET /api/tracked`

### 9.8 Feedback
- `POST /api/feedback` — saves to MongoDB
- Rate limit: 5 per hour per IP

---

## 10. SEO / Google

- Homepage indexed
- Sitemap submitted (20 URLs)
- Structured data (schema.org) declares Pappu as founder
- Footer credit: "Built with heart by Pappu"
- Blog posts target keywords
- Meta descriptions + OG tags
- Google Search Console: https://search.google.com/search-console
- Manual indexing quota: 10 URLs/day

---

## 11. Cheatsheet

| Task | Command |
|---|---|
| Start server | `node server.js` |
| Inspect local DB | `node check-local-db.js` |
| Update a university | `node update-helper.js <slug>` |
| Run monitor | `node monitor-runner.js` |
| Push code | `git add -A && git commit -m "msg" && git push` |
| Convert image | `magick in.png -resize "1600x900>" -quality 82 -strip out.webp` |
| MongoDB status | `sudo systemctl status mongodb` |

---

## 12. Known Issues

1. Legacy `mongo` shell crashes on Kali -> use `node check-local-db.js`
2. Local ISP blocks MongoDB Atlas port 27017 -> use local MongoDB for dev
3. Chrome on Linux speech pause/resume buggy -> cancel+replay workaround
4. Render free tier sleeps after 15 min -> UptimeRobot keeps awake
5. TikTok needs 1,000 followers for clickable links
6. Google manual indexing limited to 10 URLs/day

---

## 13. Future Roadmap

See ROADMAP.md.

Next up:
- Email deadline alerts
- 10+ more universities
- WCAG accessibility
- Urdu language support
- PWA (install as app)
- Admin approval pipeline
- HEC traffic-light system
- AI tools (V5+)

---

## 14. Accounts

| Service | Purpose | Login |
|---|---|---|
| GitHub | Code | asimson296 |
| Render | Hosting | GitHub OAuth |
| MongoDB Atlas | Prod DB | asimjoyia415_db_user |
| Google Search Console | SEO | Google account |
| Google Analytics | Traffic | Google account |
| UptimeRobot | Keep-alive | your account |
| Gmail | Contact | admitpak.pk@gmail.com |

Passwords stored separately, NOT in this file.

---

## 15. Emergency Recovery

Site down:
1. Render dashboard -> is service running?
2. Render logs -> error?
3. MongoDB error -> Atlas alive + IP whitelist has 0.0.0.0/0
4. Code error -> check last git push

Local data lost:
- `data/universities.json` intact?
- Restore from `universities.backup.json`

Production data lost:
- Atlas -> Browse Collections
- If cluster gone -> recreate + update Render env var

GitHub push fails:
- Token expired -> new at github.com/settings/tokens

---

## 16. Design Language

- Primary: Indigo #6366f1 -> Purple #8b5cf6 (gradient)
- Accent green: #10b981 (HEC badges)
- Accent amber: #f59e0b (deadlines)
- Font: system sans-serif
- Style: clean, modern, mobile-first, card-based
- Icons: emoji + inline SVG

---

## 17. Last Updated

Date: September 29, 2026
By: Pappu (with AI assistant)

Contact: admitpak.pk@gmail.com
