<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const user = ref({
  userId: '',
  username: '',
  email: '',
})
const newMemberOfATeam = {
    userId: '',
    username: '',
    role: '',
    teamId: '',
}
// This will hold the list of users by ID and username fetched from the API
const listOfUsers = ref([])
// This will hold the list of roles fetched from the API
const listOfRoles = ref([])
const teamThatUserIsAdmin = ref([])
const props = defineProps({
  dialog: {
    type: Boolean,
    required: true,
  },
  userProps:{
    type: Object,
    required: true,
  }
})

const fetchUsers = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`http://localhost:${PORT}/api/allusers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    listOfUsers.value = await response.json()
    console.log('Fetched users:', listOfUsers.value)
  } catch (error) {
    console.error('Failed to fetch users:', error)
  }
}
const fetchRoles = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`http://localhost:${PORT}/api/roles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    listOfRoles.value = await response.json()
    console.log('Fetched roles:', listOfRoles.value)
  } catch (error) {
    console.error('Failed to fetch roles:', error)
  }
}

const getTeamThatUserIsAdmin = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`http://localhost:${PORT}/api/teams/user/${user.value.userId}/admin`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    teamThatUserIsAdmin.value = await response.json()
    console.log('Fetched teams that user is admin of:', teamThatUserIsAdmin.value)
  } catch (error) {
    console.error('Failed to fetch teams:', error)
  }
}

const setUserFromProps = (userProps) => {
  console.log("User Props:", userProps)
  user.value.userId = userProps.userId
  user.value.username = userProps.username
  user.value.email = userProps.email
}

onMounted(async () => {
  setUserFromProps(props.userProps)
  await fetchRoles()
  await fetchUsers()
  await getTeamThatUserIsAdmin()
  
  console.log('Team that user is admin:', teamThatUserIsAdmin.value)
  if (user) {

  } else {
    user.value.username = 'Guest'
    user.value.email = ''
  }
})

watch(() => props.userProps, (newProps) => {
  setUserFromProps(newProps)
}, { immediate: true })



</script>

<template>
    <v-dialog v-model="props.dialog" max-width="600px">
        <v-card>
            <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2">New Members</v-card-title>
            <v-card-text>
                <v-form>
                    <v-expand-transition>
                        <v-select
                            v-model="newMemberOfATeam.teamId"
                            :items="teamThatUserIsAdmin"
                            item-title="title"
                            item-value="teamId"
                            label="Select Team"
                            variant="outlined"
                            required
                        ></v-select>
                    </v-expand-transition>
                    <v-text-field
                        v-model="newMemberOfATeam.username"
                        label="Username"
                        variant="outlined"
                        required
                    ></v-text-field>
                    <v-expand-transition>
                        <v-select
                            v-model="newMemberOfATeam.role"
                            :items="listOfRoles"
                            label="Role"
                            variant="outlined"
                            required
                        ></v-select>
                    </v-expand-transition>
                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" @click="$emit('close')">Close</v-btn>
            </v-card-actions>
        </v-card>
        
    </v-dialog>
</template>
