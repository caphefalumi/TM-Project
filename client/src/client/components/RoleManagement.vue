<template>
  <v-dialog v-model="props.dialog" max-width="800px" persistent>
    <v-card>
      <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2">
        <v-icon class="mr-2" color="primary">mdi-account-cog</v-icon>
        Manage Team Roles
      </v-card-title>

      <v-card-text>
        <v-alert v-if="success" type="success" class="mb-4" closable>{{ message }}</v-alert>
        <v-alert v-if="error" type="error" class="mb-4" closable>{{ message }}</v-alert>

        <!-- Role Information Panel -->
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="text-h6">Role Permissions</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <v-card color="red-lighten-1" variant="tonal">
                  <v-card-title class="text-subtitle-1">
                    <v-icon class="mr-2" color="red">mdi-crown</v-icon>
                    Admin
                  </v-card-title>
                  <v-card-text class="text-caption">
                    • Full access to all features<br>
                    • Add/remove members<br>
                    • Delete teams and members<br>
                    • Create sub-teams<br>
                    • Access admin panel
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card color="orange-lighten-1" variant="tonal">
                  <v-card-title class="text-subtitle-1">
                    <v-icon class="mr-2" color="orange">mdi-shield-account</v-icon>
                    Moderator
                  </v-card-title>
                  <v-card-text class="text-caption">
                    • Edit announcements<br>
                    • View task groups<br>
                    • Create new task groups<br>
                    • Edit task groups<br>
                    • Cannot add/remove members
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card color="blue-lighten-1" variant="tonal">
                  <v-card-title class="text-subtitle-1">
                    <v-icon class="mr-2" color="blue">mdi-account</v-icon>
                    Member
                  </v-card-title>
                  <v-card-text class="text-caption">
                    • View-only access<br>
                    • Submit tasks<br>
                    • View announcements<br>
                    • View team members<br>
                    • No special permissions
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Team Members List with Role Management -->
        <v-card variant="outlined">
          <v-card-title class="text-h6">Team Members ({{ teamMembers.length }})</v-card-title>
          <v-card-text>
            <!-- Search field -->
            <v-text-field
              v-model="searchQuery"
              label="Search members..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              class="mb-4"
              clearable
            ></v-text-field>

            <!-- Members list -->
            <v-list>
              <v-list-item
                v-for="member in filteredMembers"
                :key="member.userId"
                class="mb-2"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getRoleColor(member.role)" class="mr-3">
                    <v-icon>{{ getRoleIcon(member.role) }}</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title class="font-weight-medium">
                  {{ member.username }}
                </v-list-item-title>

                <v-list-item-subtitle>
                  <v-chip
                    :color="getRoleColor(member.role)"
                    size="small"
                    variant="tonal"
                  >
                    {{ member.role }}
                  </v-chip>
                </v-list-item-subtitle>

                <template v-slot:append v-if="canChangeRoles">
                  <v-select
                    :model-value="member.role"
                    :items="availableRoles"
                    item-title="label"
                    item-value="value"
                    @update:model-value="changeRole(member, $event)"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="role-select"
                    :loading="changingRole === member.userId"
                    :disabled="changingRole === member.userId"
                  ></v-select>
                </template>

                <template v-slot:append v-else-if="member.userId === user.userId">
                  <v-chip color="info" size="small" variant="outlined">
                    You
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="closeDialog" variant="outlined" :disabled="loading">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

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
    required: true,
  },
})

const emit = defineEmits(['update:dialog', 'roles-updated'])

// Reactive state
const user = ref({
  userId: '',
  username: '',
  email: '',
})

const loading = ref(false)
const success = ref(false)
const error = ref(false)
const message = ref('')
const searchQuery = ref('')
const changingRole = ref(null)
const userPermissions = ref({})

// Available roles for selection
const availableRoles = ref([
  { label: 'Admin', value: 'Admin' },
  { label: 'Moderator', value: 'Moderator' },
  { label: 'Member', value: 'Member' },
])

// Computed properties
const filteredMembers = computed(() => {
  if (!searchQuery.value) return props.teamMembers
  return props.teamMembers.filter(member =>
    member.username.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const canChangeRoles = computed(() => {
  console.log('User permissions in computed:', userPermissions.value.canChangeRoles)
  return userPermissions.value.canChangeRoles || userPermissions.value.isGlobalAdmin
})

// Methods
const setUserFromProps = (userProps) => {
  user.value.userId = userProps.userId
  user.value.username = userProps.username
  user.value.email = userProps.email
}

const getRoleColor = (role) => {
  switch (role) {
    case 'Admin': return 'red'
    case 'Moderator': return 'orange'
    case 'Member': return 'blue'
    default: return 'grey'
  }
}

const getRoleIcon = (role) => {
  switch (role) {
    case 'Admin': return 'mdi-crown'
    case 'Moderator': return 'mdi-shield-account'
    case 'Member': return 'mdi-account'
    default: return 'mdi-help'
  }
}

const fetchUserPermissions = async () => {
  try {
    console.log('Fetching permissions for user:', user.value)
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${props.teamId}/members/${user.value.userId}/permissions`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (response.ok) {
      const data = await response.json()
      console.log('Raw response:', data) // check before assigning
      userPermissions.value = data
      console.log('After assign:', userPermissions.value.role)
    } else {
      console.error('Failed to fetch user permissions')
    }
  } catch (error) {
    console.error('Error fetching user permissions:', error)
  }
}

const changeRole = async (member, newRole) => {
  if (newRole === member.role) return

  changingRole.value = member.userId
  loading.value = true

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${props.teamId}/members/${member.userId}/role`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newRole }),
      }
    )

    const data = await response.json()

    if (response.ok) {
      success.value = true
      message.value = `Successfully changed ${member.username}'s role to ${newRole}`

      // Update the member's role in the local data
      const memberIndex = props.teamMembers.findIndex(m => m.userId === member.userId)
      if (memberIndex !== -1) {
        props.teamMembers[memberIndex].role = newRole
      }

      emit('roles-updated')

      setTimeout(() => {
        success.value = false
        message.value = ''
      }, 3000)
    } else {
      error.value = true
      message.value = data.message || 'Failed to change role'
      setTimeout(() => {
        error.value = false
        message.value = ''
      }, 5000)
    }
  } catch (error) {
    console.error('Error changing role:', error)
    error.value = true
    message.value = 'Network error occurred'
    setTimeout(() => {
      error.value = false
      message.value = ''
    }, 5000)
  } finally {
    changingRole.value = null
    loading.value = false
  }
}

const closeDialog = () => {
  emit('update:dialog', false)
  searchQuery.value = ''
  success.value = false
  error.value = false
  message.value = ''
}


onMounted(() => {
  setUserFromProps(props.userProps)
  fetchUserPermissions()

})
</script>

<style scoped>
.role-select {
  min-width: 120px;
  max-width: 120px;
}

:deep(.v-list-item) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  margin-bottom: 8px;
}

:deep(.v-list-item:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
