<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const projectsData = ref([])

const fetchProjects = async () => {
  try {
    const response = await fetch('/api/projects')
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    projectsData.value = await response.json()
  } catch (error) {
    console.error('Failed to fetch projects:', error)
  }
}

</script>

<template>
    
</template>
