<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const user = ref({
  userId: '',
  username: '',
  email: '',
})
const newMemberData = ref({
  role: '',
})

const success = ref(false)
const error = ref(false)
const message = ref('')
const loading = ref(false)

const searchUsernameField = ref('')

// This will hold the list of users by ID and username fetched from the API
const listOfUsers = ref([])
// This will hold the list of roles fetched from the API
const listOfRoles = ref([])
const selectedUsers = ref([])

// Computed property to filter users based on the search input and exclude current user, existing team members, and selected users
const filteredUsers = computed(() => {
  // Get array of existing team member user IDs
  const existingMemberIds = props.teamMembers.map(member => member.userId || member._id || member.id)

  // Get array of already selected user IDs
  const selectedUserIds = selectedUsers.value.map(user => user.userId)

  // Always exclude the current user, existing team members, and already selected users from results
  const availableUsers = listOfUsers.value.filter(
    (_user) => {
      const isCurrentUser = _user.userId === user.value.userId
      const isExistingMember = existingMemberIds.includes(_user.userId)
      const isAlreadySelected = selectedUserIds.includes(_user.userId)
      return !isCurrentUser && !isExistingMember && !isAlreadySelected
    }
  )

  if (!searchUsernameField.value) {
    return availableUsers
  }

  const _search = searchUsernameField.value.toLowerCase()
  const res = availableUsers.filter(
    (_user) => _user.username.toLowerCase().includes(_search)
  )

  return res.slice(0, 5) // Limit to 5 results
})

const resetForm = () => {
  searchUsernameField.value = ''
  selectedUsers.value = []
  newMemberData.value.role = ''
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
  teamId: {
    type: String,
    required: true,
  },
  teamMembers: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:dialog', 'members-added'])

const fetchUsers = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/users/all`, {
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
    listOfUsers.value = res.map((user) => ({
      userId: user._id,
      username: user.username,    }))
  } catch (error) {
    console.error('Failed to fetch users:', error)
  }
}

const fetchRoles = async () => {
  try {
    // First get default roles
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/roles`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const defaultRoles = await response.json()    // Initialize with default roles
    listOfRoles.value = [...defaultRoles]

  } catch (error) {
    console.error('Failed to fetch roles:', error)
  }
}

// Function to fetch custom roles for the specific team
const fetchCustomRoles = async () => {
  if (!props.teamId) return

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${props.teamId}/roles`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }

    const data = await response.json()

    // Combine default roles with custom roles
    const defaultRoles = ['Admin', 'Moderator', 'Member']
    const customRoleOptions = data.roles.map(role => ({
      title: role.name,
      value: `custom:${role._id}` // Prefix to identify custom roles
    }))

    listOfRoles.value = [
      ...defaultRoles,
      ...customRoleOptions
    ]

    console.log('Fetched team roles:', data.roles)
    console.log('Combined role options:', listOfRoles.value)
  } catch (error) {
    console.error('Failed to fetch custom roles:', error)
  }
}

const sendMembersToServer = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        users: selectedUsers.value,
        addedByUserId: props.userProps.userId,
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      error.value = true
      success.value = false
      message.value = result.message || 'Failed to add users to team'
      loading.value = false
      throw new Error('Network response was not ok')
    }
    success.value = true
    error.value = false
    message.value = 'Members added successfully!'
    console.log('Members added successfully:', result)

    // Emit event to parent to refresh team members
    emit('members-added')
  } catch (error) {
    loading.value = false
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
  await fetchCustomRoles() // Fetch custom roles for this team
  await fetchUsers()
})

// Watch for teamId changes to refetch custom roles
watch(
  () => props.teamId,
  (newTeamId) => {
    if (newTeamId) {
      fetchCustomRoles()
    }
  }
)

// Watch for team members changes to update available users
watch(
  () => props.teamMembers,
  () => {
    // Team members updated, filtered users will be recalculated automatically
  },
  { deep: true }
)

const closeDialog = () => {
  setTimeout(() => {
    resetForm()
    success.value = false
    error.value = false
    message.value = ''
    loading.value = false
    emit('update:dialog', false)
  }, 1500)
}

const selectAUser = (selectedUser) => {
  // Just add the user without role assignment - roles will be assigned when adding to team
  const newMember = {
    userId: selectedUser.userId,
    username: selectedUser.username,
    teamId: props.teamId,
  }

  // Check if the user is already selected
  const isAlreadySelected = selectedUsers.value.some((user) => user.userId === selectedUser.userId)

  if (!isAlreadySelected) {
    selectedUsers.value.push(newMember)
    console.log('Selected users:', selectedUsers.value)
    searchUsernameField.value = ''
  } else {
    console.log('User already selected:', selectedUser.username)
  }
}

const removeSelectedUser = (userId) => {
  selectedUsers.value = selectedUsers.value.filter((user) => user.userId !== userId)
}

const addUsers = async () => {
  if (selectedUsers.value.length === 0) {
    error.value = true
    message.value = 'Please select at least one user to add.'
    return
  } else if (newMemberData.value.role === '') {
    error.value = true
    message.value = 'Please select a role.'
    return
  }

  // Assign the selected role to all users before sending to server
  const role = newMemberData.value.role
  let roleId = null
  let finalRole = role

  if (role.startsWith('custom:')) {
    roleId = role.replace('custom:', '')
    finalRole = 'Member' // Default role for users with custom role
  }

  // Update all selected users with the role information
  const usersWithRoles = selectedUsers.value.map(user => ({
    ...user,
    role: finalRole,
    roleId: roleId
  }))

  // Temporarily update selectedUsers for sending to server
  const originalSelectedUsers = [...selectedUsers.value]
  selectedUsers.value = usersWithRoles

  loading.value = true
  console.log('Adding these users:', JSON.stringify(selectedUsers.value, null, 2))
  try {
    await sendMembersToServer()
    if (success.value) {
      closeDialog()
    }
  } catch (error) {
    loading.value = false
    console.error('Failed to add members:', error)
    // Restore original selectedUsers if there was an error
    selectedUsers.value = originalSelectedUsers
  }
}
</script>

<template>
  <v-dialog v-model="props.dialog" max-width="600px" closable>
    <v-card>
      <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2">
        Add Team Members
      </v-card-title>
      <v-card-text>
        <v-expand-transition>
          <v-select
            v-model="newMemberData.role"
            :items="listOfRoles"
            label="Role"
            variant="outlined"
            required
          ></v-select>
        </v-expand-transition>

        <!-- Display selected users using v-chip -->
        <div v-if="selectedUsers.length > 0" class="mb-4">
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
        </div>
          <!-- Search field for usernames -->
        <v-text-field
          v-model="searchUsernameField"
          label="Username"
          placeholder="Search for username..."
          variant="outlined"
          class="mt-2"
          required
        ></v-text-field><!-- Display filtered users -->
        <v-list
          v-if="filteredUsers.length > 0"
          max-height="200"
          class="filtered-users-list"
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
      <v-card-text>
        <v-alert v-if="success" type="success">{{ message }}</v-alert>
        <v-alert v-if="error" type="error">{{ message }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="emit('update:dialog', false)" variant="outlined" :disabled="loading">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          @click="addUsers"
          variant="outlined"
          :disabled="loading"
          :loading="loading"
        >
          Add Members
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.filtered-users-list {
  overflow-y: auto;
}
</style>
