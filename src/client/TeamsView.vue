<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AuthStore from './scripts/authStore.js'
import NewTeams from './components/NewTeams.vue'
import NewMembers from './components/NewMembers.vue'
import DeleteTeams from './components/DeleteTeams.vue'

const { getUserByAccessToken } = AuthStore

// --- Router Instance ---
const router = useRouter()

const userLoaded = ref(false)
const teamsThatUserIsAdmin = ref([])
const user = ref({
  userId: '',
  username: '',
  email: '',
})

const setUserToUserToken = (userToken) => {
  console.log('User Token:', userToken)
  user.value.userId = userToken.userId
  user.value.username = userToken.username
  user.value.email = userToken.email
}

const getTeamThatUserIsAdmin = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `http://localhost:${PORT}/api/teams/user/${user.value.userId}/admin`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    teamsThatUserIsAdmin.value = await response.json()
    console.log('Fetched teams that user is admin of:', teamsThatUserIsAdmin.value)
  } catch (error) {
    console.error('Failed to fetch teams:', error)
  }
}

onMounted(async () => {
  userLoaded.value = false
  const userFromToken = await getUserByAccessToken()
  if (userFromToken) {
    setUserToUserToken(userFromToken)
    await getTeamThatUserIsAdmin()
    userLoaded.value = true
  } else {
    user.value.username = 'Guest'
  }
})

// --- Reactive State ---
const isCreatingNewTeam = ref(false)
const isAddingNewMember = ref(false)
const isDeletingTeam = ref(false)

const isLoggedIn = ref(false)
const commentDialog = ref(false)
const selectedProject = ref(null)
const newCommentText = ref('')


const userTeams = ref([])
const fetchTeams = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`http://localhost:${PORT}/api/projects`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    userTeams.value = await response.json()
    console.log('Fetched projects:', userTeams.value)
  } catch (error) {
    console.error('Failed to fetch projects:', error)
  }
}
// --- Sample Data ---

// Added a 'comments' array to each project object
const projects = ref([
  {
    id: 1,
    title: 'Website Redesign',
    category: 'Web Development',
    description: 'Complete redesign of the corporate website.',
    progress: 75,
    color: 'blue',
    team: [
      { id: 1, name: 'Alice', avatar: 'https://placehold.co/32x32/EFEFEF/333333?text=A' },
      { id: 2, name: 'Bob', avatar: 'https://placehold.co/32x32/EFEFEF/333333?text=B' },
    ],
    comments: [
      {
        id: 1,
        author: 'Bob',
        avatar: 'https://placehold.co/40x40/EFEFEF/333333?text=B',
        text: 'Great progress so far!',
      },
    ],
  },
  {
    id: 2,
    title: 'Mobile App Launch',
    category: 'Marketing',
    description: 'Coordinate the launch campaign for the new apps.',
    progress: 40,
    color: 'green',
    team: [
      { id: 3, name: 'Charlie', avatar: 'https://placehold.co/32x32/EFEFEF/333333?text=C' },
      { id: 4, name: 'Diana', avatar: 'https://placehold.co/32x32/EFEFEF/333333?text=D' },
    ],
    comments: [],
  },
  {
    id: 3,
    title: 'API Integration',
    category: 'Backend Development',
    description: 'Integrate third-party payment gateway API.',
    progress: 90,
    color: 'orange',
    team: [
      { id: 1, name: 'Alice', avatar: 'https://placehold.co/32x32/EFEFEF/333333?text=A' },
      { id: 5, name: 'Eve', avatar: 'https://placehold.co/32x32/EFEFEF/333333?text=E' },
    ],
    comments: [
      {
        id: 2,
        author: 'Alice',
        avatar: 'https://placehold.co/40x40/EFEFEF/333333?text=A',
        text: "Let's double check the security protocols.",
      },
      {
        id: 3,
        author: 'Eve',
        avatar: 'https://placehold.co/40x40/EFEFEF/333333?text=E',
        text: 'Agreed. I will run a security audit.',
      },
    ],
  },
  {
    id: 4,
    title: 'Q3 Content Strategy',
    category: 'Content',
    description: 'Plan and schedule all blog and social media content.',
    progress: 25,
    color: 'purple',
    team: [
      { id: 2, name: 'Bob', avatar: 'https://placehold.co/32x32/EFEFEF/333333?text=B' },
      { id: 3, name: 'Charlie', avatar: 'https://placehold.co/32x32/EFEFEF/333333?text=C' },
    ],
    comments: [],
  },
  {
    id: 5,
    title: 'User Onboarding Flow',
    category: 'UX/UI Design',
    description: 'Design and prototype a new user onboarding.',
    progress: 60,
    color: 'teal',
    team: [
      { id: 4, name: 'Diana', avatar: 'https://placehold.co/32x32/EFEFEF/333333?text=D' },
      { id: 5, name: 'Eve', avatar: 'https://placehold.co/32x32/EFEFEF/333333?text=E' },
    ],
    comments: [],
  },
  {
    id: 6,
    title: 'Server Migration',
    category: 'DevOps',
    description: 'Migrate all production services to new cloud infra.',
    progress: 95,
    color: 'red',
    team: [{ id: 1, name: 'Alice', avatar: 'https://placehold.co/32x32/EFEFEF/333333?text=A' }],
    comments: [],
  },
])

