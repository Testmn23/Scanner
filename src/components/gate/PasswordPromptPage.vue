<template>
  <div class="gate-page-container password-prompt-page">
    <div class="gate-content-wrapper">
      <div class="password-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-shield"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        <h2>Access Restricted</h2>
      </div>

      <p v-if="!isLockedOut" class="prompt-message">
        This area is password protected. Please enter the password to proceed.
      </p>
      <p v-if="isLockedOut" class="lockout-message error-message">
        Too many incorrect attempts. Please try again in {{ Math.ceil(lockoutTimeRemaining / 1000) }} seconds.
      </p>

      <form @submit.prevent="checkPassword" class="password-form">
        <input
          v-model="enteredPassword"
          type="password"
          placeholder="Enter password"
          :disabled="isLockedOut"
          class="password-input"
          aria-label="Password"
        />
        <button type="submit" :disabled="isLockedOut || isLoading" class="submit-button">
          <span v-if="isLoading">
            <svg class="animate-spin h-5 w-5 mr-2 inline" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.75V6.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17.1266 6.87347L16.0659 7.93413" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M19.25 12L17.75 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M17.1266 17.1265L16.0659 16.0659" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 17.75V19.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.87347 17.1265L7.93413 16.0659" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4.75 12L6.25 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6.87347 6.87347L7.93413 7.93413" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
            Verifying...
          </span>
          <span v-else>Unlock</span>
        </button>
      </form>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  correctPassword?: string;
  config?: any; // Full config object
}>();

const emit = defineEmits(['authComplete']);

const enteredPassword = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const attempts = ref(0);
const isLockedOut = ref(false);
const lockoutEndTime = ref(0);
const lockoutTimeRemaining = ref(0);
let lockoutInterval: number | undefined;

const loadStateFromLocalStorage = () => {
  const storedAttempts = localStorage.getItem('passwordAttempts');
  if (storedAttempts) {
    attempts.value = parseInt(storedAttempts, 10);
  }

  const storedLockoutEndTime = localStorage.getItem('passwordLockoutEndTime');
  if (storedLockoutEndTime) {
    lockoutEndTime.value = parseInt(storedLockoutEndTime, 10);
    if (Date.now() < lockoutEndTime.value) {
      isLockedOut.value = true;
      startLockoutTimer();
    } else {
      // Lockout expired, clear it
      localStorage.removeItem('passwordAttempts');
      localStorage.removeItem('passwordLockoutEndTime');
      attempts.value = 0;
    }
  }
};

const saveStateToLocalStorage = () => {
  localStorage.setItem('passwordAttempts', attempts.value.toString());
  if (isLockedOut.value && lockoutEndTime.value > 0) {
    localStorage.setItem('passwordLockoutEndTime', lockoutEndTime.value.toString());
  }
};

const startLockoutTimer = () => {
  if (lockoutInterval) clearInterval(lockoutInterval);

  const updateRemainingTime = () => {
    const remaining = lockoutEndTime.value - Date.now();
    if (remaining <= 0) {
      isLockedOut.value = false;
      lockoutTimeRemaining.value = 0;
      attempts.value = 0; // Reset attempts after lockout
      localStorage.removeItem('passwordAttempts');
      localStorage.removeItem('passwordLockoutEndTime');
      if (lockoutInterval) clearInterval(lockoutInterval);
      errorMessage.value = 'Lockout ended. You can try again.';
    } else {
      lockoutTimeRemaining.value = remaining;
    }
  };

  updateRemainingTime(); // Initial call
  lockoutInterval = setInterval(updateRemainingTime, 1000);
};


const checkPassword = async () => {
  if (isLockedOut.value) {
    errorMessage.value = `You are locked out. Please try again in ${Math.ceil(lockoutTimeRemaining.value / 1000)} seconds.`;
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  // Simulate network delay for effect
  await new Promise(resolve => setTimeout(resolve, 500));

  if (enteredPassword.value === props.correctPassword) {
    errorMessage.value = '';
    attempts.value = 0; // Reset attempts on success
    localStorage.removeItem('passwordAttempts');
    localStorage.removeItem('passwordLockoutEndTime');
    // emit('passwordSuccess'); // Old emit
    if (props.config && props.config.isMaintenanceModeEnabled) {
      emit('authComplete', 'maintenance');
    } else {
      emit('authComplete', 'app');
    }
  } else {
    attempts.value++;
    saveStateToLocalStorage();
    if (attempts.value >= MAX_ATTEMPTS) {
      isLockedOut.value = true;
      lockoutEndTime.value = Date.now() + LOCKOUT_DURATION_MS;
      saveStateToLocalStorage();
      startLockoutTimer();
      errorMessage.value = `Incorrect password. Too many attempts. You are locked out for ${LOCKOUT_DURATION_MS / 60000} minutes.`;
    } else {
      errorMessage.value = `Incorrect password. ${MAX_ATTEMPTS - attempts.value} attempts remaining.`;
    }
  }
  isLoading.value = false;
  enteredPassword.value = ''; // Clear input field
};

onMounted(() => {
  loadStateFromLocalStorage();
});

onUnmounted(() => {
  if (lockoutInterval) clearInterval(lockoutInterval);
});

</script>

<style scoped>
.gate-page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); /* Purple gradient */
  padding: 20px;
  box-sizing: border-box;
  font-family: 'Montserrat', sans-serif;
}

.gate-content-wrapper {
  background-color: rgba(255, 255, 255, 0.95); /* Slightly transparent white */
  padding: 30px 40px;
  border-radius: 16px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
  text-align: center;
  max-width: 450px;
  width: 100%;
  backdrop-filter: blur(10px); /* Frosted glass effect for supporting browsers */
}

.password-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
  color: #4a5568; /* Slate gray */
}

.password-header svg {
  color: #5a67d8; /* Indigo */
  margin-bottom: 10px;
}

.password-header h2 {
  font-size: 1.8em;
  font-weight: 600;
  color: #2d3748; /* Darker slate */
}

.prompt-message, .lockout-message {
  font-size: 0.95em;
  color: #4a5568; /* Slate gray */
  margin-bottom: 25px;
  line-height: 1.5;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.password-input {
  padding: 14px 18px;
  border: 1px solid #cbd5e0; /* Light gray border */
  border-radius: 8px;
  font-size: 1em;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  color: #2d3748;
}

.password-input:focus {
  border-color: #5a67d8; /* Indigo */
  box-shadow: 0 0 0 3px rgba(90, 103, 216, 0.2);
}

.password-input::placeholder {
  color: #a0aec0; /* Lighter gray for placeholder */
}

.submit-button {
  padding: 14px 20px;
  background: #5a67d8; /* Indigo */
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-button:hover:not(:disabled) {
  background: #4c51bf; /* Darker indigo */
}

.submit-button:active:not(:disabled) {
  transform: translateY(1px);
}

.submit-button:disabled {
  background-color: #a0aec0; /* Light gray when disabled */
  cursor: not-allowed;
}

.error-message {
  color: #c53030; /* Red for errors */
  font-size: 0.9em;
  margin-top: 15px;
  min-height: 1.2em; /* Reserve space to prevent layout shifts */
}

.lockout-message {
  color: #dd6b20; /* Orange for lockout warning */
  font-weight: 500;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .gate-content-wrapper {
    padding: 25px 30px;
  }
  .password-header h2 {
    font-size: 1.6em;
  }
  .password-input, .submit-button {
    font-size: 0.95em;
  }
}
</style>
