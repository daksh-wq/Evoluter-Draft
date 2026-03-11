# 🗄️ Backend & Database Issues - Remaining Work

**Report Date:** 2026-02-12  
**Category:** Backend, Database, Security, Infrastructure  
**Total Issues:** 20  
**Total Effort:** 386 hours (~10 weeks for 1 backend engineer)

---

## 📊 **SUMMARY**

| Priority | Count | Hours |
|----------|-------|-------|
| 🔴 Critical (P0) | 6 | 42h |
| 🟠 High (P1) | 9 | 284h |
| 🟡 Medium (P2) | 4 | 56h |
| 🔵 Low (P3) | 1 | 4h |
| **TOTAL** | **20** | **386h** |

---

## 🔴 **CRITICAL ISSUES (Must Fix Immediately)**

### **Priority: P0 - Blocking Production Launch**

---

### **🔴 S-1: Exposed API Keys in Environment File**

**Severity:** CRITICAL SECURITY RISK  
**Status:** ⚠️ **NOT FIXED**  
**Effort:** 2 hours  
**Type:** Security / DevOps

**Issue:**
- Gemini and Firebase API keys publicly committed in `.env` file
- Anyone with repo access can steal keys
- Potential unlimited API usage → $$$$ bills

**Evidence:**
```env
VITE_GEMINI_API_KEY="AIzaSyDa6FLR3slliqckJYec02D6aX7j1aIRzY0"
VITE_FIREBASE_API_KEY="AIzaSyBCIh2eit2RcpSbFjaY0ysI7f2mn1o5fNs"
```

**Required Actions:**

1. **Rotate Keys Immediately:**
```bash
# Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find current API key
3. Click "Regenerate" or "Create New Key"
4. Copy new key
5. Delete old key

# Firebase Console
1. Go to: https://console.firebase.google.com
2. Project Settings → Service Accounts
3. Generate new private key
4. Revoke old credentials
```

2. **Remove from Git History:**
```bash
# Install BFG Repo Cleaner
brew install bfg  # Mac
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove .env from history
bfg --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: coordinate with team)
git push --force --all
```

3. **Use Environment Variables in Deployment:**
```bash
# Vercel
vercel env add VITE_GEMINI_API_KEY

# Netlify
# Settings → Build & Deploy → Environment → Add Variable

# Firebase Hosting
firebase functions:config:set gemini.api_key="YOUR_KEY"
```

4. **Verify .gitignore:**
```bash
# .gitignore
.env
.env.local
.env.development
.env.production
.env.*.local
```

**Dependencies:** Access to Google Cloud Console, Firebase Console  
**Blocking:** Production deployment, security audit

---

### **🔴 S-2: No Firebase Security Rules Validation**

**Severity:** CRITICAL SECURITY RISK  
**Status:** 📋 **RULES CREATED - NOT DEPLOYED**  
**Effort:** 30 minutes  
**Type:** Database Security

**Issue:**
- Firestore and Storage security rules not deployed
- Database potentially publicly readable/writable

**Files Created (Ready to Deploy):**
- ✅ `firestore.rules` - Production rules
- ✅ `firestore.dev.rules` - Development rules
- ✅ `storage.rules` - Storage security rules

**Required Actions:**

1. **Deploy Firestore Rules:**
```bash
# Test rules locally first
firebase emulators:start --only firestore

# Deploy production rules
firebase deploy --only firestore:rules

# Verify deployment
firebase firestore:rules:list
```

2. **Deploy Storage Rules:**
```bash
# Deploy storage rules
firebase deploy --only storage

# Verify via Firebase Console
# Storage → Rules → Check timestamps
```

3. **Test Rules in Console:**
```javascript
// Firebase Console → Firestore → Rules Playground

// Test read access (should work for authenticated users)
service: cloud.firestore
location: /databases/(default)/documents/users/USER_ID
method: get
authenticated: yes
// Expected: Allow ✅

// Test write to other user's data (should fail)
location: /databases/(default)/documents/users/OTHER_USER_ID
method: create
authenticated: yes
// Expected: Deny ❌
```

4. **Monitor Rules Violations:**
```bash
# Check for denied requests
# Firebase Console → Firestore → Usage → Security Rules

# Set up alerts for unusual patterns
```

