<script setup>
import { ref, onMounted } from 'vue'

const isVisible = ref(false)

onMounted(() => {
  // Trigger animation after component is mounted
  setTimeout(() => {
    isVisible.value = true
  }, 100)
})
</script>

<template>
  <v-container fluid class="about-container">
    <!-- Hero Section -->
    <v-row justify="center" class="hero-section">
      <v-col cols="12" class="text-center">
        <div class="hero-content" :class="{ 'animate-in': isVisible }">
          <h1 class="hero-title">
            <span class="highlight-text">Teams Management</span>
          </h1>
          <p class="hero-subtitle">Empowering collaboration, one team at a time</p>
        </div>
      </v-col>
    </v-row>

    <!-- Cards Section -->
    <v-row justify="center" class="cards-section">
      <!-- Creator Card -->
      <v-col cols="12" md="4" class="card-container">
        <v-card
          class="floating-card creator-card"
          :class="{ 'animate-in': isVisible }"
          elevation="0"
        >
          <div class="card-glow"></div>
          <v-card-item class="text-center pa-6">
            <div class="creator-avatar">
              <v-avatar size="80" color="primary" class="mb-4">
                <span class="text-h4 text-white">HQK</span>
              </v-avatar>
            </div>
            <v-card-title class="card-title">
              <v-icon class="mr-2" color="primary">mdi-account-star</v-icon>
              Creator
            </v-card-title>
            <v-card-text class="card-content">
              <p class="creator-name">Hồ Quốc Khánh</p>
              <p class="creator-description">
                Passionate developer dedicated to creating intuitive solutions for team
                collaboration and management.
              </p>
            </v-card-text>
          </v-card-item>
        </v-card>
      </v-col>

      <!-- Purpose Card -->
      <v-col cols="12" md="4" class="card-container">
        <v-card
          class="floating-card purpose-card"
          :class="{ 'animate-in': isVisible }"
          elevation="0"
        >
          <div class="card-glow"></div>
          <v-card-item class="text-center pa-6">
            <div class="purpose-icon">
              <v-icon size="60" color="success" class="mb-4">mdi-target</v-icon>
            </div>
            <v-card-title class="card-title">
              <v-icon class="mr-2" color="success">mdi-lightbulb</v-icon>
              Purpose
            </v-card-title>
            <v-card-text class="card-content">
              <p class="purpose-description">
                To support team management for everyone with a user-friendly interface that makes
                collaboration effortless and enjoyable.
              </p>
              <div class="feature-list">
                <v-chip color="success" variant="outlined" size="small" class="ma-1">
                  <v-icon start size="small">mdi-check</v-icon>
                  User-Friendly
                </v-chip>
                <v-chip color="success" variant="outlined" size="small" class="ma-1">
                  <v-icon start size="small">mdi-check</v-icon>
                  Collaborative
                </v-chip>
                <v-chip color="success" variant="outlined" size="small" class="ma-1">
                  <v-icon start size="small">mdi-check</v-icon>
                  Efficient
                </v-chip>
              </div>
            </v-card-text>
          </v-card-item>
        </v-card>
      </v-col>

      <!-- Support Card -->
      <v-col cols="12" md="4" class="card-container">
        <v-card
          class="floating-card support-card"
          :class="{ 'animate-in': isVisible }"
          elevation="0"
        >
          <div class="card-glow"></div>
          <v-card-item class="text-center pa-6">
            <div class="support-icon">
              <v-icon size="60" color="warning" class="mb-4">mdi-heart</v-icon>
            </div>
            <v-card-title class="card-title">
              <v-icon class="mr-2" color="warning">mdi-gift</v-icon>
              Support Us
            </v-card-title>
            <v-card-text class="card-content">
              <p class="support-description">
                Help us continue improving and maintaining this platform. Your support means the
                world to us!
              </p>
              <v-btn
                href="https://google.com"
                target="_blank"
                color="warning"
                variant="elevated"
                class="donate-btn"
                prepend-icon="mdi-coffee"
              >
                Donate Now
              </v-btn>
            </v-card-text>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>

    <!-- Footer Section -->
    <v-row justify="center" class="footer-section">
      <v-col cols="12" class="text-center">
        <div class="footer-content" :class="{ 'animate-in': isVisible }">
          <p class="footer-text">
            Made with <v-icon color="red" class="mx-1">mdi-heart</v-icon> for better team
            collaboration
          </p>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
/* Container Styles */
.about-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #040506 0%, #4f0896 100%);
  padding: 2rem 0;
  position: relative;
  overflow: hidden;
}

.about-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></svg>')
    repeat;
  background-size: 50px 50px;
  animation: float 20s infinite linear;
  pointer-events: none;
}

@keyframes float {
  0% {
    transform: translateY(0px);
  }
  100% {
    transform: translateY(-100px);
  }
}

/* Hero Section */
.hero-section {
  margin-bottom: 4rem;
  position: relative;
  z-index: 1;
}

.hero-content {
  opacity: 0;
  transform: translateY(-50px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-content.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.gradient-text {
  background: linear-gradient(45deg, #fff, #e3f2fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.highlight-text {
  color: #ffeb3b;
  text-shadow: 0 0 20px rgba(255, 235, 59, 0.5);
}

.hero-subtitle {
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 300;
  letter-spacing: 1px;
}

/* Cards Section */
.cards-section {
  position: relative;
  z-index: 1;
  margin-bottom: 4rem;
}

.card-container {
  display: flex;
  justify-content: center;
}

.floating-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  position: relative;
  overflow: hidden;
  opacity: 0;
  transform: translateY(50px) scale(0.9);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  max-width: 350px;
  width: 100%;
}

.floating-card.animate-in {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.floating-card:hover {
  transform: translateY(-10px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.floating-card:hover .card-glow {
  opacity: 1;
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.95);
}

.card-content {
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.9);
}

/* Creator Card Specific */
.creator-card:nth-child(1) {
  transition-delay: 0.1s;
}

.creator-avatar {
  position: relative;
}

.creator-avatar .v-avatar {
  transition: transform 0.3s ease;
}

.creator-card:hover .creator-avatar .v-avatar {
  transform: rotate(360deg);
}

.creator-name {
  font-size: 1.3rem;
  font-weight: 600;
  color: #64b5f6;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 10px rgba(100, 181, 246, 0.3);
}

.creator-description {
  color: rgba(255, 255, 255, 0.9);
  font-style: italic;
}

/* Purpose Card Specific */
.purpose-card:nth-child(2) {
  transition-delay: 0.2s;
}

.purpose-icon .v-icon {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.purpose-description {
  font-weight: 500;
  margin-bottom: 1rem;
}

.feature-list {
  margin-top: 1rem;
}

/* Support Card Specific */
.support-card:nth-child(3) {
  transition-delay: 0.2s;
}

.support-icon .v-icon {
  animation: heartbeat 1.5s infinite;
}

@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.support-description {
  margin-bottom: 1.5rem;
  font-weight: 500;
}

.donate-btn {
  font-weight: 600;
  border-radius: 50px;
  padding: 0 2rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 193, 7, 0.4);
}

.donate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 193, 7, 0.6);
}

/* Footer Section */
.footer-section {
  position: relative;
  z-index: 1;
}

.footer-content {
  opacity: 0;
  transform: translateY(30px);
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.8s;
}

.footer-content.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.footer-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  font-weight: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
  }

  .cards-section {
    margin-bottom: 2rem;
  }

  .floating-card {
    margin-bottom: 2rem;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .about-container {
    padding: 1rem 0;
  }
}
</style>
