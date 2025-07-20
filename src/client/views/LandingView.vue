<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isVisible = ref(false)

onMounted(() => {
  // Trigger animations after component is mounted
  setTimeout(() => {
    isVisible.value = true
  }, 100)
})

const navigateToLogin = () => {
  router.push('/login')
}

const features = [
  {
    icon: 'mdi-account-group',
    title: 'Easy Team Creation',
    description: 'Create and manage teams effortlessly with intuitive member management tools.',
    color: 'primary',
    delay: '0.2s',
  },
  {
    icon: 'mdi-clipboard-text',
    title: 'Dynamic Task Creation',
    description: "Build custom tasks with flexible fields tailored to your team's workflow.",
    color: 'success',
    delay: '0.4s',
  },
  {
    icon: 'mdi-responsive',
    title: 'Mobile Responsive',
    description: 'Access your teams and tasks seamlessly across all devices and screen sizes.',
    color: 'info',
    delay: '0.6s',
  },
  {
    icon: 'mdi-shield-check',
    title: 'High Security',
    description: 'Advanced token validation and encryption keep your team data safe and secure.',
    color: 'warning',
    delay: '0.8s',
  },
]
</script>

<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-background"></div>
      <v-container class="hero-container">
        <v-row justify="center" align="center" class="min-height">
          <v-col cols="12" md="8" lg="6" class="text-center">
            <div class="hero-content" :class="{ 'animate-in': isVisible }">
              <h1 class="hero-title">
                <span class="gradient-text">Teams</span>
                <span class="highlight-text">Management</span>
              </h1>
              <p class="hero-subtitle">
                Simplify collaboration, amplify productivity. Manage your teams with elegance and
                efficiency.
              </p>
              <div class="hero-features">
                <v-chip
                  v-for="(chip, index) in ['Intuitive', 'Secure', 'Responsive']"
                  :key="chip"
                  variant="outlined"
                  size="small"
                  class="ma-1 feature-chip highlight-text"
                  :style="{ 'animation-delay': `${1 + index * 0.1}s` }"
                >
                  {{ chip }}
                </v-chip>
              </div>
              <div class="cta-section">
                <v-btn
                  @click="navigateToLogin"
                  color="primary"
                  size="x-large"
                  variant="elevated"
                  class="cta-button"
                  prepend-icon="mdi-rocket-launch"
                >
                  Get Started Now
                </v-btn>
                <p class="cta-subtitle">Start managing your teams in minutes</p>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>

      <!-- Floating Elements -->
      <div class="floating-elements">
        <div class="floating-circle circle-1"></div>
        <div class="floating-circle circle-2"></div>
        <div class="floating-circle circle-3"></div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <v-container>
        <v-row justify="center" class="mb-12">
          <v-col cols="12" class="text-center">
            <h2 class="section-title" :class="{ 'animate-in': isVisible }">
              Why Choose Our Platform?
            </h2>
            <p class="section-subtitle" :class="{ 'animate-in': isVisible }">
              Powerful features designed to make team management effortless
            </p>
          </v-col>
        </v-row>

        <v-row>
          <v-col
            v-for="(feature, index) in features"
            :key="feature.title"
            cols="12"
            sm="6"
            md="3"
            class="feature-col"
          >
            <div
              class="feature-card"
              :class="{ 'animate-in': isVisible }"
              :style="{ 'animation-delay': feature.delay }"
            >
              <div class="feature-icon-wrapper">
                <v-icon
                  :icon="feature.icon"
                  :color="feature.color"
                  size="48"
                  class="feature-icon"
                ></v-icon>
              </div>
              <h3 class="feature-title">{{ feature.title }}</h3>
              <p class="feature-description">{{ feature.description }}</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works-section">
      <v-container>
        <v-row justify="center" class="mb-12">
          <v-col cols="12" class="text-center">
            <h2 class="section-title" :class="{ 'animate-in': isVisible }">How It Works</h2>
            <p class="section-subtitle" :class="{ 'animate-in': isVisible }">
              Get started in three simple steps
            </p>
          </v-col>
        </v-row>

        <v-row justify="center">
          <v-col
            v-for="(step, index) in [
              { number: '01', title: 'Sign Up', description: 'Create your account in seconds' },
              {
                number: '02',
                title: 'Create Teams',
                description: 'Set up your teams and invite members',
              },
              {
                number: '03',
                title: 'Start Managing',
                description: 'Begin collaborating and tracking progress',
              },
            ]"
            :key="step.number"
            cols="12"
            md="4"
            class="step-col"
          >
            <div
              class="step-card"
              :class="{ 'animate-in': isVisible }"
              :style="{ 'animation-delay': `${1.2 + index * 0.2}s` }"
            >
              <div class="step-number">{{ step.number }}</div>
              <h3 class="step-title">{{ step.title }}</h3>
              <p class="step-description">{{ step.description }}</p>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Final CTA Section -->
    <section class="final-cta-section">
      <v-container>
        <v-row justify="center">
          <v-col cols="12" md="8" class="text-center">
            <div class="final-cta-content" :class="{ 'animate-in': isVisible }">
              <h2 class="final-cta-title">Ready to Transform Your Team Management?</h2>
              <p class="final-cta-subtitle">
                Join thousands of teams who have streamlined their workflow with our platform
              </p>
              <v-btn
                @click="navigateToLogin"
                color="primary"
                size="x-large"
                variant="elevated"
                class="final-cta-button"
                prepend-icon="mdi-arrow-right"
              >
                Start Your Journey
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <v-container>
        <v-row>
          <v-col cols="12" md="6">
            <h3 class="footer-title">Teams Management</h3>
            <p class="footer-description">
              Empowering teams to collaborate better, work smarter, and achieve more together.
            </p>
          </v-col>
          <v-col cols="12" md="6">
            <div class="contact-info">
              <h4 class="contact-title">Contact Us</h4>
              <div class="contact-item">
                <v-icon class="mr-2">mdi-phone</v-icon>
                <span>Hotline: 0123999888</span>
              </div>
              <div class="contact-item">
                <v-icon class="mr-2">mdi-email</v-icon>
                <span>Email: admin123@gmail.com</span>
              </div>
            </div>
          </v-col>
        </v-row>
        <v-divider class="my-4"></v-divider>
        <v-row>
          <v-col cols="12" class="text-center">
            <p class="copyright">
              © 2025 Teams Management. Made with
              <v-icon color="red" size="small" class="mx-1">mdi-heart</v-icon>
              for better collaboration.
            </p>
          </v-col>
        </v-row>
      </v-container>
    </footer>
  </div>
</template>

<style scoped>
@import '../../styles/landingview.css';
</style>
