<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const user = ref({
  userId: '',
  username: '',
  email: '',
})
const ROLE_TYPES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  CUSTOM: 'custom',
}

const newMemberData = ref({
  role: ROLE_TYPES.MEMBER,
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
  const existingMemberIds = props.teamMembers.map(
    (member) => member.userId || member._id || member.id,
  )

  // Get array of already selected user IDs
  const selectedUserIds = selectedUsers.value.map((user) => user.userId)

  // Always exclude the current user, existing team members, and already selected users from results
  const availableUsers = listOfUsers.value.filter((_user) => {
    const isCurrentUser = _user.userId === user.value.userId
    const isExistingMember = existingMemberIds.includes(_user.userId)
    const isAlreadySelected = selectedUserIds.includes(_user.userId)
    return !isCurrentUser && !isExistingMember && !isAlreadySelected
  })

  if (!searchUsernameField.value) {
    return availableUsers
  }

  const _search = searchUsernameField.value
  const res = availableUsers.filter((_user) => _user.username.includes(_search))

  return res.slice(0, 5) // Limit to 5 results
})

const resetForm = () => {
  searchUsernameField.value = ''
  selectedUsers.value = []
  newMemberData.value.role = ROLE_TYPES.MEMBER // Reset to default Member role
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
  roleUpdateTrigger: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['update:dialog', 'members-added'])

const fetchUsers = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/users/all`, {
      method: 'GET',
      credentials: 'include',
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
      username: user.username,
    }))
  } catch (error) {
    console.log('Failed to fetch users:', error)
  }
}

// Function to fetch roles for the specific team
const fetchRoles = async () => {
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
    const defaultRoles = [
      {
        title: 'Admin',
        value: ROLE_TYPES.ADMIN,
        roleType: ROLE_TYPES.ADMIN,
        icon: 'mdi-crown',
        color: 'red',
      },
      {
        title: 'Member',
        value: ROLE_TYPES.MEMBER,
        roleType: ROLE_TYPES.MEMBER,
        icon: 'mdi-account',
        color: 'blue',
      },
    ]
    const customRoleOptions = data.roles.map((role) => ({
      title: role.name,
      value: `custom:${role._id}`,
      roleType: ROLE_TYPES.CUSTOM,
      roleId: role._id,
      icon: role.icon || 'mdi-star',
      color: role.color || 'purple',
    }))

    listOfRoles.value = [...defaultRoles, ...customRoleOptions]
  } catch (error) {
    console.log('Failed to fetch custom roles:', error)
  }
}

const sendMembersToServer = async () => {
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${props.teamId}/users`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: sends refresh token cookie
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
    console.log('Failed to add members:', error)
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
  await fetchUsers()
})

// Fetch roles when dialog opens (not on mount)
watch(
  () => props.dialog,
  async (isOpen) => {
    if (isOpen && props.teamId) {
      await fetchRoles()
    }
  },
)

// Watch for teamId changes to refetch custom roles (only if dialog is open)
watch(
  () => props.teamId,
  async (newTeamId, oldTeamId) => {
    if (newTeamId && newTeamId !== oldTeamId && props.dialog) {
      await fetchRoles()
    }
  },
)

// Watch for role updates to refresh the role list (only if dialog is open)
watch(
  () => props.roleUpdateTrigger,
  async (newValue, oldValue) => {
    if (newValue !== oldValue && props.dialog && props.teamId) {
      await fetchRoles()
    }
  },
)

// Watch for team members changes to update available users
watch(
  () => props.teamMembers,
  () => {
    // Team members updated, filtered users will be recalculated automatically
  },
  { deep: true },
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
  }

  // Find the selected role object from the list
  const selectedRoleObj = listOfRoles.value.find((r) => r.value === newMemberData.value.role)

  const roleType = selectedRoleObj?.roleType || ROLE_TYPES.MEMBER
  const roleId = roleType === ROLE_TYPES.CUSTOM ? (selectedRoleObj?.roleId ?? null) : null

  console.log('Selected role info:', {
    selectedValue: newMemberData.value.role,
    selectedRoleObj,
    roleType,
    roleId,
  })

  // Update all selected users with role data
  const usersWithRoles = selectedUsers.value.map((user) => ({
    ...user,
    roleType,
    roleId,
  }))
  console.log('usersWithRoles:', usersWithRoles)

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
    console.log('Failed to add members:', error)
    // Restore original selectedUsers if there was an error
    selectedUsers.value = originalSelectedUsers
  }
}
</script>

