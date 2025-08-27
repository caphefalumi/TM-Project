<template>
  <v-dialog v-model="props.dialog" max-width="1000px" persistent>
    <v-card>
      <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2">
        <v-icon class="mr-2" color="primary">mdi-account-cog</v-icon>
        Manage Team Roles & Permissions
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
                    • Access admin panel<br>
                    • Manage custom permissions
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
                  <v-chip
                    v-if="hasCustomPermissions(member)"
                    color="purple"
                    size="small"
                    variant="outlined"
                    class="ml-2"
                  >
                    Custom Permissions
                  </v-chip>
                </v-list-item-subtitle>

                <template v-slot:append v-if="true">
                  <div class="d-flex align-center gap-2">
                    <!-- Role Selection -->
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

                    <!-- Permissions Button -->
                    <v-btn
                      @click="openPermissionsDialog(member)"
                      color="purple"
                      variant="outlined"
                      size="small"
                      :disabled="changingRole === member.userId"
                    >
                      <v-icon start>mdi-cog</v-icon>
                      Permissions
                    </v-btn>
                  </div>
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

    <!-- Permissions Management Dialog -->
    <v-dialog v-model="permissionsDialog" max-width="700px" persistent>
      <v-card v-if="selectedMember">
        <v-card-title class="font-weight-bold text-h6">
          <v-icon class="mr-2" color="purple">mdi-cog</v-icon>
          Custom Permissions for {{ selectedMember.username }}
        </v-card-title>
        <v-card-subtitle>
          Role: {{ selectedMember.role }} | Override default permissions by checking/unchecking boxes
        </v-card-subtitle>

        <v-card-text>
          <v-alert v-if="permissionSuccess" type="success" class="mb-4" closable>
            {{ permissionMessage }}
          </v-alert>
          <v-alert v-if="permissionError" type="error" class="mb-4" closable>
            {{ permissionMessage }}
          </v-alert>

          <!-- Permission Categories -->
          <v-expansion-panels variant="accordion" class="mb-4">
            <!-- Basic Permissions -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-2">mdi-eye</v-icon>
                View Permissions
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">View Team</span>
                      <v-btn
                        :icon="getPermissionIcon('canViewTeam')"
                        :color="getPermissionColor('canViewTeam')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canViewTeam')"
                      ></v-btn>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">View Tasks</span>
                      <v-btn
                        :icon="getPermissionIcon('canViewTasks')"
                        :color="getPermissionColor('canViewTasks')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canViewTasks')"
                      ></v-btn>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">View Announcements</span>
                      <v-btn
                        :icon="getPermissionIcon('canViewAnnouncements')"
                        :color="getPermissionColor('canViewAnnouncements')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canViewAnnouncements')"
                      ></v-btn>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">View Members</span>
                      <v-btn
                        :icon="getPermissionIcon('canViewMembers')"
                        :color="getPermissionColor('canViewMembers')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canViewMembers')"
                      ></v-btn>
                    </div>
                  </v-col>
                </v-row>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Action Permissions -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-2">mdi-play</v-icon>
                Action Permissions
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">Submit Tasks</span>
                      <v-btn
                        :icon="getPermissionIcon('canSubmitTasks')"
                        :color="getPermissionColor('canSubmitTasks')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canSubmitTasks')"
                      ></v-btn>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">Edit Announcements</span>
                      <v-btn
                        :icon="getPermissionIcon('canEditAnnouncements')"
                        :color="getPermissionColor('canEditAnnouncements')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canEditAnnouncements')"
                      ></v-btn>
                    </div>
                  </v-col>
                </v-row>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Task Group Permissions -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-2">mdi-folder-multiple</v-icon>
                Task Group Permissions
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">View Task Groups</span>
                      <v-btn
                        :icon="getPermissionIcon('canViewTaskGroups')"
                        :color="getPermissionColor('canViewTaskGroups')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canViewTaskGroups')"
                      ></v-btn>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">Create Task Groups</span>
                      <v-btn
                        :icon="getPermissionIcon('canCreateTaskGroups')"
                        :color="getPermissionColor('canCreateTaskGroups')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canCreateTaskGroups')"
                      ></v-btn>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">Edit Task Groups</span>
                      <v-btn
                        :icon="getPermissionIcon('canEditTaskGroups')"
                        :color="getPermissionColor('canEditTaskGroups')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canEditTaskGroups')"
                      ></v-btn>
                    </div>
                  </v-col>
                </v-row>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Management Permissions (Admin and Moderator) -->
            <v-expansion-panel v-if="selectedMember.role === 'Admin' || selectedMember.role === 'Moderator'">
              <v-expansion-panel-title>
                <v-icon class="mr-2">mdi-shield-crown</v-icon>
                Management Permissions
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">Add Members</span>
                      <v-btn
                        :icon="getPermissionIcon('canAddMembers')"
                        :color="getPermissionColor('canAddMembers')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canAddMembers')"
                      ></v-btn>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">Remove Members</span>
                      <v-btn
                        :icon="getPermissionIcon('canRemoveMembers')"
                        :color="getPermissionColor('canRemoveMembers')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canRemoveMembers')"
                      ></v-btn>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">Delete Teams</span>
                      <v-btn
                        :icon="getPermissionIcon('canDeleteTeams')"
                        :color="getPermissionColor('canDeleteTeams')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canDeleteTeams')"
                      ></v-btn>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">Create Sub-teams</span>
                      <v-btn
                        :icon="getPermissionIcon('canCreateSubTeams')"
                        :color="getPermissionColor('canCreateSubTeams')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canCreateSubTeams')"
                      ></v-btn>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="permission-item d-flex align-center justify-space-between">
                      <span class="permission-label">Change Member Roles</span>
                      <v-btn
                        :icon="getPermissionIcon('canChangeRoles')"
                        :color="getPermissionColor('canChangeRoles')"
                        size="small"
                        variant="text"
                        @click="updatePermission('canChangeRoles')"
                      ></v-btn>
                    </div>
                  </v-col>
                </v-row>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <!-- Default Values Info -->
          <v-alert type="info" variant="tonal" class="mb-4">
            <v-icon class="mr-2">mdi-information</v-icon>
            <strong>Default (Role-based):</strong> Permissions are enabled by default based on the user's role.
            <br>
            <strong>Custom Override:</strong> Check/uncheck to override the default role permissions.
            <br>
            <strong>Gray (Indeterminate):</strong> Using default role permission.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-btn @click="resetToDefaults" color="warning" variant="outlined">
            <v-icon start>mdi-refresh</v-icon>
            Reset to Defaults
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn @click="closePermissionsDialog" variant="outlined" :disabled="savingPermissions">
            Cancel
          </v-btn>
          <v-btn
            @click="savePermissions"
            color="primary"
            :loading="savingPermissions"
            :disabled="savingPermissions"
          >
            Save Permissions
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

