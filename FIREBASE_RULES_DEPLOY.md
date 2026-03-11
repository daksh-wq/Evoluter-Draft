# 🔒 Deploying Firebase Security Rules

To fix "Permission Denied" errors in production/live environments, you MUST deploy the security rules. Local changes to `firestore.rules` and `storage.rules` do not automatically apply to the cloud project.

## Prerequisites
- Firebase CLI installed (`npm install -g firebase-tools`)
- Logged in to Firebase (`firebase login`)
- Access to project `evoluter-53ba7`

## Deployment Steps

1.  **Check your rules locally**:
    Ensure `firestore.rules` and `storage.rules` in your project root are correct.

2.  **Deploy Firestore Rules**:
    ```bash
    firebase deploy --only firestore:rules
    ```

3.  **Deploy Storage Rules**:
    ```bash
    firebase deploy --only storage
    ```

## Verification
After deployment, wait 1-2 minutes and try the action (e.g., document upload) again in the deployed app or local app connected to the live project.