<template>
  <v-dialog v-model="props.dialog" max-width="700px" persistent>
    <v-card class="elevation-8">
      <!-- Header -->
      <v-card-title class="text-h5 font-weight-bold text-center py-6 bg-primary text-white">
        <v-icon start size="large">mdi-account-plus</v-icon>
        Add Team Members
      </v-card-title>

      <v-card-text class="pa-6">
        <!-- Role Selection -->
        <div class="mb-6">
          <h3 class="text-h6 mb-3 d-flex align-center">
            <v-icon start color="primary">mdi-account-cog</v-icon>
            Select Role for New Members
          </h3>
          <v-select
            v-model="newMemberData.role"
            :items="listOfRoles"
            item-title="title"
            item-value="value"
            label="Assign Role"
            variant="outlined"
            density="comfortable"
            required
            prepend-inner-icon="mdi-shield-account"
          >
            <template v-slot:selection="{ item }">
              <v-chip :color="item.raw.color || 'blue'" variant="tonal">
                <v-icon start>
                  {{ item.raw.icon || 'mdi-account' }}
                </v-icon>
                {{ item.raw.title }}
              </v-chip>
            </template>
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props">
                <template v-slot:prepend>
                  <v-icon :color="item.raw.color || 'blue'">
                    {{ item.raw.icon || 'mdi-account' }}
                  </v-icon>
                </template>
              </v-list-item>
            </template>
          </v-select>
        </div>

        <!-- Selected Users Display -->
        <div v-if="selectedUsers.length > 0" class="mb-6">
          <h3 class="text-h6 mb-3 d-flex align-center">
            <v-icon start color="success">mdi-account-check</v-icon>
            Selected Members ({{ selectedUsers.length }})
          </h3>
          <v-card variant="outlined" class="pa-3">
            <v-chip-group>
              <v-chip
                v-for="(user, index) in selectedUsers"
                :key="user.userId"
                class="ma-1"
                closable
                @click:close="removeSelectedUser(user.userId)"
                color="success"
                variant="tonal"
                size="large"
              >
                <v-icon start>mdi-account</v-icon>
                {{ user.username }}
              </v-chip>
            </v-chip-group>
          </v-card>
        </div>

        <!-- User Search -->
        <div class="mb-4">
          <h3 class="text-h6 mb-3 d-flex align-center">
            <v-icon start color="primary">mdi-account-search</v-icon>
            Search Users
          </h3>
          <v-text-field
            v-model="searchUsernameField"
            label="Search for users to add..."
            placeholder="Type username to search"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-magnify"
            clearable
            class="mb-2"
          ></v-text-field>

          <!-- Search Results -->
          <v-card v-if="filteredUsers.length > 0" variant="outlined" class="search-results">
            <v-card-subtitle class="py-2 bg-grey-lighten-4">
              <v-icon start size="small">mdi-account-multiple</v-icon>
              Available Users ({{ filteredUsers.length }})
            </v-card-subtitle>
            <v-list density="compact" max-height="250" class="overflow-y-auto">
              <v-list-item
                v-for="user in filteredUsers"
                :key="user.userId"
                @click="selectAUser(user)"
                class="cursor-pointer"
                prepend-icon="mdi-account-plus-outline"
              >
                <v-list-item-title class="font-weight-medium">{{
                  user.username
                }}</v-list-item-title>
                <template v-slot:append>
                  <v-btn icon size="small" variant="text" color="primary">
                    <v-icon>mdi-plus</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-card>

          <!-- No Results Message -->
          <v-card v-else-if="searchUsernameField" variant="outlined" class="text-center pa-4">
            <v-icon size="48" color="grey">mdi-account-search-outline</v-icon>
            <div class="text-body-1 mt-2">No users found matching "{{ searchUsernameField }}"</div>
            <div class="text-caption text-grey">Try a different search term</div>
          </v-card>

          <!-- Initial State Message -->
          <v-card v-else variant="outlined" class="text-center pa-4">
            <v-icon size="48" color="primary">mdi-account-search</v-icon>
            <div class="text-body-1 mt-2">Search for users to add to your team</div>
            <div class="text-caption text-grey">Start typing a username to see available users</div>
          </v-card>
        </div>

        <!-- Status Messages -->
        <v-expand-transition>
          <div v-if="success || error">
            <v-alert
              :type="success ? 'success' : 'error'"
              :text="message"
              variant="tonal"
              class="mb-4"
            >
              <template v-slot:prepend>
                <v-icon>{{ success ? 'mdi-check-circle' : 'mdi-alert-circle' }}</v-icon>
              </template>
            </v-alert>
          </div>
        </v-expand-transition>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-6 bg-grey-lighten-5">
        <v-spacer></v-spacer>
        <v-btn @click="emit('update:dialog', false)" variant="outlined" :disabled="loading">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          @click="addUsers"
          variant="elevated"
          :disabled="loading || selectedUsers.length === 0"
          :loading="loading"
        >
          Add {{ selectedUsers.length }} Member{{ selectedUsers.length !== 1 ? 's' : '' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.filtered-users-list {
  overflow-y: auto;
}

.search-results {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.cursor-pointer {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.cursor-pointer:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.v-chip {
  transition: all 0.2s ease;
}

.v-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.v-card {
  border-radius: 12px;
}

.v-btn {
  border-radius: 8px;
}
</style>
