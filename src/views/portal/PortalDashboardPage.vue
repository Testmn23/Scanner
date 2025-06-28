<template>
  <div class="portal-page p-8 bg-gray-50 min-h-screen">
    <header class="bg-white shadow-md p-4 mb-8 rounded-lg">
      <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-semibold text-gray-700">API Key Dashboard</h1>
        <button @click="logout" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
          Logout (Placeholder)
        </button>
      </div>
    </header>

    <main class="container mx-auto space-y-8">
      <UsageSummaryDisplay />

      <div>
        <h2 class="text-xl font-semibold text-gray-700 mb-4">API Key Management</h2>
        <p class="text-gray-600">Placeholder for API Key list, create button, etc.</p>
        <!-- API Key Management components will go here -->
      </div>

      <UsageHistoryTable />

    </main>
  </div>
</template>

<script setup lang="ts">
import UsageSummaryDisplay from './components/UsageSummaryDisplay.vue';
import UsageHistoryTable from './components/UsageHistoryTable.vue';

// Placeholder for logout, will be replaced by useAuth composable later
function logout() {
  alert("Logout (placeholder function)");
  if ((window as any).globalAppState) {
    (window as any).globalAppState.currentView = 'portal-login'; // Navigate to login
    window.location.hash = '/portal/login';
  }
}
</script>

<style scoped>
.portal-page {
  /* Basic styling for now */
}
</style>