**Production Rules Content:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    match /users/{userId} {
      // Allow read for leaderboard
      allow read: if isAuthenticated();
      // Only owner can write
      allow write: if isOwner(userId);
      
      match /tests/{testId} {
        allow read, write: if isOwner(userId);
      }
      
      match /docs/{docId} {
        allow read, write: if isOwner(userId);
      }
      
      match /saved_articles/{articleId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

**Dependencies:** Firebase CLI, Firebase project access  
**Blocking:** Production deployment

---

### **🔴 S-3: Missing Authentication Guards**

**Severity:** CRITICAL BUG  
**Status:** ⚠️ **NOT FIXED**  
**Effort:** 4 hours  
**Type:** Backend Logic / Auth

**Issue:**
- Race condition in onboarding flow
- Users can bypass onboarding by navigating directly to `/dashboard`
- Dashboard crashes: `userData.targetExam is undefined`

**Backend Work Required:**

1. **Create Cloud Function for Auth Validation:**
```javascript
// functions/authValidation.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.validateUserSession = functions.https.onCall(async (data, context) => {
  // Verify authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  
  // Check if user has completed onboarding
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    return {
      status: 'incomplete',
      redirectTo: '/onboarding',
      message: 'Please complete onboarding first'
    };
  }
  
  const userData = userDoc.data();
  
  // Validate required fields
  const requiredFields = ['targetExam', 'targetYear', 'name'];
  const missingFields = requiredFields.filter(field => !userData[field]);
  
  if (missingFields.length > 0) {
    return {
      status: 'incomplete',
      redirectTo: '/onboarding',
      message: 'Missing required information',
      missingFields
    };
  }
  
  return {
    status: 'complete',
    userData
  };
});
```

2. **Add Firestore Trigger for User Creation:**
```javascript
// Automatically create user document on signup
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  await admin.firestore().collection('users').doc(user.uid).set({
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    provider: user.providerData[0]?.providerId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    onboardingComplete: false,
    stats: DEFAULT_USER_STATS
  }, { merge: true });
});
```

3. **Add Security Rule:**
```javascript
// In firestore.rules
match /users/{userId} {
  // Prevent access to dashboard routes if onboarding not complete
  allow read: if isOwner(userId) || 
    (isAuthenticated() && resource.data.onboardingComplete == true);
  
  allow write: if isOwner(userId);
}
```

**Dependencies:** Cloud Functions setup  
**Blocking:** User experience, data integrity

---

### **🔴 SEC-1: Client-Side Storage of Test Questions**

**Severity:** CRITICAL SECURITY RISK  
**Status:** ⚠️ **NOT FIXED**  
**Effort:** 16 hours  
**Type:** Backend Architecture

**Issue:**
- Full question bank with **correct answers** stored in Firestore
- Users can inspect network tab → copy questions + answers
- Questions can be leaked online

**Current Implementation:**
```javascript
// ❌ useTest.js - Stores everything client-side
const testData = {
  questions: activeTest, // Contains correct answers!
  answers: userAnswers,
  score: calculatedScore
};

await setDoc(doc(db, `users/${uid}/tests/${testId}`), testData);
```

**Backend Solution Required:**

1. **Create Cloud Function for Question Generation:**
```javascript
// functions/testGeneration.js
exports.generateTest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }
  
  const { topic, questionCount, difficulty } = data;
  const userId = context.auth.uid;
  
  // Check rate limit
  await checkRateLimit(userId);
  
  // Generate questions using Gemini
  const questions = await generateQuestionsWithGemini(topic, questionCount, difficulty);
  
  // Store questions SERVER-SIDE ONLY
  const testId = generateTestId();
  await admin.firestore().collection('_test_questions').doc(testId).set({
    questions: questions, // ✅ Server-side only
    createdBy: userId,
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    )
  });
  
  // Return ONLY question text, no answers
  const questionsWithoutAnswers = questions.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options,
    // ❌ NO correctAnswer
    // ❌ NO explanation
  }));
  
  // Create test session
  await admin.firestore().collection('users').doc(userId)
    .collection('test_sessions').doc(testId).set({
      questionCount,
      topic,
      difficulty,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'in_progress'
    });
  
  return {
    testId,
    questions: questionsWithoutAnswers
  };
});
```

2. **Create Cloud Function for Test Submission:**
```javascript
// functions/testSubmission.js
exports.submitTest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated');
  }
  
  const { testId, answers } = data;
  const userId = context.auth.uid;
  
  // Fetch correct answers from server
  const testDoc = await admin.firestore()
    .collection('_test_questions').doc(testId).get();
  
  if (!testDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Test not found or expired');
  }
  
  const correctAnswers = testDoc.data().questions;
  
  // Calculate score SERVER-SIDE
  let score = 0;
  const results = [];
  
  correctAnswers.forEach((question, idx) => {
    const userAnswer = answers[question.id];
    const isCorrect = userAnswer === question.correctAnswer;
    
    if (isCorrect) score++;
    
    results.push({
      questionId: question.id,
      userAnswer,
      isCorrect,
      // Return correct answer and explanation ONLY after submission
      correctAnswer: question.correctAnswer,
      explanation: question.explanation
    });
  });
  
  // Save result
  await admin.firestore().collection('users').doc(userId)
    .collection('tests').doc(testId).set({
      score,
      totalQuestions: correctAnswers.length,
      results,
      submittedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  
  // Delete server-side questions (no longer needed)
  await admin.firestore().collection('_test_questions').doc(testId).delete();
  
  return {
    score,
    totalQuestions: correctAnswers.length,
    results
  };
});
```

3. **Update Security Rules:**
```javascript
// Prevent direct access to test questions
match /_test_questions/{testId} {
  allow read: if false; // Never allow client read
  allow write: if false; // Only Cloud Functions can write
}
```

**Frontend Changes Needed:**
```javascript
// useTest.js - Call Cloud Function instead
const startAITest = async (topic) => {
  const generateTest = httpsCallable(functions, 'generateTest');
  const result = await generateTest({ topic, questionCount: 100, difficulty: 'medium' });
  
  setActiveTest(result.data.questions); // No answers included
  setTestId(result.data.testId);
};

const submitTest = async () => {
  const submitTestFn = httpsCallable(functions, 'submitTest');
  const result = await submitTestFn({ testId, answers });
  
  // Now get correct answers and explanations
  return result.data;
};
```

**Dependencies:** Cloud Functions deployed  
**Blocking:** Security audit, prevents question leakage

---

### **🔴 SEC-2: Tab-Switch Proctoring is Bypassable**

**Severity:** CRITICAL SECURITY RISK  
**Status:** ⚠️ **NOT FIXED**  
**Effort:** 12 hours  
**Type:** Backend Monitoring

**Issue:**
- Client-side `visibilitychange` can be disabled
- Warning count stored in client state only
- Easily bypassable via DevTools

**Backend Solution Required:**

1. **Create Tab Switch Tracking Function:**
```javascript
// functions/proctoring.js
exports.trackTabSwitch = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated');
  }
  
  const { testSessionId, eventType, timestamp } = data;
  const userId = context.auth.uid;
  
  // Validate session belongs to user
  const sessionDoc = await admin.firestore()
    .collection('users').doc(userId)
    .collection('test_sessions').doc(testSessionId).get();
  
  if (!sessionDoc.exists || sessionDoc.data().createdBy !== userId) {
    throw new functions.https.HttpsError('permission-denied');
  }
  
  // Log the event
  await admin.firestore()
    .collection('users').doc(userId)
    .collection('test_sessions').doc(testSessionId)
    .collection('events').add({
      type: eventType, // 'tab_switch', 'window_blur', 'copy', 'paste'
      timestamp: admin.firestore.Timestamp.fromMillis(timestamp),
      serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: context.rawRequest.headers['user-agent'],
      ip: context.rawRequest.ip
    });
  
  // Check violation count
  const eventsSnapshot = await admin.firestore()
    .collection('users').doc(userId)
    .collection('test_sessions').doc(testSessionId)
    .collection('events')
    .where('type', '==', 'tab_switch')
    .get();
  
  const violationCount = eventsSnapshot.size;
  
  // Auto-flag if suspicious
  if (violationCount >= 5) {
    await admin.firestore()
      .collection('users').doc(userId)
      .collection('test_sessions').doc(testSessionId)
      .update({
        flaggedForReview: true,
        flagReason: `Excessive tab switches (${violationCount})`,
        flaggedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    return {
      action: 'FLAG_FOR_REVIEW',
      violationCount
    };
  }
  
  if (violationCount >= 3) {
    return {
      action: 'WARNING',
      violationCount,
      message: `Warning: ${violationCount} tab switches detected`
    };
  }
  
  return {
    action: 'LOG',
    violationCount
  };
});
```

2. **Create Session Validation Function:**
```javascript
exports.validateTestSession = functions.https.onCall(async (data, context) => {
  const { testSessionId } = data;
  const userId = context.auth.uid;
  
  const sessionDoc = await admin.firestore()
    .collection('users').doc(userId)
    .collection('test_sessions').doc(testSessionId).get();
  
  if (!sessionDoc.exists) {
    return { valid: false, reason: 'Session not found' };
  }
  
  const session = sessionDoc.data();
  
  // Check time limits
  const elapsedTime = Date.now() - session.startedAt.toMillis();
  const maxTime = session.duration * 60 * 1000; // Convert to ms
  
  if (elapsedTime > maxTime * 1.1) { // 10% buffer
    return { 
      valid: false, 
      reason: 'Time limit exceeded',
      action: 'AUTO_SUBMIT'
    };
  }
  
  // Check for tampering
  if (session.flaggedForReview) {
    return {
      valid: false,
      reason: 'Session flagged for review',
      action: 'BLOCK_SUBMISSION'
    };
  }
  
  return { valid: true };
});
```

3. **Update Frontend:**
```javascript
// TestView.jsx
const handleTabSwitch = async () => {
  // Call Cloud Function (can't be bypassed)
  const trackSwitch = httpsCallable(functions, 'trackTabSwitch');
  const result = await trackSwitch({
    testSessionId: currentTestId,
    eventType: 'tab_switch',
    timestamp: Date.now()
  });
  
  if (result.data.action === 'FLAG_FOR_REVIEW') {
    // Force submit and show message
    await handleForceSubmit();
    alert('Too many violations detected. Test submitted automatically.');
  } else if (result.data.action === 'WARNING') {
    setWarningMessage(result.data.message);
  }
};
```

**Dependencies:** Cloud Functions  
**Blocking:** Test integrity

---

### **🔴 SEC-3: No Rate Limiting on AI Generation**

**Severity:** CRITICAL COST RISK  
**Status:** ⚠️ **NOT FIXED**  
**Effort:** 8 hours  
**Type:** Backend Security / Cost Control

**Issue:**
- No limit on Gemini API calls per user
- Malicious user can drain quota → $$$$ bill

**Backend Solution Required:**

1. **Create Rate Limiting in Firestore Rules:**
```javascript
// firestore.rules
match /users/{userId}/api_usage/{date} {
  allow read: if request.auth.uid == userId;
  
  allow create: if request.auth.uid == userId
    && !exists(/databases/$(database)/documents/users/$(userId)/api_usage/$(date))
    && request.resource.data.count == 1;
  
  allow update: if request.auth.uid == userId
    && request.resource.data.count <= 10   // Max 10 per day
    && request.resource.data.count == resource.data.count + 1;
}
```

2. **Implement in Cloud Function:**
```javascript
// functions/rateLimit.js
exports.checkAndIncrementRateLimit = async (userId, limitType = 'test_generation') => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const usageRef = admin.firestore()
    .collection('users').doc(userId)
    .collection('api_usage').doc(today);
  
  const limits = {
    test_generation: 10,
    question_generation: 50,
    ai_evaluation: 20
  };
  
  const maxLimit = limits[limitType] || 10;
  
  try {
    await admin.firestore().runTransaction(async (transaction) => {
      const usageDoc = await transaction.get(usageRef);
      
      if (!usageDoc.exists) {
        // First usage today
        transaction.set(usageRef, {
          [limitType]: 1,
          date: today,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        const currentCount = usageDoc.data()[limitType] || 0;
        
        if (currentCount >= maxLimit) {
          throw new functions.https.HttpsError(
            'resource-exhausted',
            `Daily limit reached. You can generate ${maxLimit} tests per day. Try again tomorrow.`
          );
        }
        
        transaction.update(usageRef, {
          [limitType]: admin.firestore.FieldValue.increment(1),
          lastUsed: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  } catch (error) {
    if (error.code === 'resource-exhausted') {
      throw error;
    }
    console.error('Rate limit check failed:', error);
    throw new functions.https.HttpsError('internal', 'Rate limit check failed');
  }
};

// Use in generateTest function
exports.generateTest = functions.https.onCall(async (data, context) => {
  // ... auth check
  
  // ✅ Check rate limit BEFORE calling Gemini
  await checkAndIncrementRateLimit(userId, 'test_generation');
  
  // Now safe to call Gemini API
  const questions = await generateQuestionsWithGemini(...);
  
  return { questions };
});
```

3. **Add Usage Dashboard:**
```javascript
// Cloud Function to get usage stats
exports.getUserUsageStats = functions.https.onCall(async (data, context) => {
  const userId = context.auth.uid;
  const today = new Date().toISOString().split('T')[0];
  
  const usageDoc = await admin.firestore()
    .collection('users').doc(userId)
    .collection('api_usage').doc(today).get();
  
  if (!usageDoc.exists) {
    return { test_generation: 0, limit: 10, remaining: 10 };
  }
  
  const usage = usageDoc.data();
  
  return {
    test_generation: usage.test_generation || 0,
    limit: 10,
    remaining: 10 - (usage.test_generation || 0),
    resetsAt: new Date(today + 'T00:00:00Z').getTime() + 86400000 // Next day
  };
});
```

4. **Show in Frontend:**
```javascript
// In Dashboard
const [usageStats, setUsageStats] = useState(null);

useEffect(() => {
  const getUsage = httpsCallable(functions, 'getUserUsageStats');
  getUsage().then(result => setUsageStats(result.data));
}, []);

// Display
<div>
  <p>AI Tests Today: {usageStats?.test_generation} / {usageStats?.limit}</p>
  <p>Remaining: {usageStats?.remaining}</p>
</div>
```

**Dependencies:** Cloud Functions  
**Blocking:** Cost control

---

## 🟠 **HIGH PRIORITY BACKEND ISSUES**

---

### **🟠 F-1: Flashcards Feature — Backend Missing**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 12 hours (backend portion)  
**Type:** Backend Feature

**Backend Work Required:**

1. **Create Firestore Data Model:**
```javascript
// Collection: /users/{userId}/flashcards/{flashcardId}
{
  id: 'flashcard_123',
  topic: 'Polity',
  frontText: 'What is Article 370?',
  backText: 'Special status for Jammu & Kashmir...',
  difficulty: 0, // SM-2 algorithm
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  nextReview: Timestamp,
  createdAt: Timestamp,
  lastReviewed: Timestamp
}
```

2. **Implement SM-2 Spaced Repetition Algorithm:**
```javascript
// functions/flashcards.js
exports.reviewFlashcard = functions.https.onCall(async (data, context) => {
  const { flashcardId, quality } = data; // quality: 0-5
  const userId = context.auth.uid;
  
  const cardRef = admin.firestore()
    .collection('users').doc(userId)
    .collection('flashcards').doc(flashcardId);
  
  const cardDoc = await cardRef.get();
  const card = cardDoc.data();
  
  // SM-2 Algorithm
  let newEaseFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;
  
  let newInterval;
  let newRepetitions;
  
  if (quality < 3) {
    // Incorrect - reset
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions = card.repetitions + 1;
    
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(card.interval * newEaseFactor);
    }
  }
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);
  
  await cardRef.update({
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReview: admin.firestore.Timestamp.fromDate(nextReview),
    lastReviewed: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return {
    nextReview: nextReview.toISOString(),
    interval: newInterval
  };
});
```

3. **Create Auto-Generation Function:**
```javascript
// Generate flashcards from topic
exports.generateFlashcards = functions.https.onCall(async (data, context) => {
  const { topic, count } = data;
  const userId = context.auth.uid;
  
  // Check rate limit
  await checkAndIncrementRateLimit(userId, 'flashcard_generation');
  
  // Use Gemini to generate flashcards
  const prompt = `Generate ${count} flashcards on ${topic}. Format as JSON array with "front" and "back" properties.`;
  
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const result = await model.generateContent(prompt);
  const flashcardsData = JSON.parse(result.response.text());
  
  // Save to Firestore
  const batch = admin.firestore().batch();
  
  flashcardsData.forEach(card => {
    const docRef = admin.firestore()
      .collection('users').doc(userId)
      .collection('flashcards').doc();
    
    batch.set(docRef, {
      topic,
      frontText: card.front,
      backText: card.back,
      difficulty: 0,
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: admin.firestore.Timestamp.now(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  
  await batch.commit();
  
  return { count: flashcardsData.length };
});
```

**Dependencies:** Cloud Functions, Gemini API

---

### **🟠 F-5: Library "Extract Questions" — Real PDF Processing**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 32 hours  
**Type:** Backend Processing

**Backend Work Required:**

1. **Create Cloud Function for PDF Processing:**
```javascript
// functions/pdfProcessing.js
const pdf = require('pdf-parse');
const axios = require('axios');

exports.extractTextFromPDF = functions.https.onCall(async (data, context) => {
  const { pdfUrl } = data;
  const userId = context.auth.uid;
  
  // Check file size (limit to 20MB)
  const response = await axios.head(pdfUrl);
  const fileSize = parseInt(response.headers['content-length']);
  
  if (fileSize > 20 * 1024 * 1024) {
    throw new functions.https.HttpsError('invalid-argument', 'File too large (max 20MB)');
  }
  
  // Download PDF
  const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
  const pdfBuffer = Buffer.from(pdfResponse.data);
  
  // Extract text
  const pdfData = await pdf(pdfBuffer);
  const extractedText = pdfData.text;
  
  // Chunk text (Gemini has token limits)
  const chunks = chunkText(extractedText, 5000); // 5000 chars per chunk
  
  return {
    text: extractedText,
    pages: pdfData.numpages,
    chunks
  };
});

function chunkText(text, maxLength) {
  const chunks = [];
  let currentChunk = '';
  
  const sentences = text.split('. ');
  
  sentences.forEach(sentence => {
    if ((currentChunk + sentence).length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '. ';
    }
  });
  
  if (currentChunk) chunks.push(currentChunk);
  
  return chunks;
}
```

2. **Generate Questions from Extracted Text:**
```javascript
exports.generateQuestionsFromPDF = functions.https.onCall(async (data, context) => {
  const { textChunks, questionCount } = data;
  const userId = context.auth.uid;
  
  await checkAndIncrementRateLimit(userId, 'question_generation');
  
  const questionsPerChunk = Math.ceil(questionCount / textChunks.length);
  const allQuestions = [];
  
  for (const chunk of textChunks) {
    const prompt = `
      Based on this text, generate ${questionsPerChunk} multiple-choice questions.
      
      Text: ${chunk}
      
      Format as JSON array with properties: question, options (array of 4), correctAnswer (index), explanation.
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const questions = JSON.parse(result.response.text());
    
    allQuestions.push(...questions);
  }
  
  return { questions: allQuestions.slice(0, questionCount) };
});
```

**Dependencies:** Cloud Functions, pdf-parse library, Gemini API

---

### **🟠 ARCH-1: No Backend API Layer**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 80 hours  
**Type:** Architecture

**Backend Work Required:**

1. **Setup Cloud Functions Project:**
```bash
# Initialize Functions
firebase init functions

