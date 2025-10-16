<script setup>
import { ref, onMounted, onActivated } from 'vue'
import { useComponentCache } from '../composables/useComponentCache.js'

// Define component name for keep-alive
defineOptions({
  name: 'AboutView',
})

const { needsRefresh, markAsRefreshed } = useComponentCache()
const isVisible = ref(false)

const triggerAnimation = () => {
  isVisible.value = false
  setTimeout(() => {
    isVisible.value = true
  }, 100)
}

onMounted(() => {
  // Trigger animation after component is mounted
  triggerAnimation()
})

// Handle component reactivation when navigating back
onActivated(() => {
  console.log('AboutView: Component reactivated (keep-alive working!)')
  if (needsRefresh('AboutView')) {
    console.log('🔃 AboutView: Refreshing animation due to explicit refresh request')
    triggerAnimation()
    markAsRefreshed('AboutView')
  } else {
    console.log('AboutView: Using cached state (no refresh needed)')
  }
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
      <!-- Creators Card -->
      <v-col cols="12" md="4" class="card-container pa-2">
        <v-card
          class="floating-card creator-card"
          :class="{ 'animate-in': isVisible }"
          elevation="0"
        >
          <div class="card-glow"></div>
          <v-card-item class="text-center pa-6">
            <div class="creators-avatars">
              <div class="avatar-group mb-4">
                <a href="https://github.com/Hanzest" target="_blank" style="text-decoration: none">
                  <v-avatar size="60" color="primary" class="creator-avatar-item">
                    <span class="text-h6 text-white">HQK</span>
                  </v-avatar>
                </a>
                <a
                  href="https://github.com/caphefalumi"
                  target="_blank"
                  style="text-decoration: none"
                >
                  <v-avatar size="60" color="info" class="creator-avatar-item">
                    <span class="text-h6 text-white">DDT</span>
                  </v-avatar>
                </a>
                <a href="https://github.com/H1406" target="_blank" style="text-decoration: none">
                  <v-avatar size="60" color="success" class="creator-avatar-item">
                    <span class="text-h6 text-white">PLM</span>
                  </v-avatar>
                </a>
              </div>
            </div>
            <v-card-title class="card-title">
              <v-icon class="mr-2" color="primary">mdi-account-group</v-icon>
              Creators
            </v-card-title>
            <v-card-text class="card-content">
              <div class="creators-list">
                <p class="creator-name">Hồ Quốc Khánh</p>
                <p class="creator-name">Đặng Duy Toàn</p>
                <p class="creator-name">Phan Lê Minh Hiếu</p>
              </div>
              <p class="creator-description">
                A passionate team of developers dedicated to creating intuitive solutions for team
                collaboration and management.
              </p>
            </v-card-text>
          </v-card-item>
        </v-card>
      </v-col>

      <!-- Purpose Card -->
      <v-col cols="12" md="4" class="card-container pa-2">
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
      <v-col cols="12" md="4" class="card-container pa-2">
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
            Made with <v-icon color="red" class="mx-1">mdi-heart</v-icon> by our team for better
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
  background: white;
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
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="1" fill="rgba(99,102,241,0.1)"/></svg>')
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
  background-clip: text;
}

.highlight-text {
  background: linear-gradient(45deg, #667eea, #764ba2);
  background-clip: text;
  text-shadow: none;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #64748b;
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
  padding: 0;
  pointer-events: none;
}

.card-container .floating-card {
  pointer-events: auto;
}

.floating-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 2px solid rgba(131, 131, 131, 0.8);
  box-shadow: 0 8px 32px 0 rgba(99, 102, 241, 0.15);
  position: relative;
  overflow: visible;
  opacity: 0;
  transform: translateY(50px) scale(0.9);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  max-width: 350px;
  width: 100%;
  margin: 20px auto;
  cursor: pointer;
}

.floating-card.animate-in {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.floating-card:hover {
  transform: translateY(-10px) scale(1.02);
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.2);
  background: rgba(255, 255, 255, 0.8);
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
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
  color: #334155;
}

.card-content {
  font-size: 1rem;
  line-height: 1.6;
  color: #475569;
}

.creators-avatars {
  position: relative;
  padding: 5px 0;
}

.avatar-group {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px;
  margin: 0 -10px;
}

.creator-avatar-item {
  transition: transform 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.floating-card.creator-card:hover .creator-avatar-item {
  transform: scale(1.1);
}

.floating-card.creator-card:hover .creator-avatar-item:nth-child(1) {
  transform: scale(1.1) rotate(10deg);
}

.floating-card.creator-card:hover .creator-avatar-item:nth-child(2) {
  transform: scale(1.1) rotate(-5deg);
}

.floating-card.creator-card:hover .creator-avatar-item:nth-child(3) {
  transform: scale(1.1) rotate(8deg);
}

.creators-list {
  margin-bottom: 1rem;
}

.creator-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #3b82f6;
  margin-bottom: 0.3rem;
  text-shadow: 0 0 10px rgba(59, 130, 246, 0.2);
}

.creator-description {
  color: #64748b;
  font-style: italic;
  margin-top: 1rem;
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
  transition-delay: 0.5s;
}

.footer-content.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.footer-text {
  color: #64748b;
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
    margin: 20px auto 2rem auto;
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
