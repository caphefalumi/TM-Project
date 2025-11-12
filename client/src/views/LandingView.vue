<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import TMFooter from '../components/TMFooter.vue'

const router = useRouter()
const authStore = useAuthStore()
const isVisible = ref(false)

onMounted(async () => {
  try {
    if (authStore.isLoggedIn && authStore.user) {
      router.push('/home')
      return
    }

    const existingUser = await authStore.ensureUser()
    if (existingUser) {
      router.push('/home')
      return
    }
  } catch (error) {
    console.log('Error checking authentication status:', error)
  }
  isVisible.value = true
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
                <span>
                  <a
                    href="mailto:khanhkelvin08122006@gmail.com"
                    style="color: inherit; text-decoration: underline"
                  >
                    <v-icon class="mr-2">mdi-email</v-icon>
                    <span>khanhkelvin08122006@gmail.com</span>
                  </a>
                </span>
              </div>
              <div class="contact-item">
                <span>
                  <a
                    href="https://github.com/caphefalumi/TM-Project"
                    target="_blank"
                    rel="noopener"
                    style="color: inherit; text-decoration: underline"
                  >
                    <v-icon class="mr-2">mdi-github</v-icon>
                    <span>TM-Project</span>
                  </a>
                </span>
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

    <!-- TM Footer Component -->
    <TMFooter />
  </div>
</template>

<style scoped>
/* Landing Page Styles */
.landing-page {
  overflow-x: hidden;
  margin-left: 0;
  padding-top: 0;
}

@media (max-width: 900px) {
  .landing-page {
    padding-top: 0;
  }
}

/* Hero Section */
.hero-section {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.1)"/></svg>')
    repeat;
  background-size: 60px 60px;
  animation: float-bg 20s infinite linear;
}

@keyframes float-bg {
  0% {
    transform: translateY(0px);
  }
  100% {
    transform: translateY(-100px);
  }
}

.hero-container {
  position: relative;
  z-index: 2;
}

.min-height {
  min-height: 100vh;
}

.hero-content {
  opacity: 0;
  transform: translateY(50px);
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-content.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  line-height: 1.1;
}

.gradient-text {
  background: linear-gradient(45deg, #fff, #e3f2fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.highlight-text {
  color: #ffeb3b;
  text-shadow: 0 0 30px rgba(255, 235, 59, 0.5);
}

.hero-subtitle {
  font-size: 1.4rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2rem;
  font-weight: 300;
  line-height: 1.6;
}

.hero-features {
  margin-bottom: 3rem;
}

.feature-chip {
  opacity: 0;
  animation: fadeInUp 0.8s forwards;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cta-section {
  margin-top: 2rem;
}

.cta-button {
  padding: 1rem 3rem !important;
  font-size: 1.2rem !important;
  font-weight: 600 !important;
  border-radius: 50px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
  transition: all 0.3s ease !important;
  margin-bottom: 1rem;
}

.cta-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3) !important;
}

.cta-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin-top: 1rem;
}

/* Floating Elements */
.floating-elements {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1;
}

.floating-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float-circle 6s ease-in-out infinite;
}

.circle-1 {
  width: 100px;
  height: 100px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.circle-2 {
  width: 150px;
  height: 150px;
  top: 60%;
  right: 15%;
  animation-delay: 2s;
}

.circle-3 {
  width: 80px;
  height: 80px;
  bottom: 20%;
  left: 20%;
  animation-delay: 4s;
}

@keyframes float-circle {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }
  33% {
    transform: translateY(-20px) rotate(120deg);
  }
  66% {
    transform: translateY(10px) rotate(240deg);
  }
}

/* Features Section */
.features-section {
  padding: 6rem 0;
  background: #f8fafc;
}

.section-title {
  font-size: 2.8rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.section-subtitle {
  font-size: 1.2rem;
  color: #64748b;
  font-weight: 300;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 0.2s;
}

.section-title.animate-in,
.section-subtitle.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.feature-col {
  display: flex;
  justify-content: center;
}

.feature-card {
  background: white;
  border-radius: 20px;
  padding: 2.5rem 2rem;
  text-align: center;
  height: 100%;
  max-width: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  transform: translateY(50px) scale(0.9);
  border: 1px solid #e2e8f0;
}

.feature-card.animate-in {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.feature-card:hover {
  transform: translateY(-10px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.feature-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(102, 126, 234, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  transition: all 0.3s ease;
}

.feature-card:hover .feature-icon-wrapper {
  transform: scale(1.1);
  background: rgba(102, 126, 234, 0.2);
}

.feature-icon {
  transition: all 0.3s ease;
}

.feature-card:hover .feature-icon {
  transform: scale(1.1);
}

.feature-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
}

.feature-description {
  color: #64748b;
  line-height: 1.6;
  font-size: 0.95rem;
}

/* How It Works Section */
.how-it-works-section {
  padding: 6rem 0;
  background: white;
}

.step-col {
  display: flex;
  justify-content: center;
}

.step-card {
  text-align: center;
  max-width: 300px;
  padding: 2rem;
  opacity: 0;
  transform: translateY(50px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.step-card.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.step-number {
  font-size: 3rem;
  font-weight: 800;
  color: #667eea;
  margin-bottom: 1rem;
  opacity: 0.8;
}

.step-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 1rem;
}

.step-description {
  color: #64748b;
  line-height: 1.6;
}

/* Final CTA Section */
.final-cta-section {
  padding: 6rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
}

.final-cta-content {
  opacity: 0;
  transform: translateY(50px);
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: 1.5s;
}

.final-cta-content.animate-in {
  opacity: 1;
  transform: translateY(0);
}

.final-cta-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin-bottom: 1rem;
}

.final-cta-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2rem;
}

.final-cta-button {
  padding: 1rem 3rem !important;
  font-size: 1.2rem !important;
  font-weight: 600 !important;
  border-radius: 50px !important;
  background: white !important;
  color: #667eea !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2) !important;
}

.final-cta-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3) !important;
}

/* Footer */
.landing-footer {
  background: #1e293b;
  color: white;
  padding: 3rem 0 1rem;
}

.footer-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #667eea;
}

.footer-description {
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.contact-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #667eea;
}

.contact-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  color: #94a3b8;
}

.copyright {
  color: #64748b;
  font-size: 0.9rem;
  margin: 0;
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
    font-size: 1.1rem;
  }

  .section-title {
    font-size: 2.2rem;
  }

  .final-cta-title {
    font-size: 2rem;
  }

  .feature-card,
  .step-card {
    margin-bottom: 2rem;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .cta-button,
  .final-cta-button {
    width: 100%;
    padding: 1rem 2rem !important;
  }
}
</style>
