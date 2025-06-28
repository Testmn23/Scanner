import { ref, readonly } from 'vue';
import { auth as firebaseClientAuth } from '@/lib/firebase-client'; // Assuming this is where initialized firebase.auth.Auth is
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
  getIdToken as getFirebaseIdToken
} from 'firebase/auth';

// Define interfaces for user and auth state
interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  // Add other relevant fields from FirebaseUser if needed
}

const user = ref<AppUser | null>(null);
const idToken = ref<string | null>(null);
const isLoadingAuth = ref<boolean>(true); // Starts true until first auth state check
const authError = ref<string | null>(null);

// --- Placeholder for API service to call backend signup ---
// This would typically be in a separate apiService.ts but included here for simplicity of this step
async function backendSignup(email: string, password: string, displayName?: string) {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Signup failed');
  }
  return response.json();
}
// --- End Placeholder ---


// Initialize Auth Listener
let unsubscribeAuthStateListener: (() => void) | null = null;

const initializeAuthListener = () => {
  if (unsubscribeAuthStateListener) {
    unsubscribeAuthStateListener(); // Unsubscribe from previous listener if any
  }
  isLoadingAuth.value = true;
  authError.value = null;

  unsubscribeAuthStateListener = onAuthStateChanged(firebaseClientAuth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      user.value = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      };
      try {
        idToken.value = await getFirebaseIdToken(firebaseUser);
      } catch (e) {
        console.error("Error getting ID token:", e);
        idToken.value = null;
        authError.value = "Failed to retrieve session token.";
        // Potentially sign out user if token cannot be fetched
        await logoutUser(); // Or handle more gracefully
      }
    } else {
      user.value = null;
      idToken.value = null;
    }
    isLoadingAuth.value = false;
  }, (error) => {
    console.error("Auth state listener error:", error);
    authError.value = "Authentication monitoring error.";
    user.value = null;
    idToken.value = null;
    isLoadingAuth.value = false;
  });
};

// Call initializeAuthListener when this composable is first imported/used.
// This is a common pattern, or it can be called explicitly from App.vue or a layout.
initializeAuthListener();


// Login function
async function loginWithEmailPassword(email: string, password: string): Promise<void> {
  isLoadingAuth.value = true;
  authError.value = null;
  try {
    await signInWithEmailAndPassword(firebaseClientAuth, email, password);
    // onAuthStateChanged will handle setting user and idToken
  } catch (error: any) {
    console.error("Login error:", error);
    authError.value = error.message || "Login failed. Please check your credentials.";
    // Ensure isLoadingAuth is set to false even on error
    isLoadingAuth.value = false;
    throw error; // Re-throw for the component to handle
  }
  // isLoadingAuth will be set to false by onAuthStateChanged
}

// Signup function (calls backend)
async function signupViaBackend(email: string, password: string, displayName?: string): Promise<any> {
  isLoadingAuth.value = true;
  authError.value = null;
  try {
    // This function now directly calls the backend.
    // After backend signup, user usually needs to login separately unless backend returns a token.
    // Our backend signup does not auto-login or return a client-side session token.
    const result = await backendSignup(email, password, displayName);
    isLoadingAuth.value = false;
    return result;
  } catch (error: any) {
    console.error("Signup error:", error);
    authError.value = error.message || "Signup failed.";
    isLoadingAuth.value = false;
    throw error; // Re-throw for the component to handle
  }
}

// Logout function
async function logoutUser(): Promise<void> {
  isLoadingAuth.value = true;
  authError.value = null;
  try {
    await signOut(firebaseClientAuth);
    // onAuthStateChanged will handle clearing user and idToken
  } catch (error: any) {
    console.error("Logout error:", error);
    authError.value = error.message || "Logout failed.";
    throw error; // Re-throw for the component to handle
  } finally {
    // Ensure isLoadingAuth is set to false even if signOut is quick or errors out
    // though onAuthStateChanged should set it correctly when user becomes null.
    isLoadingAuth.value = false;
  }
}

// Function to get current ID token
async function getIdToken(forceRefresh: boolean = false): Promise<string | null> {
  if (!firebaseClientAuth.currentUser) {
    return null;
  }
  try {
    const token = await getFirebaseIdToken(firebaseClientAuth.currentUser, forceRefresh);
    idToken.value = token; // Keep our reactive ref updated
    return token;
  } catch (error) {
    console.error("Error refreshing ID token:", error);
    // Potentially handle token refresh failure, e.g., by logging out the user
    await logoutUser();
    return null;
  }
}

// Export read-only versions of reactive state and methods
export function useAuth() {
  return {
    user: readonly(user),
    idToken: readonly(idToken),
    isLoadingAuth: readonly(isLoadingAuth),
    authError: readonly(authError),
    initializeAuthListener, // Expose if manual re-init is needed, though it runs on import.
    loginWithEmailPassword,
    signupViaBackend, // Changed from signupWithEmailPassword to reflect it calls backend
    logoutUser,
    getIdToken,
  };
}
