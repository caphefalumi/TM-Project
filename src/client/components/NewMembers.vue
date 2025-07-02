<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const user = ref({
  userId: '',
  username: '',
  email: '',
})
const newMemberOfATeam = ref({
  role: '',
  teamId: '',
})

const searchUsernameField = ref('')

// This will hold the list of users by ID and username fetched from the API
const listOfUsers = ref([])
// This will hold the list of roles fetched from the API
const listOfRoles = ref([])
const teamThatUserIsAdmin = ref([])
const selectedUsers = ref([])

// Computed property to filter users based on the search input and not the current user
const filteredUsers = computed(() => {
  if (!searchUsernameField.value) {
    return listOfUsers.value
  }
  const _search = searchUsernameField.value.toLowerCase()
  const res = listOfUsers.value.filter(
    (_user) => _user.username.toLowerCase().includes(_search)
    && _user.userId !== user.value.userId // Ensure the current user is excluded
  )
    // Exclude the current user from the results
    
  return res.slice(0, 5) // Limit to 5 results
})

const resetANewMember = () => {
    searchUsernameField.value = '' 
}

const props = defineProps({
  dialog: {
    type: Boolean,
    required: true,
  },
  userProps: {
    type: Object,
    required: true,
  },
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
    const res = await response.json()
    // Map the response to the desired structure
    listOfUsers.value = res.map(user => ({
      userId: user._id,
      username: user.username,
    }))
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
    teamThatUserIsAdmin.value = await response.json()
    console.log('Fetched teams that user is admin of:', teamThatUserIsAdmin.value)
  } catch (error) {
    console.error('Failed to fetch teams:', error)
  }
}   

const sendMembersToServer = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`http://localhost:${PORT}/api/teams/add/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(selectedUsers.value),
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const result = await response.json()
    console.log('Members added successfully:', result)
  } catch (error) {
    console.error('Failed to add members:', error)
  }
}

const setUserFromProps = (userProps) => {
  console.log('User Props:', userProps)
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

watch(
  () => props.dialog,
  (newVal) => {
    console.log('Dialog prop changed:', newVal)
  },
)

const emit = defineEmits(['update:dialog'])
const closeDialog = () => {
  emit('update:dialog', false)
}

const selectAUser = (selectedUser) => {
    const newMember = {
        userId: selectedUser.userId,
        username: selectedUser.username,
        role: newMemberOfATeam.value.role,
        teamId: newMemberOfATeam.value.teamId,
    }
    // Check if the user is already selected
    const isAlreadySelected = selectedUsers.value.some(user => user.userId === selectedUser.userId)

    if (!isAlreadySelected) {
        selectedUsers.value.push(newMember)
        console.log('Selected users:', selectedUsers.value)
        resetANewMember()
    } else {
        console.log('User already selected:', selectedUser.username)
    }
}

const removeSelectedUser = (userId) => {
    console.log('Removing user with ID:', userId)
    selectedUsers.value = selectedUsers.value.filter(user => user.userId !== userId)
    console.log('After remove:', selectedUsers.value)
}

const addUsers = async () => {
    console.log('Adding these users:', JSON.stringify(selectedUsers.value, null, 2))
    await sendMembersToServer()
    closeDialog()
} 
</script>

<template>
  <v-dialog v-model="props.dialog" max-width="600px" closable>
    <v-card>
      <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2"
        >New Members</v-card-title
      >
      <v-card-text>
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
        <v-expand-transition>
          <v-select
            v-model="newMemberOfATeam.role"
            :items="listOfRoles"
            label="Role"
            variant="outlined"
            required
          ></v-select>
        </v-expand-transition>
        <!-- Display selected users using v-chip -->
        <v-chip
            v-for="(user, index) in selectedUsers"
                :key="user.userId"
                class="ma-1"
                closable
                @click:close="removeSelectedUser(user.userId)"
                color="primary"
            >
            {{ user.username }}
        </v-chip>
        <!-- Search field for usernames -->
        <v-text-field
          v-model="searchUsernameField"
          label="Username"
          variant="outlined"
          class="mt-6"
          required
        ></v-text-field>

        <!-- Display filtered users -->
        <v-list
          v-if="searchUsernameField && filteredUsers.length > 0"
          max-height="200"
          style="overflow-y: auto"
        >
          <v-list-item
            v-for="user in filteredUsers"
            :key="user.userId"
            @click="selectAUser(user)"
            class="cursor-pointer"
          >
            <v-list-item-title>{{ user.username }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="addUsers" variant="outlined">Add</v-btn>
        <v-btn @click="closeDialog" variant="outlined">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
