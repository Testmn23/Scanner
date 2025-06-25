<template>
  <div class="gate-page-container custom-message-page">
    <div class="gate-content-wrapper">
      <div v-if="message" v-html="message" class="custom-html-content"></div>
      <div v-else class="empty-message">
        <p>This page is intentionally blank.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message?: string;
}>();
</script>

<style scoped>
.gate-page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  background-color: #f0f2f5; /* Light gray background */
  padding: 20px;
  box-sizing: border-box;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  color: #333; /* Darker text for readability */
}

.gate-content-wrapper {
  background-color: #ffffff; /* White content box */
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); /* Softer shadow */
  text-align: center;
  max-width: 800px;
  width: 100%;
}

.custom-html-content :deep(h1) {
  font-size: 2.5em;
  color: #1a237e; /* Indigo H1 */
  margin-bottom: 0.5em;
}

.custom-html-content :deep(p) {
  font-size: 1.1em;
  line-height: 1.6;
  color: #555;
  margin-bottom: 1em;
}

.custom-html-content :deep(a) {
  color: #3949ab; /* Indigo link */
  text-decoration: none;
}

.custom-html-content :deep(a:hover) {
  text-decoration: underline;
}

.empty-message p {
  font-size: 1.2em;
  color: #777;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .gate-content-wrapper {
    padding: 30px;
  }
  .custom-html-content :deep(h1) {
    font-size: 2em;
  }
  .custom-html-content :deep(p) {
    font-size: 1em;
  }
}
</style>