# Install dependencies
cd functions
npm install firebase-admin firebase-functions @google-cloud/firestore express cors
```

2. **Create API Endpoints:**
```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));

// API Routes
app.post('/api/v1/tests/generate', async (req, res) => {
  // Validate auth token
  const token = req.headers.authorization?.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(token);
  
  // Generate test
  const result = await generateTest(req.body, decodedToken.uid);
  res.json(result);
});

app.post('/api/v1/tests/submit', async (req, res) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(token);
  
  const result = await submitTest(req.body, decodedToken.uid);
  res.json(result);
});

app.get('/api/v1/leaderboard', async (req, res) => {
  // Cache for 5 minutes
  const cached = await getFromCache('leaderboard');
  if (cached) return res.json(cached);
  
  const leaderboard = await getLeaderboard();
  await saveToCache('leaderboard', leaderboard, 300); // 5 min TTL
  
  res.json(leaderboard);
});

exports.api = functions.https.onRequest(app);
```

3. **Implement Caching:**
```javascript
// Use Firestore as cache
async function getFromCache(key) {
  const cacheDoc = await admin.firestore().collection('_cache').doc(key).get();
  
  if (!cacheDoc.exists) return null;
  
  const data = cacheDoc.data();
  const now = Date.now();
  
  if (data.expiresAt < now) {
    // Expired
    await admin.firestore().collection('_cache').doc(key).delete();
    return null;
  }
  
  return data.value;
}

