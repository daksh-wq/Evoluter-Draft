# 🔥 Firebase Console Configuration Plan

## **Complete Setup Checklist for Your Application**

Follow these steps in order to fully configure Firebase for the Evoluter Engine app.

---

## 📋 **Prerequisites**

- [ ] Google account
- [ ] Firebase project URL: https://console.firebase.google.com
- [ ] Your `.env` file ready to update

---

## 🎯 **Step-by-Step Configuration Plan**

---

### **STEP 1: Authentication Setup** ⏱️ 5 minutes

#### **1.1 Enable Authentication Providers**

1. **Navigate to Authentication:**
   - Open Firebase Console: https://console.firebase.google.com
   - Select your project (or create new one)
   - Click **"Authentication"** in left sidebar
   - Click **"Get started"** (if first time)

2. **Enable Google Sign-In:**
   - Go to **"Sign-in method"** tab
   - Find **"Google"** in the list
   - Click **"Google"**
   - Toggle **"Enable"** switch to ON
   - **Project support email:** Select your email from dropdown
   - **Project public-facing name:** "Evoluter Engine" (or your app name)
   - Click **"Save"**
   - ✅ Status should show "Enabled"

3. **Enable Email/Password Sign-In:**
   - In same **"Sign-in method"** tab
   - Find **"Email/Password"**
   - Click it
   - Toggle **"Enable"** switch to ON
   - **Do NOT enable** "Email link (passwordless sign-in)" (unless you want it)
   - Click **"Save"**
   - ✅ Status should show "Enabled"

#### **1.2 Configure Authorized Domains**

1. **Go to Settings:**
   - Still in **"Authentication"**
   - Click **"Settings"** tab
   - Scroll to **"Authorized domains"** section

2. **Add Development Domain:**
   - Check if `localhost` is already listed
   - If not, click **"Add domain"**
   - Enter: `localhost`
   - Click **"Add"**

3. **Add Production Domain (when ready):**
   - Click **"Add domain"**
   - Enter your domain: `yourapp.com` (or `yourapp.vercel.app`)
   - Click **"Add"**

✅ **Result:** Users can sign in via Google and Email/Password from localhost

---

### **STEP 2: Firestore Database Setup** ⏱️ 10 minutes

#### **2.1 Create Firestore Database**

1. **Navigate to Firestore:**
   - Click **"Firestore Database"** in left sidebar
   - Click **"Create database"**

2. **Choose Location:**
   - Select location closest to your users
   - Examples:
     - `us-central1` (USA)
     - `asia-south1` (India)
     - `europe-west1` (Europe)
   - **Note:** Cannot change location later!
   - Click **"Next"**

3. **Start in Production Mode:**
   - Select **"Start in production mode"**
   - Don't worry, we'll update rules next
   - Click **"Create"**
   - Wait ~30 seconds for database creation

#### **2.2 Update Security Rules**

1. **Go to Rules Tab:**
   - In Firestore Database
   - Click **"Rules"** tab at top

