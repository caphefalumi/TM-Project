<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const user = ref({
  userId: '',
  username: '',
  email: '',
})

const teamThatUserIsAdmin = ref([])
const categories = ref([])

const newTeam = ref({
  title: '',
  category: '',
  description: '',
  parentTeamId: '', // Assuming this is optional
  userId: '', // Automatically set userId from user token through props
  username: '', // Automatically set username from user token through props
})


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
  // const userToken = await getUserByAccessToken()
  setUserFromProps(props.userProps)
  newTeam.value.userId = user.value.userId
  newTeam.value.username = user.value.username
  await fetchCategories()
  await getTeamThatUserIsAdmin()
  
  console.log('Team that user is admin:', teamThatUserIsAdmin.value)
  if (user) {

  } else {
    user.value.username = 'Guest'
    user.value.email = ''
  }
})



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



const fetchCategories = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`http://localhost:${PORT}/api/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    categories.value = await response.json()
    //console.log('Fetched categories:', categories.value)
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

const emit = defineEmits(['update:dialog'])

watch(
  () => props.dialog,
  (newVal) => {
    console.log('Dialog prop changed:', newVal)
  },
)

const closeDialog = () => {
  emit('update:dialog', false)
}

const clearTeamData = () => {
  newTeam.value.title = ''
  newTeam.value.category = ''
  newTeam.value.description = ''
  newTeam.value.parentTeamId = ''
}

const createProject = async () => {
  console.log('Creating project with data:', newTeam.value)
  try {
      const PORT = import.meta.env.VITE_API_PORT
      const response = await fetch(`http://localhost:${PORT}/api/teams`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            newTeam.value
          ),
      })

      if (!response.ok) {
          throw new Error('Network response was not ok')
      }
      const data = await response.json()
      console.log('Project created:', data)
      clearTeamData() // Clear the form after successful creation
      // Perform Redirect when finished creating project

  } catch (error) {
      console.error('Failed to create project:', error)
  }
  emit('update:dialog', false)
}
</script>

<template>
  <!-- this component is a popup dialog that allows users to create new team -->
  <!-- Using vuetify 3 -->
  <v-dialog v-model="props.dialog" max-width="600px" closable>
    <v-card>
      <!-- IMPLEMENT: Set card title to bold style -->
      <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2"
        >Create New Team</v-card-title
      >
      <v-card-text>
        <v-expand-transition>
          <v-select
            v-model="newTeam.parentTeamId"
            :items="teamThatUserIsAdmin"
            item-title="title"
            item-value="teamId"
            label="Parent Team ID (optional)"
            variant="outlined"
            placeholder="Enter parent team ID if applicable"
          ></v-select>
        </v-expand-transition>
        <v-text-field
          v-model="newTeam.title"
          label="Project Title"
          variant="outlined"
          required
        ></v-text-field>
        <v-expand-transition>
          <v-select
            v-model="newTeam.category"
            :items="categories"
            label="Category"
            variant="outlined"
            required
          ></v-select>
        </v-expand-transition>
        
        <v-textarea
          v-model="newTeam.description"
          label="Description"
          rows="3"
          variant="outlined"
        ></v-textarea>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="createProject" variant="outlined">Create</v-btn>
        <v-btn text @click="closeDialog" variant="outlined">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