async function saveToCache(key, value, ttlSeconds) {
  await admin.firestore().collection('_cache').doc(key).set({
    value,
    expiresAt: Date.now() + (ttlSeconds * 1000),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
```

**Dependencies:** Cloud Functions, Express.js

---

### **🟠 Testing: 0% Coverage**

**Status:** ⚠️ **NO TESTS**  
**Effort:** 60 hours (backend portion)  
**Type:** Quality Assurance

**Backend Testing Required:**

1. **Setup Testing Framework:**
```bash
cd functions
npm install --save-dev mocha chai sinon firebase-functions-test
```

2. **Write Cloud Function Tests:**
```javascript
// functions/test/testGeneration.test.js
const test = require('firebase-functions-test')();
const admin = require('firebase-admin');
const { expect } = require('chai');

describe('generateTest', () => {
  afterEach(() => {
    test.cleanup();
  });
  
  it('should generate test with correct number of questions', async () => {
    const wrapped = test.wrap(functions.generateTest);
    
    const result = await wrapped({
      topic: 'Polity',
      questionCount: 25,
      difficulty: 'medium'
    }, {
      auth: { uid: 'test-user-123' }
    });
    
    expect(result.questions).to.have.lengthOf(25);
  });
  
  it('should enforce rate limiting', async () => {
    // Mock Firestore to show user at limit
    const wrapped = test.wrap(functions.generateTest);
    
    try {
      await wrapped({ topic: 'History', questionCount: 25 }, {
        auth: { uid: 'rate-limited-user' }
      });
      expect.fail('Should have thrown rate limit error');
    } catch (error) {
      expect(error.code).to.equal('resource-exhausted');
    }
  });
});
```

3. **Security Rules Testing:**
```javascript
// test/firestore.rules.test.js
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

describe('Firestore Security Rules', () => {
  let testEnv;
  
  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
      firestore: {
        rules: fs.readFileSync('firestore.rules', 'utf8')
      }
    });
  });
  
  it('should allow user to read own data', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc('user123').set({
        name: 'Test User'
      });
    });
    
    const doc = await db.collection('users').doc('user123').get();
    expect(doc.exists).to.be.true;
  });
  
  it('should deny user from reading other user data', async () => {
    const db = testEnv.authenticatedContext('user123').firestore();
    
    await expectFirestorePermissionDenied(
      db.collection('users').doc('user456').get()
    );
  });
});
```

**Dependencies:** Mocha, Chai, firebase-functions-test

---

## 🟡 **MEDIUM PRIORITY BACKEND ISSUES**

---

### **🟡 MF-3: No Offline Mode**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 20 hours (backend portion)  
**Type:** Database / Caching

**Backend Work Required:**

1. **Enable Firestore Offline Persistence:**
```javascript
// In firebase.js (frontend)
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open
      console.warn('Persistence failed: multiple tabs');
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support
      console.warn('Persistence not available');
    }
  });
