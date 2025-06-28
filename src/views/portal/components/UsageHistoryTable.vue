<template>
  <div class="p-6 bg-white shadow-lg rounded-lg border border-gray-200 mt-8">
    <h2 class="text-xl font-semibold text-gray-700 mb-4">Usage History</h2>

    <!-- Filters -->
    <div class="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
      <div>
        <label for="apiKeyIdFilter" class="block text-sm font-medium text-gray-700 mb-1">Filter by API Key ID:</label>
        <input
          type="text"
          id="apiKeyIdFilter"
          v-model="filters.apiKeyId"
          placeholder="Enter API Key ID"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label for="startDateFilter" class="block text-sm font-medium text-gray-700 mb-1">Start Date:</label>
        <input
          type="date"
          id="startDateFilter"
          v-model="filters.startDate"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label for="endDateFilter" class="block text-sm font-medium text-gray-700 mb-1">End Date:</label>
        <input
          type="date"
          id="endDateFilter"
          v-model="filters.endDate"
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <button
        @click="applyFilters"
        class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm h-10">
        Apply Filters
      </button>
    </div>

    <div v-if="isLoading" class="text-center text-gray-500 py-4">
      <p>Loading usage history...</p>
    </div>
    <div v-else-if="error" class="text-center text-red-500 py-4">
      <p>Error loading usage history: {{ error }}</p>
    </div>
    <div v-else-if="history && history.logs.length > 0">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">API Key (Start)</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits Consumed</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="log in history.logs" :key="log.logId">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ formatTimestamp(log.timestamp) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{{ log.apiKey.substring(0, 12) }}...</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ log.endpoint }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span :class="statusBadgeClass(log.status)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                  {{ log.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{{ log.creditsConsumed }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div class="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
        <div class="text-sm text-gray-700">
          Page {{ history.pagination.currentPage }} of {{ history.pagination.totalPages }} (Total: {{ history.pagination.totalCount }} logs)
        </div>
        <div class="flex gap-2">
          <button
            @click="changePage(history.pagination.currentPage - 1)"
            :disabled="history.pagination.currentPage <= 1 || isLoading"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
            Previous
          </button>
          <button
            @click="changePage(history.pagination.currentPage + 1)"
            :disabled="history.pagination.currentPage >= history.pagination.totalPages || isLoading"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
            Next
          </button>
        </div>
      </div>
    </div>
    <div v-else class="text-center text-gray-500 py-4">
      <p>No usage history found for the selected criteria.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue';
import { getUsageHistory } from '@/services/portalApiService';

interface UsageLog {
  logId: string;
  apiKey: string;
  timestamp: string | null;
  endpoint: string;
  status: string;
  creditsConsumed: number;
  ipAddress?: string;
  userAgent?: string;
}

interface UsageHistoryData {
  logs: UsageLog[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

const history = ref<UsageHistoryData | null>(null);
const isLoading = ref<boolean>(true);
const error = ref<string | null>(null);

const filters = reactive({
  apiKeyId: '',
  startDate: '',
  endDate: '',
  page: 1,
  limit: 10,
});

async function fetchHistory() {
  isLoading.value = true;
  error.value = null;
  try {
    const params: any = { page: filters.page, limit: filters.limit };
    if (filters.apiKeyId) params.apiKeyId = filters.apiKeyId;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    history.value = await getUsageHistory(params);
  } catch (err: any) {
    console.error("Failed to fetch usage history:", err);
    error.value = err.message || "Could not load usage history.";
    history.value = null; // Clear previous history on error
  } finally {
    isLoading.value = false;
  }
}

function applyFilters() {
  filters.page = 1; // Reset to first page when applying new filters
  fetchHistory();
}

function changePage(newPage: number) {
  if (newPage < 1 || (history.value && newPage > history.value.pagination.totalPages)) {
    return;
  }
  filters.page = newPage;
  fetchHistory();
}

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleString();
}

function statusBadgeClass(status: string): string {
  if (status === 'success') {
    return 'bg-green-100 text-green-800';
  } else if (status.startsWith('failure_')) {
    return 'bg-red-100 text-red-800';
  }
  return 'bg-gray-100 text-gray-800';
}

onMounted(fetchHistory);

// Optional: Watch filters to refetch, though manual apply is often better UX for multiple filter changes
// watch(filters, fetchHistory, { deep: true });
</script>

<style scoped>
/* Tailwind utility classes are used directly in the template */
</style>