2. **Copy and Paste These Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // User documents
    match /users/{userId} {
      // Allow all authenticated users to read (for leaderboard)
      allow read: if isAuthenticated();
      // Only owner can write
      allow write: if isOwner(userId);
      
      // User stats subcollection (for leaderboard)
      match /stats/{document=**} {
        allow read: if isAuthenticated();
        allow write: if isOwner(userId);
      }
      
      // Private subcollections (owner only)
      match /syllabus/{document=**} {
        allow read, write: if isOwner(userId);
      }
      
      match /docs/{docId} {
        allow read, write: if isOwner(userId);
      }
      
      match /tests/{testId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

3. **Publish Rules:**
   - Click **"Publish"** button
   - Wait for "Rules published successfully" message
   - ✅ Green checkmark should appear

#### **2.3 Create Indexes (Optional, for better performance)**

1. **Go to Indexes Tab:**
   - Click **"Indexes"** tab
   - Click **"Create index"** (if needed for queries)

2. **Common Index for Leaderboard:**
   - **Collection ID:** `users`
   - **Fields to index:**
     - Field: `stats.xp`, Order: Descending
   - Click **"Create index"**
   - Wait for index to build (1-2 minutes)

✅ **Result:** Database ready with secure rules

---

### **STEP 3: Storage Setup (for PDF uploads)** ⏱️ 5 minutes

#### **3.1 Enable Cloud Storage**

1. **Navigate to Storage:**
   - Click **"Storage"** in left sidebar
   - Click **"Get started"**

2. **Security Rules:**
   - Select **"Start in production mode"**
   - Click **"Next"**

3. **Choose Location:**
   - Same location as Firestore (recommended)
   - Click **"Done"**
   - Wait for storage bucket creation

#### **3.2 Update Storage Rules**

1. **Go to Rules Tab:**
   - In Storage
   - Click **"Rules"** tab

2. **Copy and Paste These Rules:**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User documents folder
    match /users/{userId}/docs/{allPaths=**} {
      // Only allow upload if user is authenticated and owns this folder
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // File size limit: 20MB
      allow write: if request.resource.size < 20 * 1024 * 1024;
      
      // Only allow PDF files
      allow write: if request.resource.contentType == 'application/pdf';
    }
  }
}
```

3. **Publish Rules:**
   - Click **"Publish"**
   - ✅ Confirm success message

✅ **Result:** Users can upload PDFs to their own folders

---

### **STEP 4: Get Firebase Configuration** ⏱️ 2 minutes

#### **4.1 Access Project Settings**

1. **Go to Project Settings:**
   - Click ⚙️ **gear icon** (top left, next to "Project Overview")
   - Select **"Project settings"**

2. **Scroll to "Your apps" section:**
   - Should see Web app icon `</>`
   - If no app exists, click **"Add app"** → **Web** → Name: "Evoluter Engine"

3. **View Firebase Configuration:**
   - Find **"SDK setup and configuration"**
   - Select **"Config"** (not "npm")
   - Copy the `firebaseConfig` object

#### **4.2 Update Your `.env` File**

Copy values from Firebase console to your `.env`:

```env
VITE_FIREBASE_API_KEY=AIzaSy... # from apiKey
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com # from authDomain
VITE_FIREBASE_PROJECT_ID=your-project-id # from projectId
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com # from storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789 # from messagingSenderId
VITE_FIREBASE_APP_ID=1:123456789:web:abc123 # from appId
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123XYZ # from measurementId

