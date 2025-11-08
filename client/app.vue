<template>
  <div>
    <!-- Loading screen -->
    <div class="loading-screen" id="loading-screen">
      <div class="loading-character">🚀</div>
      <h2>Team Management</h2>
      <p id="loading-message">Initializing your team workspace...</p>
    </div>
    
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup>
// Loading screen handling
onMounted(() => {
  // Pick a random message for loading screen
  const messages = [
    'Getting your team ready to shine...',
    'Setting the stage for teamwork magic...',
    'Bringing your team together...',
    'Initializing your team workspace...',
    'Preparing your team dashboard...',
    'Setting up your collaboration hub...',
    'Kickstarting your team journey...',
    'Empowering your team to succeed...',
    'Fueling up your team\'s potential...'
  ]
  
  const messageEl = document.getElementById('loading-message')
  if (messageEl) {
    messageEl.textContent = messages[Math.floor(Math.random() * messages.length)]
  }

  // Hide loading screen when app is ready
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen')
    if (loadingScreen) {
      loadingScreen.style.opacity = '0'
      loadingScreen.style.transition = 'opacity 0.5s ease'
      setTimeout(() => {
        loadingScreen.style.display = 'none'
      }, 500)
    }
  }, 1500)

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof TypeError && event.reason.message.includes('fetch')) {
      event.preventDefault()
    }
  })
})
</script>

<style scoped>
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1976D2, #43A047);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  color: white;
}

.loading-character {
  font-size: 4rem;
  animation: bounce 2s infinite;
  margin-bottom: 20px;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-30px);
  }
  60% {
    transform: translateY(-15px);
  }
}
</style>
