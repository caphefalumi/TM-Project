<template>
  <v-container
    class="notfound-container fill-height d-flex flex-column align-center justify-center text-center"
  >
    <v-row class="justify-center align-center" style="height: 100%">
      <v-col cols="12" md="8" lg="6" class="d-flex flex-column align-center justify-center">
        <h1 class="display-2 font-weight-bold mb-4">404</h1>
        <h2 class="mb-2">Page Not Found</h2>
        <p class="mb-6">Sorry, the page you are looking for does not exist or has been moved.</p>
        <v-btn color="primary" to="/" large>Go to Home</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.notfound-container {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