// Permissions dialog state
const permissionsDialog = ref(false)
const selectedMember = ref(null)
const customPermissions = ref({})
const originalPermissions = ref({})
const savingPermissions = ref(false)
const permissionSuccess = ref(false)
const permissionError = ref(false)
const permissionMessage = ref('')

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

const hasCustomPermissions = (member) => {
  // Check if member has any custom permissions set
  if (!member.customPermissions) return false
  return Object.values(member.customPermissions).some(value => value !== null)
}

const fetchUserPermissions = async () => {
  try {
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
      userPermissions.value = await response.json()
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

const openPermissionsDialog = async (member) => {
  selectedMember.value = member

  // Fetch member's current permissions
  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${props.teamId}/members/${member.userId}/permissions`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )


    const currentCustomPermissions = await response.json()
    console.log("Permission:", currentCustomPermissions)

    // Initialize custom permissions with current values or null for defaults
    customPermissions.value = {
      canViewTeam: currentCustomPermissions.canViewTeam ?? null,
      canViewTasks: currentCustomPermissions.canViewTasks ?? null,
      canViewAnnouncements: currentCustomPermissions.canViewAnnouncements ?? null,
      canViewMembers: currentCustomPermissions.canViewMembers ?? null,
      canSubmitTasks: currentCustomPermissions.canSubmitTasks ?? null,
      canEditAnnouncements: currentCustomPermissions.canEditAnnouncements ?? null,
      canViewTaskGroups: currentCustomPermissions.canViewTaskGroups ?? null,
      canCreateTaskGroups: currentCustomPermissions.canCreateTaskGroups ?? null,
      canEditTaskGroups: currentCustomPermissions.canEditTaskGroups ?? null,
      canAddMembers: currentCustomPermissions.canAddMembers ?? null,
      canRemoveMembers: currentCustomPermissions.canRemoveMembers ?? null,
      canDeleteTeams: currentCustomPermissions.canDeleteTeams ?? null,
      canCreateSubTeams: currentCustomPermissions.canCreateSubTeams ?? null,
      canChangeRoles: currentCustomPermissions.canChangeRoles ?? null,
    }

    originalPermissions.value = { ...customPermissions.value }
    permissionsDialog.value = true
  } catch (error) {
    console.error('Error fetching member permissions:', error)
  }
}

const updatePermission = (permission, value) => {
  // Handle three-state checkbox: null (default) -> true -> false -> null
  const currentValue = customPermissions.value[permission]

  if (currentValue === null) {
    // From default (indeterminate) to true
    customPermissions.value[permission] = true
  } else if (currentValue === true) {
    // From true to false
    customPermissions.value[permission] = false
  } else {
    // From false back to default (null)
    customPermissions.value[permission] = null
  }
}

const resetToDefaults = () => {
  Object.keys(customPermissions.value).forEach(key => {
    customPermissions.value[key] = null
  })
}

const savePermissions = async () => {
  savingPermissions.value = true

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${props.teamId}/members/${selectedMember.value.userId}/permissions`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customPermissions: customPermissions.value }),
      }
    )

    const data = await response.json()

    if (response.ok) {
      permissionSuccess.value = true
      permissionMessage.value = `Successfully updated permissions for ${selectedMember.value.username}`

      // Update local member data
      const memberIndex = props.teamMembers.findIndex(m => m.userId === selectedMember.value.userId)
      if (memberIndex !== -1) {
        props.teamMembers[memberIndex].customPermissions = { ...customPermissions.value }
      }

      emit('roles-updated')

      setTimeout(() => {
        closePermissionsDialog()
      }, 2000)
    } else {
      permissionError.value = true
      permissionMessage.value = data.message || 'Failed to update permissions'
    }
  } catch (error) {
    console.error('Error saving permissions:', error)
    permissionError.value = true
    permissionMessage.value = 'Network error occurred'
  } finally {
    savingPermissions.value = false
  }
}

