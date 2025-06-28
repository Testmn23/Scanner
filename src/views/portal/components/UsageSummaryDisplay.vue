<template>
  <div class="p-6 bg-white shadow-lg rounded-lg border border-gray-200">
    <h2 class="text-xl font-semibold text-gray-700 mb-4">Usage Summary</h2>
    <div v-if="isLoading" class="text-center text-gray-500">
      <p>Loading summary...</p>
    </div>
    <div v-else-if="error" class="text-center text-red-500">
      <p>Error loading summary: {{ error }}</p>
    </div>
    <div v-else-if="summary" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-4 bg-indigo-50 rounded-md shadow">
        <p class="text-sm text-indigo-700 font-medium">Active API Keys</p>
        <p class="text-3xl font-bold text-indigo-900">{{ summary.totalActiveKeys }}</p>
      </div>
      <div class="p-4 bg-green-50 rounded-md shadow">
        <p class="text-sm text-green-700 font-medium">Total Credits Remaining</p>
        <p class="text-3xl font-bold text-green-900">{{ summary.totalCreditsRemaining?.toLocaleString() }}</p>
      </div>
      <div class="p-4 bg-blue-50 rounded-md shadow">
        <p class="text-sm text-blue-700 font-medium">Total Usage (All Time)</p>
        <p class="text-3xl font-bold text-blue-900">{{ summary.totalUsageCountAllTime?.toLocaleString() }}</p>
      </div>
      <div class="p-4 bg-yellow-50 rounded-md shadow">
        <p class="text-sm text-yellow-700 font-medium">Usage (Last 30 Days)</p>
        <p class="text-3xl font-bold text-yellow-900">{{ summary.recentUsageCountLast30Days?.toLocaleString() }}</p>
      </div>
    </div>
    <div v-else class="text-center text-gray-500">
      <p>No summary data available.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getUsageSummary } from '@/services/portalApiService'; // Assuming correct path

interface UsageSummaryData {
  totalActiveKeys: number;
  totalCreditsRemaining: number;
  totalUsageCountAllTime: number;
  recentUsageCountLast30Days: number;
}

const summary = ref<UsageSummaryData | null>(null);
const isLoading = ref<boolean>(true);
const error = ref<string | null>(null);

onMounted(async () => {
  isLoading.value = true;
  error.value = null;
  try {
    summary.value = await getUsageSummary();
  } catch (err: any) {
    console.error("Failed to fetch usage summary:", err);
    error.value = err.message || "Could not load usage summary.";
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
/* Scoped styles if needed, Tailwind is used primarily */
</style>