# Gemini AI API Key (for question generation)
VITE_GEMINI_API_KEY=AIzaSy... # Get from https://aistudio.google.com/app/apikey
```

**⚠️ Important Notes:**
- **Must** have `VITE_` prefix (Vite requirement)
- **No quotes** around values
- **No spaces** around `=`
- Keep this file **secret** (never commit to Git)

#### **4.3 Restart Development Server**

```bash
# Stop server: Ctrl+C
# Start again:
npm run dev
```

✅ **Result:** App connected to Firebase

---

### **STEP 5: Test Your Configuration** ⏱️ 3 minutes

#### **5.1 Test Authentication**

1. **Open your app:** http://localhost:5173 (or your dev URL)
2. **Click "Login"**
3. **Test Google Login:**
   - Click "Continue with Google"
   - Select Google account
   - Should redirect to dashboard
   - ✅ Success if you see your name in sidebar

4. **Test Email Signup:**
   - Click "Sign Up" tab
   - Enter name, email, password
   - Click "Create Account"
   - Should redirect to onboarding
   - ✅ Success if you can complete onboarding

#### **5.2 Test Firestore Access**

1. **Check Browser Console (F12):**
   - Should see **no errors** related to Firestore
   - Look for messages like "User data loaded"

2. **Check Firebase Console:**
   - Go to **Firestore Database** → **Data** tab
   - Should see new collection: `users`
   - Click to expand → Should see your user document
   - ✅ Success if you see your profile data

#### **5.3 Test Storage Upload**

1. **In your app:**
   - Go to **Library** page
   - Click "Upload Resource"
   - Select a PDF file
   - ✅ Success if file uploads without errors

2. **Check Firebase Console:**
   - Go to **Storage**
   - Should see: `users/{your-uid}/docs/{filename}.pdf`
   - ✅ File appears in correct folder

---

### **STEP 6: Optional - Enable Analytics** ⏱️ 2 minutes

#### **6.1 Enable Google Analytics (Optional)**

1. **Navigate to Analytics:**
   - Click **"Analytics"** in left sidebar (if not enabled)
   - Click **"Enable Analytics"**

2. **Create/Select Analytics Account:**
   - Choose existing or create new
   - Accept terms
   - Click **"Enable Analytics"**

3. **Wait for Setup:**
   - Takes 1-2 minutes
   - ✅ Dashboard will show "Analytics enabled"

**Note:** Analytics helps track user engagement, but is optional for development.

---

## ✅ **Final Checklist**

After completing all steps, verify:

### **Authentication:**
- [ ] Google Sign-In enabled with support email
- [ ] Email/Password sign-in enabled
- [ ] `localhost` in authorized domains
- [ ] Can successfully log in with Google
- [ ] Can successfully sign up with email

### **Firestore:**
- [ ] Database created
- [ ] Security rules published
- [ ] User document created after signup
- [ ] No permission errors in console

### **Storage:**
- [ ] Storage bucket created
- [ ] Security rules published
- [ ] PDF upload works
- [ ] Files appear in correct user folder

### **Configuration:**
- [ ] `.env` file updated with all keys
- [ ] Development server restarted
- [ ] No `undefined` environment variables
- [ ] App connects to Firebase successfully

---

## 🎯 **Summary Timeline**

| Task | Time | Status |
|------|------|--------|
| Authentication Setup | 5 min | ⬜ |
| Firestore Setup | 10 min | ⬜ |
| Storage Setup | 5 min | ⬜ |
| Get Config & Update .env | 2 min | ⬜ |
| Test Everything | 3 min | ⬜ |
| **Total** | **~25 minutes** | |

---

## 🚨 **Common Issues During Setup**

### **Issue: "API key not valid"**
- **Cause:** Wrong API key in `.env`
- **Fix:** Copy exact value from Firebase Console

### **Issue: "Project not found"**
- **Cause:** Wrong project ID
- **Fix:** Check Firebase Console → Project Settings → Project ID

### **Issue: "Permission denied" after rules update**
- **Cause:** Rules not published or taking time to propagate
- **Fix:** 
  1. Click "Publish" in Firebase Console
  2. Wait 1-2 minutes
  3. Hard refresh app (Ctrl+Shift+R)

### **Issue: Google login popup blocked**
- **Cause:** Browser blocking popups
- **Fix:** Allow popups or use redirect method (see GOOGLE_LOGIN_FIX.md)

---

## 📞 **Need Help?**

If you get stuck:

1. **Check Firebase Console Errors:**
   - Look for red error messages
   - Click on errors for details

2. **Check Browser Console (F12):**
   - Look for Firebase-related errors
   - Check if environment variables are loaded

3. **Verify each step:**
   - Use checkboxes above to track progress
   - Don't skip steps!

---

## 🎉 **After Completion**

Your Firebase backend will be fully configured and ready for:

✅ User authentication (Google + Email/Password)  
✅ User data storage (profiles, stats, progress)  
✅ PDF document uploads  
✅ Leaderboard queries  
✅ Real-time data sync  
✅ Secure access control  

**Your app is production-ready! 🚀**

---

**Start with Step 1 and work through each section. Check boxes as you complete tasks!**