const closePermissionsDialog = () => {
  permissionsDialog.value = false
  selectedMember.value = null
  customPermissions.value = {}
  originalPermissions.value = {}
  permissionSuccess.value = false
  permissionError.value = false
  permissionMessage.value = ''
}

const closeDialog = () => {
  emit('update:dialog', false)
  searchQuery.value = ''
  success.value = false
  error.value = false
  message.value = ''
}

// Watchers and lifecycle
watch(
  () => props.dialog,
  (newVal) => {
    if (newVal) {
      fetchUserPermissions()
    }
  }
)

onMounted(() => {
  setUserFromProps(props.userProps)
})

const getPermissionIcon = (permission) => {
  const value = customPermissions.value[permission]
  if (value === null) {
    return 'mdi-minus' // Default/indeterminate state
  } else if (value === true) {
    return 'mdi-check' // Enabled
  } else {
    return 'mdi-close' // Disabled
  }
}

const getPermissionColor = (permission) => {
  const value = customPermissions.value[permission]
  if (value === null) {
    return 'grey' // Default/indeterminate state
  } else if (value === true) {
    return 'success' // Enabled - green
  } else {
    return 'error' // Disabled - red
  }
}
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

.gap-2 {
  gap: 8px;
}

.permission-item {
  padding: 8px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s ease;
}

.permission-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
}

.permission-label {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.87);
}

.permission-item:last-child {
  border-bottom: none;
}
</style>
