<template>
  <v-btn
    class="login-btn"
    block
    elevation="1"
    :loading="loading"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <v-icon v-if="!loading" left class="me-2 google-icon" color="#EA4335"></v-icon>
    <span>{{ loading ? 'Logging in...' : `Login with ${providerName}` }}</span>
  </v-btn>
</template>

<script>
export default {
  name: 'vIconLogin',
  props: {
    provider: {
      type: String,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    providerName() {
      return this.provider.charAt(0).toUpperCase() + this.provider.slice(1)
    },
  },
}
</script>

<style scoped>
.login-btn {
  background-color: #fff;
  color: rgba(0, 0, 0, 0.54);
  border: 1px solid #ddd;
  text-transform: none;
  font-weight: 500;
  font-size: 14px;
  border-radius: 6px; /* Rectangle corners */
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto; /* Center horizontally */
  width: 100%;
  max-width: 320px;
}
.login-btn-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin: 0 auto;
}
.google-icon {
  background-image: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMTcuNiA5LjJsLS4xLTEuOEg5djMuNGg0LjhDMTMuNiAxMiAxMyAxMyAxMiAxMy42djIuMmgzYTguOCA4LjggMCAwIDAgMi42LTYuNnoiIGZpbGw9IiM0Mjg1RjQiIGZpbGwtcnVsZT0ibm9uemVybyIvPjxwYXRoIGQ9Ik05IDE4YzIuNCAwIDQuNS0uOCA2LTIuMmwtMy0yLjJhNS40IDUuNCAwIDAgMS04LTIuOUgxVjEzYTkgOSAwIDAgMCA4IDV6IiBmaWxsPSIjMzRBODUzIiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNNCAxMC43YTUuNCA1LjQgMCAwIDEgMC0zLjRWNUgxYTkgOSAwIDAgMCAwIDhsMy0yLjN6IiBmaWxsPSIjRkJCQzA1IiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNOSAzLjZjMS4zIDAgMi41LjQgMy40IDEuM0wxNSAyLjNBOSA5IDAgMCAwIDEgNWwzIDIuNGE1LjQgNS40IDAgMCAxIDUtMy43eiIgZmlsbD0iI0VBNDMzNSIgZmlsbC1ydWxlPSJub256ZXJvIi8+PHBhdGggZD0iTTAgMGgxOHYxOEgweiIvPjwvZz48L3N2Zz4=);
  background-color: white;
  background-repeat: no-repeat;
}
</style>