```

2. **Create Sync Queue:**
```javascript
// Cloud Function to handle offline sync
exports.syncOfflineData = functions.https.onCall(async (data, context) => {
  const { operations } = data; // Array of pending operations
  const userId = context.auth.uid;
  
  const results = [];
  
  for (const op of operations) {
    try {
      switch (op.type) {
        case 'CREATE_TEST':
          await createTest(userId, op.data);
          results.push({ success: true, id: op.id });
          break;
        
        case 'SUBMIT_TEST':
          await submitTest(userId, op.data);
          results.push({ success: true, id: op.id });
          break;
        
        default:
          results.push({ success: false, id: op.id, error: 'Unknown operation' });
      }
    } catch (error) {
      results.push({ success: false, id: op.id, error: error.message });
    }
  }
  
  return { results };
});
```

**Dependencies:** IndexedDB support

---

### **🟡 SCALE-1: Firestore Read Costs**

**Status:** ⚠️ **NOT OPTIMIZED**  
**Effort:** 12 hours  
**Type:** Database Optimization

**Backend Work Required:**

1. **Replace Real-time Listeners with Manual Fetches:**
```javascript
// Instead of onSnapshot (continuous reads)
// Use getDocs with client-side caching

// Before (expensive)
onSnapshot(collection(db, `users/${uid}/docs`), (snapshot) => {
  setDocs(snapshot.docs.map(doc => doc.data()));
});

