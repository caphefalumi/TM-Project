<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const user = ref({
  userId: '',
  username: '',
  email: '',
})

const isAdmin = ref(false)

const props = defineProps({
    userProps: {
        type: Object,
        required: true,
    },
})

</script>

<template>
    
</template>
