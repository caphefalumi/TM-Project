<template>
  <v-footer class="tm-footer" padless>
    <v-container class="d-flex justify-space-between align-center" style="min-height: 36px">
      <div class="footer-left">
        <span class="font-weight-bold tm-footer-title">TM-Project</span>
        <span class="mx-2">|</span>
        <a href="/privacy-policy" class="footer-link">Privacy Policy</a>
        <span class="mx-2">|</span>
        <a href="/terms-of-service" class="footer-link">Terms of Service</a>
        <span class="mx-2">|</span>
        <a href="/about" class="footer-link">About</a>
      </div>
      <div class="footer-right">
        <span class="footer-status">
          <v-icon color="primary" size="18">mdi-check-circle</v-icon>
          <span class="ml-1">All systems normal.</span>
        </span>
      </div>
    </v-container>
  </v-footer>
</template>

<script setup>
// No script needed for static footer
</script>

<style scoped>
.tm-footer {
  background: #FFFFFF;
  color: #0070F3;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 14px;
  min-height: 36px;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.05);
}
.tm-footer-title {
  color: #0070F3;
  font-weight: 600;
}
.footer-link {
  color: #71717A;
  text-decoration: none;
  transition: color 0.2s ease;
  font-weight: 500;
}
.footer-link:hover {
  color: #0070F3;
  text-decoration: none;
}
.footer-left {
  display: flex;
  align-items: center;
}
.footer-right {
  display: flex;
  align-items: center;
}
.footer-status {
  display: flex;
  align-items: center;
  color: #71717A;
  font-weight: 500;
}
</style>