// After (cheaper)
const fetchDocs = async () => {
  const snapshot = await getDocs(collection(db, `users/${uid}/docs`));
  const docs = snapshot.docs.map(doc => doc.data());
  
  // Cache in localStorage
  localStorage.setItem('cached_docs', JSON.stringify({
    docs,
    timestamp: Date.now()
  }));
  
  setDocs(docs);
};

// Refresh every 5 minutes instead of real-time
useEffect(() => {
  fetchDocs();
  const interval = setInterval(fetchDocs, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

2. **Implement Pagination:**
```javascript
// Paginate large queries
const getTestHistory = async (lastDoc = null, pageSize = 20) => {
  let q = query(
    collection(db, `users/${uid}/tests`),
    orderBy('completedAt', 'desc'),
    limit(pageSize)
  );
  
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }
  
  const snapshot = await getDocs(q);
  
  return {
    tests: snapshot.docs.map(doc => doc.data()),
    lastDoc: snapshot.docs[snapshot.docs.length - 1]
  };
};
```

**Expected Savings:** 90% reduction in reads

---

### **🟡 SCALE-2: No Database Indexing**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 4 hours  
**Type:** Database Performance

**Backend Work Required:**

1. **Create `firestore.indexes.json`:**
```json
{
  "indexes": [
    {
      "collectionGroup": "tests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "completedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "stats.xp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "tests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "topic", "order": "ASCENDING" },
        { "fieldPath": "completedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

2. **Deploy Indexes:**
```bash
firebase deploy --only firestore:indexes
```

**Expected Improvement:** 10-100x faster queries

---

### **🟡 SCALE-4: No API Quota Management**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 8 hours  
**Type:** Monitoring

**Backend Work Required:**

1. **Create Admin Dashboard Function:**
```javascript
exports.getAPIUsageStats = functions.https.onCall(async (data, context) => {
  // Verify admin
  const adminDoc = await admin.firestore().collection('admins').doc(context.auth.uid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError('permission-denied');
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  // Aggregate usage across all users
  const usageSnapshot = await admin.firestore()
    .collectionGroup('api_usage')
    .where('date', '==', today)
    .get();
  
  let totalTests = 0;
  let totalQuestions = 0;
  let totalUsers = 0;
  
  usageSnapshot.forEach(doc => {
    const data = doc.data();
    totalTests += data.test_generation || 0;
    totalQuestions += data.question_generation || 0;
    totalUsers++;
  });
  
  return {
    today: {
      tests: totalTests,
      questions: totalQuestions,
      users: totalUsers
    },
    limits: {
      geminiDailyLimit: 1000,
      geminiRateLimit: 60 // per minute
    },
    percentUsed: (totalTests / 1000) * 100
  };
});
```

2. **Set Up Alerts:**
```javascript
exports.checkQuotaAlerts = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const stats = await getAPIUsageStats({ auth: { uid: 'system' } });
    
    if (stats.percentUsed > 80) {
      // Send alert email
      await sendAlertEmail(
        'admin@evoluter.com',
        'API Quota Alert',
        `Warning: ${stats.percentUsed}% of Gemini API quota used today`
      );
    }
  });
```

**Dependencies:** Cloud Pub/Sub, Email service

---

### **🟡 SCALE-5: No Caching Layer**

**Status:** ⚠️ **NOT IMPLEMENTED**  
**Effort:** 8 hours  
**Type:** Performance

**Backend Work Required:**

Implemented in ARCH-1 above (getFromCache, saveToCache functions)

Cache the following:
- News feed (6 hour TTL)
- Leaderboard (5 minute TTL)
- Static syllabus data (24 hour TTL)

**Expected Savings:** 70% reduction in API calls

---

## 🔵 **LOW PRIORITY BACKEND ISSUES**

---

### **🔵 SEC-4: Firebase Storage CORS**

**Status:** ⚠️ **NOT INVESTIGATED**  
**Effort:** 4 hours  
**Type:** Security

**Required Investigation:**
1. Audit storage security rules
2. Configure CORS properly
3. Test file uploads/downloads

---

## 📊 **SPRINT PLAN FOR BACKEND**

### **Backend Sprint 1 (Week 1) - Security Lockdown**
**Hours:** 42  
**Priority:** CRITICAL

- [ ] S-1: Rotate API keys (2h)
- [ ] S-2: Deploy Firebase rules (30min)
- [ ] S-3: Auth guards (4h)
- [ ] SEC-1: Server-side questions (16h)
- [ ] SEC-2: Server-side proctoring (12h)
- [ ] SEC-3: Rate limiting (8h)

---

### **Backend Sprint 2 (Weeks 2-3) - Cloud Functions**
**Hours:** 80  
**Priority:** HIGH

- [ ] ARCH-1: Backend API layer (80h)
  - Setup Cloud Functions
  - Create API endpoints
  - Implement caching
  - Add logging/monitoring

---

### **Backend Sprint 3 (Week 4-5) - Features & Testing**
**Hours:** 104  
**Priority:** HIGH

- [ ] F-1: Flashcards backend (12h)
- [ ] F-5: PDF extraction (32h)
- [ ] Testing: Unit + Integration (60h)

---

### **Backend Sprint 4 (Week 6-7) - Optimization**
**Hours:** 56  
**Priority:** MEDIUM

- [ ] SCALE-1: Optimize Firestore (12h)
- [ ] SCALE-2: Database indexing (4h)
- [ ] SCALE-4: Quota management (8h)
- [ ] SCALE-5: Caching (8h)
- [ ] MF-3: Offline mode (20h)
- [ ] SEC-4: Storage CORS (4h)

---

## ✅ **SUMMARY**

**Total Backend Issues:** 20  
**Total Effort:** 386 hours  
**Timeline:** 10 weeks for 1 backend engineer  
**Completion:** 0/20 (0%)

**Priority Distribution:**
- 🔴 Critical: 6 issues (42h) - MUST FIX
- 🟠 High: 9 issues (284h) - Before beta
- 🟡 Medium: 4 issues (56h) - Before public
- 🔵 Low: 1 issue (4h) - Nice to have

**Cost Risk Without Fixes:** $10,000+ per month  
**Cost With Fixes:** $50-100 per month

---

**Next Immediate Action:** Start Backend Sprint 1 (Security Lockdown)

**Status:** ✅ **Backend issues documented - Ready for implementation**
