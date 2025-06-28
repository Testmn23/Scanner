<template>
  <div class="portal-page p-4 sm:p-8 bg-gray-50 min-h-screen">
    <header class="bg-white shadow-md p-4 mb-8 rounded-lg">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-semibold text-gray-700">My Profile</h1>
        <div>
          <button @click="goToDashboard" class="text-indigo-600 hover:text-indigo-800 text-sm font-medium mr-4">
            &larr; Back to Dashboard
          </button>
          <button @click="performLogout" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md text-sm">
            Logout
          </button>
        </div>
      </div>
    </header>

    <main class="container mx-auto">
      <div v-if="authLoading" class="text-center p-10">
        <p class="text-gray-600">Loading profile...</p>
      </div>
      <div v-else-if="!currentUser" class="text-center p-10">
        <p class="text-red-500">Not authenticated. Please login.</p>
         <button @click="goToLogin" class="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
            Go to Login
        </button>
      </div>
      <div v-else class="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-2xl mx-auto">
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700">Email</label>
          <p class="mt-1 text-lg text-gray-800 bg-gray-100 p-3 rounded-md">{{ currentUser.email }}</p>
        </div>

        <form @submit.prevent="handleUpdateDisplayName">
          <div class="mb-6">
            <label for="displayName" class="block text-sm font-medium text-gray-700">Display Name</label>
            <input
              type="text"
              id="displayName"
              v-model="editableDisplayName"
              class="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              :disabled="isUpdating"
              placeholder="Enter your display name"
            />
          </div>

          <div class="flex items-center justify-end">
            <button
              type="submit"
              :disabled="isUpdating || !isDisplayNameChanged"
              class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md shadow-sm disabled:opacity-50 flex items-center"
            >
              <svg v-if="isUpdating" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isUpdating ? 'Saving...' : 'Save Display Name' }}
            </button>
          </div>
        </form>

        <div v-if="updateMessage" :class="['mt-4 text-sm p-3 rounded-md', updateStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700']">
          {{ updateMessage }}
        </div>

        <hr class="my-8">

        <div>
            <h3 class="text-md font-semibold text-gray-700 mb-2">Change Password</h3>
            <p class="text-sm text-gray-600 mb-3">
                To change your password, we'll use Firebase's built-in functionality.
                This often requires you to have logged in recently.
            </p>
            <button
                @click="handleChangePassword"
                :disabled="isUpdatingPassword"
                class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md text-sm disabled:opacity-50"
            >
                 {{ isUpdatingPassword ? 'Processing...' : 'Change Password' }}
            </button>
             <div v-if="passwordUpdateMessage" :class="['mt-3 text-sm p-3 rounded-md', passwordUpdateStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700']">
                {{ passwordUpdateMessage }}
            </div>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { updateUserDisplayName as apiUpdateDisplayName } from '@/services/portalApiService';

// Placeholder for client-side Firebase Auth password change (retained from previous version)
async function clientSdkChangePassword(authInstance: any, email: string): Promise<void> {
    if(!authInstance || !authInstance.currentUser) {
        throw new Error("User not authenticated for password change.");
    }
    try {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(authInstance, email);
    } catch (e: any) {
        console.error("Error sending password reset email:", e);
        throw new Error(e.message || "Could not send password reset email.");
    }
}

const {
  user: currentUser,
  isLoadingAuth: authLoading,
  logoutUser,
  getIdToken,
  updateClientSideUserProfile
} = useAuth();
const editableDisplayName = ref('');
const isUpdating = ref(false);
const updateMessage = ref('');
const updateStatus = ref<'success' | 'error' | ''>('');

const isUpdatingPassword = ref(false);
const passwordUpdateMessage = ref('');
const passwordUpdateStatus = ref<'success' | 'error' | ''>('');


watch(currentUser, (newUser) => {
  if (newUser) {
    editableDisplayName.value = newUser.displayName || newUser.email || '';
  } else {
    editableDisplayName.value = '';
  }
}, { immediate: true });

const isDisplayNameChanged = computed(() => {
  if (!currentUser.value) return false;
  return editableDisplayName.value.trim() !== (currentUser.value.displayName || currentUser.value.email || '').trim();
});

async function handleUpdateDisplayName() {
  if (!currentUser.value || !isDisplayNameChanged.value) return;

  isUpdating.value = true;
  updateMessage.value = '';
  updateStatus.value = '';
  try {
    const newName = editableDisplayName.value.trim();
    const response = await apiUpdateDisplayName(newName); // Call backend

    // Update client-side Firebase Auth profile and local reactive state
    await updateClientSideUserProfile({ displayName: newName });
    // The onAuthStateChanged listener in useAuth should also pick up this change eventually
    // or reflect it if updateClientSideUserProfile updates the reactive user ref directly.

    updateMessage.value = response.message || "Display name updated successfully!";
    updateStatus.value = 'success';

    // Optionally, refresh ID token if display name changes are critical in fresh tokens immediately
    // await getIdToken(true);
    // Usually, onAuthStateChanged or direct update by updateClientSideUserProfile is enough for UI.

  } catch (err: any) {
    updateMessage.value = err.message || "An error occurred while updating display name.";
    updateStatus.value = 'error';
  } finally {
    isUpdating.value = false;
  }
}

async function handleChangePassword() {
    if (!currentUser.value || !currentUser.value.email) {
        passwordUpdateMessage.value = "User email not found. Cannot send reset link.";
        passwordUpdateStatus.value = 'error';
        return;
    }
    isUpdatingPassword.value = true;
    passwordUpdateMessage.value = '';
    passwordUpdateStatus.value = '';
    try {
        const { auth: firebaseClientAuthInstance } = await import('@/lib/firebase-client');
        await clientSdkChangePassword(firebaseClientAuthInstance, currentUser.value.email);
        passwordUpdateMessage.value = "Password reset email sent successfully! Please check your inbox.";
        passwordUpdateStatus.value = 'success';
    } catch (err: any) {
        passwordUpdateMessage.value = err.message || "Failed to send password reset email.";
        passwordUpdateStatus.value = 'error';
    } finally {
        isUpdatingPassword.value = false;
    }
}


// Placeholder navigation functions
function goToDashboard() {
  if ((window as any).globalAppState) {
    (window as any).globalAppState.currentView = 'portal-dashboard';
    window.location.hash = '/portal/dashboard';
  }
}
function goToLogin() {
  if ((window as any).globalAppState) {
    (window as any).globalAppState.currentView = 'portal-login';
    window.location.hash = '/portal/login';
  }
}
async function performLogout() {
    try {
        await logoutUser();
        goToLogin(); // Navigate to login after logout
    } catch (e) {
        console.error("Logout failed on profile page", e);
        // Handle error, maybe show a message
    }
}

// Ensure auth listener is active
onMounted(() => {
    // The useAuth composable initializes its listener on import.
    // If direct navigation to profile page happens and user is not logged in,
    // this component will show "Not authenticated".
    // If user becomes authenticated while on this page, the watcher on `currentUser` updates `editableDisplayName`.
});
</script>

<style scoped>
/* Tailwind utility classes are used directly in the template */
</style>
