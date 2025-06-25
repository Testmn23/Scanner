<template>
  <div class="gate-page-container maintenance-page">
    <div class="gate-content-wrapper">
      <div class="maintenance-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-tool"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path><line x1="12" y1="12" x2="15" y2="15"></line></svg>
      </div>
      <div v-if="message" v-html="message" class="maintenance-message-content"></div>
      <div v-else class="default-maintenance-message">
        <h1>Site Under Maintenance</h1>
        <p>We are currently performing scheduled maintenance. We should be back online shortly.</p>
        <p>Thank you for your patience!</p>
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
  background-color: #e3f2fd; /* Light blue background */
  padding: 20px;
  box-sizing: border-box;
  font-family: 'Roboto', Arial, sans-serif;
  color: #212121; /* Dark gray text */
}

.gate-content-wrapper {
  background-color: #ffffff;
  padding: 40px 50px;
  border-radius: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  text-align: center;
  max-width: 700px;
  width: 100%;
}

.maintenance-icon {
  margin-bottom: 25px;
  color: #1976d2; /* Primary blue color for icon */
}

.maintenance-icon svg {
  width: 64px;
  height: 64px;
}

.maintenance-message-content :deep(h1),
.default-maintenance-message h1 {
  font-size: 2.2em;
  color: #1565c0; /* Darker blue for H1 */
  margin-bottom: 0.6em;
  font-weight: 500;
}

.maintenance-message-content :deep(p),
.default-maintenance-message p {
  font-size: 1.1em;
  line-height: 1.7;
  color: #424242; /* Slightly lighter text for paragraphs */
  margin-bottom: 1em;
}

.maintenance-message-content :deep(a) {
  color: #1976d2;
  text-decoration: none;
}

.maintenance-message-content :deep(a:hover) {
  text-decoration: underline;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .gate-content-wrapper {
    padding: 30px;
  }
  .maintenance-message-content :deep(h1),
  .default-maintenance-message h1 {
    font-size: 1.8em;
  }
  .maintenance-message-content :deep(p),
  .default-maintenance-message p {
    font-size: 1em;
  }
  .maintenance-icon svg {
    width: 50px;
    height: 50px;
  }
}
</style>
