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
  background: #fff;
  color: #1565c0;
  border-top: 1px solid #e3eafc;
  font-size: 14px;
  min-height: 36px;
  box-shadow: 0 -1px 8px rgba(21, 101, 192, 0.04);
}
.tm-footer-title {
  color: #1565c0;
}
.footer-link {
  color: #1976d2;
  text-decoration: none;
  transition: color 0.2s;
  font-weight: 500;
}
.footer-link:hover {
  color: #0d47a1;
  text-decoration: underline;
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
  color: #1976d2;
  font-weight: 500;
}
</style>
