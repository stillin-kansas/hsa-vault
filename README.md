# HSA Vault

Track medical expenses and maximize your HSA reimbursements at retirement. Every receipt you log is a tax-free dollar waiting for you.

---

## Tech Stack

- **React + Vite** — fast, modern frontend
- **Firebase Auth** — email/password + Google sign-in
- **Firestore** — real-time cloud database, syncs across all devices
- **Firebase Storage** — receipt file uploads
- **Vercel** — free hosting and deployment

---

## Setup (30 minutes)

### Step 1 — Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/hsa-vault.git
cd hsa-vault
npm install
```

### Step 2 — Create a Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `hsa-vault` → Continue
3. Disable Google Analytics (not needed) → **Create project**

### Step 3 — Set up Firebase services

**Authentication:**
1. Left sidebar → **Authentication** → Get started
2. **Sign-in method** tab → Enable **Email/Password**
3. Enable **Google** (add your support email)

**Firestore Database:**
1. Left sidebar → **Firestore Database** → Create database
2. Choose **Start in production mode** → select your region → Enable
3. After creation, go to **Rules** tab → paste in the contents of `firestore.rules` → Publish

**Storage:**
1. Left sidebar → **Storage** → Get started
2. Start in production mode → select region → Done
3. Go to **Rules** tab → paste contents of `storage.rules` → Publish

### Step 4 — Get your Firebase config

1. Click the gear icon → **Project settings**
2. Scroll down to **Your apps** → click **Add app** → choose **Web** (</>)
3. Give it a nickname (e.g. `hsa-vault-web`) → Register app
4. Copy the `firebaseConfig` object values

### Step 5 — Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=hsa-vault-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hsa-vault-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=hsa-vault-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 6 — Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you should see the sign-in screen.

---

## Deploy to Vercel (Free)

### Option A — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked about environment variables, add each `VITE_FIREBASE_*` variable.

### Option B — GitHub + Vercel dashboard

1. Push your code to GitHub (make sure `.env` is in `.gitignore` — it already is)
2. Go to [https://vercel.com](https://vercel.com) → New Project → Import your repo
3. In **Environment Variables**, add all 6 `VITE_FIREBASE_*` variables
4. Click **Deploy**

Your app is live at `https://your-project.vercel.app`

### Custom domain

1. Buy a domain (~$12/yr at Namecheap) — e.g. `hsavault.app`
2. In Vercel dashboard → your project → **Domains** → Add domain
3. Follow DNS instructions (takes ~10 minutes)

---

## Project Structure

```
hsa-vault/
├── src/
│   ├── main.jsx                 # Entry point — auth gate
│   ├── firebase/
│   │   └── config.js            # Firebase initialization
│   ├── hooks/
│   │   ├── useAuth.js           # Auth state listener
│   │   └── useExpenses.js       # Firestore CRUD + file uploads
│   └── components/
│       ├── AuthScreen.jsx       # Login / signup / password reset
│       └── App.jsx              # Full app (dashboard, history, export, etc.)
├── firestore.rules              # Deploy to Firebase console
├── storage.rules                # Deploy to Firebase console
├── .env.example                 # Copy to .env and fill in
├── index.html
├── vite.config.js
└── package.json
```

---

## Adding Payments (Stripe)

When you're ready to charge for Pro features:

1. Create a Stripe account at [https://stripe.com](https://stripe.com)
2. Use **Stripe Checkout** for the payment flow
3. Use **Firebase Extensions** → "Run Payments with Stripe" to handle subscriptions
4. Gate features in the app by checking `user.subscription === 'pro'` from Firestore

Suggested pricing:
- **Free tier:** up to 20 expenses, no file uploads
- **Pro:** $4.99/month or $29.99/year — unlimited + receipt uploads + export

---

## App Store (Later)

When you're ready to publish to iOS/Android:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init
npm run build
npx cap add ios
npx cap add android
npx cap open ios   # opens in Xcode
npx cap open android  # opens in Android Studio
```

Apple Developer Program: $99/year at [developer.apple.com](https://developer.apple.com)
Google Play: $25 one-time at [play.google.com/console](https://play.google.com/console)

---

## Security Notes

- Firestore rules ensure users can **only access their own data**
- Storage rules ensure users can **only access their own receipts**
- Never commit `.env` to git
- Firebase API keys are safe to use in frontend code — they're restricted by Firebase rules