// --- Methods ---
/**
 * Redirects the user to the login page using Vue Router.
 */

/**
 * Opens the comments dialog for a selected project.
 * @param {object} project - The project to show comments for.
 */
const openCommentsDialog = (project) => {
  selectedProject.value = project
  commentDialog.value = true
}

/**
 * Adds a new comment to the selected project.
 */
const addComment = () => {
  // Exit if there's no text or no project selected
  if (!newCommentText.value.trim() || !selectedProject.value) return

  // Create a new comment object
  const newComment = {
    id: Date.now(), // Use a simple unique ID for this example
    author: 'Current User', // In a real app, this would be the logged-in user's name
    avatar: 'https://placehold.co/40x40/EFEFEF/333333?text=Me', // Placeholder for current user
    text: newCommentText.value.trim(),
  }

  // Add the new comment to the project's comment list
  selectedProject.value.comments.push(newComment)

  // Reset the input field
  newCommentText.value = ''
}
</script>

<template>
  <!-- Main content area -->

  <v-container fluid>
    <v-row class="align-center mb-6">
      <v-col justify="center" cols="12">
        <h1 class="text-h4 welcome-header">Welcome Back, {{ user.username }}!</h1>
        <p class="text-grey">Here's a look at your current teams.</p>
      </v-col>
    </v-row>

    <!-- Projects Grid -->
    <v-row>
      <!-- Title: -->
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4 text-center">Options</h2>
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col cols="12" md="4">
        <v-card
          class="mb-4 project-card rounded-lg"
          flat
          @click="isCreatingNewTeam = !isCreatingNewTeam"
          color="blue-darken-2"
        >
          <v-card-item class="text-center">
            <v-card-title 
              class="font-weight-bold text-h5"
              v-tooltip:bottom="'Click to create new team'"
            >Create New Team</v-card-title>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card
          class="mb-4 project-card rounded-lg"
          flat
          @click="isAddingNewMember = !isAddingNewMember"
          color="purple-lighten-2"
        >
          <v-card-item class="text-center">
            <v-card-title class="font-weight-bold text-h5" 
            v-tooltip:bottom="'Click to add new members'"
          >Add New Members
          </v-card-title>
          </v-card-item>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card
          class="mb-4 project-card rounded-lg"
          flat
          @click="isDeletingTeam = !isDeletingTeam"
          color="red-lighten-2"
        >
          <v-card-item class="text-center">
            <v-card-title 
              class="font-weight-bold text-h5"
              v-tooltip:bottom="'Click to delete a team'"
            >Delete A Team</v-card-title>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>
    <NewTeams
      v-if="userLoaded"
      v-model:dialog="isCreatingNewTeam"
      :userProps="user"
      v-model:teamsThatUserIsAdmin="teamsThatUserIsAdmin"
    />
    <NewMembers
      v-if="userLoaded"
      v-model:dialog="isAddingNewMember"
      :userProps="user"
      v-model:teamsThatUserIsAdmin="teamsThatUserIsAdmin"
    />
    <DeleteTeams
      v-if="userLoaded"
      v-model:dialog="isDeletingTeam"
      :userProps="user"
      v-model:teamsThatUserIsAdmin="teamsThatUserIsAdmin"
      @teams-deleted="getTeamThatUserIsAdmin"
    />

    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4 text-center">Your Teams</h2>
      </v-col>

      <v-col v-for="project in projects" :key="project.id" cols="12" sm="6" md="4">
        <v-card class="project-card rounded-lg" flat>
          <v-card-item>
            <v-card-title class="font-weight-bold">{{ project.title }}</v-card-title>
            <v-card-subtitle>{{ project.category }}</v-card-subtitle>
          </v-card-item>
          <v-card-text>
            {{ project.description }}
            <v-progress-linear
              v-model="project.progress"
              :color="project.color"
              height="8"
              rounded
              class="mt-4 mb-2"
            ></v-progress-linear>
            <div class="d-flex justify-space-between text-caption text-grey">
              <span>Progress</span>
              <span>{{ project.progress }}%</span>
            </div>
          </v-card-text>
          <v-divider></v-divider>
        </v-card>
      </v-col>
    </v-row>
  </v-container>

  <!-- Floating Action Button to add new projects -->
  <v-fab
    v-if="isLoggedIn"
    icon="mdi-plus"
    location="bottom end"
    size="large"
    app
    appear
    class="mb-16"
    color="primary"
  ></v-fab>
</template>

<style scoped>
/* Scoped styles ensure these only apply to this component */
.project-card {
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important;
}

.welcome-header {
  font-weight: 700;
  color: #333;
}
</style>
