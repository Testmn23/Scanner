<template>
  <div class="portal-page p-8 bg-gray-100 min-h-screen flex flex-col items-center justify-center">
    <div class="bg-white p-10 rounded-lg shadow-xl w-full max-w-md">
      <h1 class="text-3xl font-bold mb-6 text-center text-gray-700">API Portal Login</h1>
      <p class="text-center text-gray-600">Login page placeholder.</p>
      <!-- Login form will go here -->
      <div class="mt-6 text-center">
        <button @click="goToSignup" class="text-indigo-600 hover:text-indigo-800 text-sm">
          Don't have an account? Sign Up
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
function goToSignup() {
  if ((window as any).globalAppState) {
    (window as any).globalAppState.currentView = 'portal-signup';
    window.location.hash = '/portal/signup';
  } else {
    alert("Portal state not available for navigation.");
  }
}
</script>

<style scoped>
.portal-page {
  /* Basic styling for now */
}
</style>
