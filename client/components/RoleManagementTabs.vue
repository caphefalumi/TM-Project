<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { permissionService, AVAILABLE_PERMISSIONS } from '../services/permissionService.js'

const props = defineProps({
  teamId: {
    type: String,
    required: true,
  },
  userProps: {
    type: Object,
    required: true,
  },
  teamMembers: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['roles-updated'])

// Reactive state
const activeTab = ref('manage-roles')
const loading = ref(false)
const success = ref(false)
const error = ref(false)
const message = ref('')

// Custom roles state
const customRoles = ref([])
const createRoleDialog = ref(false)
const editRoleDialog = ref(false)
const deleteRoleDialog = ref(false)
const selectedRole = ref(null)

// New role form
const newRole = ref({
  name: '',
  permissions: [],
  icon: 'mdi-star',
  color: 'purple',
})

// Member role assignment state
const memberRoleDialog = ref(false)
const selectedMember = ref(null)
const searchQuery = ref('')
const pendingRoleChange = ref(null)
const confirmRoleDialog = ref(false)

const getRoleDisplayName = (roleType, roleId = null) => {
  if (roleType === 'admin') {
    return 'Admin'
  }

  if (roleType === 'member') {
    return 'Member'
  }

  if (roleType === 'custom' && roleId) {
    const role = customRoles.value.find((r) => r._id === roleId)
    return role ? role.name : 'Custom Role'
  }

  return 'Member'
}

// Permissions viewer dialog state
const permissionsViewDialog = ref(false)
const selectedRoleForView = ref(null)

// Available icons for custom roles
const availableIcons = [
  'mdi-star',
  'mdi-crown',
  'mdi-shield',
  'mdi-account-star',
  'mdi-medal',
  'mdi-fire',
  'mdi-lightning-bolt',
  'mdi-diamond',
  'mdi-heart',
  'mdi-star-circle',
  'mdi-trophy',
  'mdi-rocket',
  'mdi-flash',
  'mdi-shield-star',
  'mdi-account-circle',
  'mdi-palette',
  'mdi-wrench',
  'mdi-cog',
  'mdi-tools',
  'mdi-hammer',
  'mdi-briefcase',
  'mdi-folder-star',
  'mdi-flag',
  'mdi-star-box',
  'mdi-gift',
]

// Available colors for custom roles
const availableColors = [
  { name: 'Purple', value: 'purple' },
  { name: 'Deep Purple', value: 'deep-purple' },
  { name: 'Indigo', value: 'indigo' },
  { name: 'Blue', value: 'blue' },
  { name: 'Light Blue', value: 'light-blue' },
  { name: 'Cyan', value: 'cyan' },
  { name: 'Teal', value: 'teal' },
  { name: 'Green', value: 'green' },
  { name: 'Light Green', value: 'light-green' },
  { name: 'Lime', value: 'lime' },
  { name: 'Yellow', value: 'yellow' },
  { name: 'Amber', value: 'amber' },
  { name: 'Orange', value: 'orange' },
  { name: 'Deep Orange', value: 'deep-orange' },
  { name: 'Brown', value: 'brown' },
  { name: 'Blue Grey', value: 'blue-grey' },
  { name: 'Pink', value: 'pink' },
  { name: 'Red', value: 'red' },
]

// Available permissions - use centralized config
const availablePermissions = AVAILABLE_PERMISSIONS

const filteredMembers = computed(() => {
  let members = props.teamMembers

  // Filter out the current user (they cannot change their own role)
  members = members.filter((member) => member.userId !== props.userProps.userId)

  if (!searchQuery.value) {
    return members
  }
  return members.filter((member) => member.username.includes(searchQuery.value))
})

const permissionsByCategory = computed(() => {
  const categories = {}
  // Filter out admin-only permissions AND basic permissions for custom roles
  const availableForCustomRoles = availablePermissions.filter(
    (permission) => permission.category !== 'Admin Only' && permission.category !== 'Basic',
  )

  availableForCustomRoles.forEach((permission) => {
    if (!categories[permission.category]) {
      categories[permission.category] = []
    }
    categories[permission.category].push(permission)
  })
  return categories
})

// Methods
const fetchCustomRoles = async () => {
  try {
    loading.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${props.teamId}/roles`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch custom roles')
    }
    const data = await response.json()
    customRoles.value = data.roles || []
  } catch (err) {
    console.log('Error fetching custom roles:', err)
    error.value = true
    message.value = 'Failed to fetch custom roles'
  } finally {
    loading.value = false
  }
}

const createCustomRole = async () => {
  try {
    loading.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/teams/${props.teamId}/roles`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newRole.value.name,
        permissions: newRole.value.permissions,
        icon: newRole.value.icon,
        color: newRole.value.color,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create custom role')
    }

    const data = await response.json()
    success.value = true
    message.value = 'Custom role created successfully!'
    createRoleDialog.value = false
    resetNewRole()
    await fetchCustomRoles()
  } catch (err) {
    console.log('Error creating custom role:', err)
    error.value = true
    message.value = 'Failed to create custom role'
  } finally {
    loading.value = false
  }
}

const updateCustomRole = async () => {
  try {
    loading.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${props.teamId}/roles/${selectedRole.value._id}`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selectedRole.value.name,
          permissions: selectedRole.value.permissions,
          icon: selectedRole.value.icon,
          color: selectedRole.value.color,
        }),
      },
    )

    if (!response.ok) {
      throw new Error('Failed to update custom role')
    }

    success.value = true
    message.value = 'Custom role updated successfully!'
    editRoleDialog.value = false
    await fetchCustomRoles()
    emit('roles-updated')
  } catch (err) {
    console.log('Error updating custom role:', err)
    error.value = true
    message.value = 'Failed to update custom role'
  } finally {
    loading.value = false
  }
}

const deleteCustomRole = async () => {
  try {
    loading.value = true
    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(
      `${PORT}/api/teams/${props.teamId}/roles/${selectedRole.value._id}`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (!response.ok) {
      throw new Error('Failed to delete custom role')
    }

    success.value = true
    message.value = 'Custom role deleted successfully!'
    deleteRoleDialog.value = false
    await fetchCustomRoles()
    emit('roles-updated')
  } catch (err) {
    console.log('Error deleting custom role:', err)
    error.value = true
    message.value = 'Failed to delete custom role'
  } finally {
    loading.value = false
  }
}

const assignRole = async (member, roleType, roleId = null) => {
  try {
    loading.value = true
    const PORT = import.meta.env.VITE_API_PORT

    // Use unified endpoint for role assignment
    const endpoint = `${PORT}/api/teams/${props.teamId}/members/${member.userId}/assign-role`
    const body = {
      roleType,
      roleId: roleId || null,
    }

    const response = await fetch(endpoint, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to assign role')
    }

    const result = await response.json()

    success.value = true
    const roleName = getRoleDisplayName(roleType, roleId)
    message.value = `Role assigned to ${member.username} successfully! (${roleName})`

    const baseRole = roleType === 'admin' ? 'Admin' : 'Member'
    member.roleType = roleType
    member.baseRole = baseRole
    member.roleLabel = roleType === 'custom' ? roleName : baseRole
    if (roleType === 'custom' && roleId) {
      const role = customRoles.value.find((r) => r._id === roleId)
      member.customRole = role
        ? {
            id: role._id,
            name: role.name,
            permissions: role.permissions,
            icon: role.icon,
            color: role.color,
          }
        : null
    } else {
      member.customRole = null
    }

    memberRoleDialog.value = false
    confirmRoleDialog.value = false
    emit('roles-updated')
  } catch (err) {
    console.log('Error assigning role:', err)
    error.value = true
    message.value = err.message || 'Failed to assign role'
  } finally {
    loading.value = false
  }
}

const confirmRoleChange = (member, roleType, roleId = null) => {
  const roleName = getRoleDisplayName(roleType, roleId)
  pendingRoleChange.value = {
    member,
    roleType,
    roleId,
    roleName,
  }
  confirmRoleDialog.value = true
}

const executeRoleChange = () => {
  if (pendingRoleChange.value) {
    assignRole(
      pendingRoleChange.value.member,
      pendingRoleChange.value.roleType,
      pendingRoleChange.value.roleId,
    )
  }
}

const cancelRoleChange = () => {
  pendingRoleChange.value = null
  confirmRoleDialog.value = false
}

const resetNewRole = () => {
  newRole.value = {
    name: '',
    permissions: [],
    icon: 'mdi-star',
    color: 'purple',
  }
}

const openCreateRoleDialog = () => {
  resetNewRole()
  createRoleDialog.value = true
}

const openEditRoleDialog = (role) => {
  selectedRole.value = {
    ...role,
    icon: role.icon || 'mdi-star',
    color: role.color || 'purple',
  }
  editRoleDialog.value = true
}

const openDeleteRoleDialog = (role) => {
  selectedRole.value = role
  deleteRoleDialog.value = true
}

const openMemberRoleDialog = (member) => {
  selectedMember.value = member
  memberRoleDialog.value = true
}

const openPermissionsViewDialog = (role) => {
  selectedRoleForView.value = role
  permissionsViewDialog.value = true
}

const closePermissionsViewDialog = () => {
  permissionsViewDialog.value = false
  selectedRoleForView.value = null
}

const getPermissionsByCategory = (category) => {
  if (!selectedRoleForView.value || !selectedRoleForView.value.permissions) return []
  return selectedRoleForView.value.permissions.filter((permission) => {
    const permissionObj = availablePermissions.find((p) => p.key === permission)
    return permissionObj && permissionObj.category.toLowerCase() === category.toLowerCase()
  })
}

// Watch for teamId changes
watch(
  () => props.teamId,
  (newTeamId) => {
    if (newTeamId) {
      fetchCustomRoles()
    }
  },
)

// Initialize
onMounted(async () => {
  if (props.teamId) {
    // Initialize permission service with user permissions
    await permissionService.fetchUserActions(props.teamId, props.userProps.userId)
    fetchCustomRoles()
  }
})
</script>

<template>
  <v-container fluid>
    <!-- Header -->
    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 mb-4">Role Management</h2>
        <v-alert v-if="success" type="success" class="mb-4" closable @click:close="success = false">
          {{ message }}
        </v-alert>
        <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = false">
          {{ message }}
        </v-alert>
      </v-col>
    </v-row>

    <!-- Tabs -->
    <v-row>
      <v-col cols="12">
        <v-tabs v-model="activeTab" align-tabs="start">
          <v-tab value="manage-roles">
            <v-icon start>mdi-star-settings</v-icon>
            Custom Roles
          </v-tab>
          <v-tab value="assign-roles">
            <v-icon start>mdi-account-cog</v-icon>
            Assign Roles
          </v-tab>
          <v-tab value="permissions">
            <v-icon start>mdi-shield-check</v-icon>
            Role Permissions
          </v-tab>
        </v-tabs>
      </v-col>
    </v-row>

    <v-window v-model="activeTab">
      <!-- Custom Roles Management Tab -->
      <v-window-item value="manage-roles">
        <v-row class="mt-4">
          <v-col cols="12">
            <div
              class="d-flex flex-column flex-md-row align-md-center justify-space-between gap-2 mb-4"
            >
              <h3 class="text-h6">Custom Roles ({{ customRoles.length }})</h3>
              <v-btn
                @click="openCreateRoleDialog"
                color="primary"
                variant="elevated"
                size="large"
                class="flex-grow-1 flex-md-grow-0 mt-4"
              >
                <v-icon start>mdi-plus</v-icon>
                Create Custom Role
              </v-btn>
            </div>
          </v-col>
        </v-row>
        <!-- Custom Roles List -->
        <v-row v-if="customRoles.length > 0">
          <v-col v-for="role in customRoles" :key="role._id" cols="12" md="6" lg="4">
            <v-card class="mb-4" variant="outlined">
              <v-card-item>
                <v-card-title class="d-flex align-center">
                  <v-icon class="mr-2" :color="role.color || 'purple'">{{
                    role.icon || 'mdi-star'
                  }}</v-icon>
                  {{ role.name }}
                </v-card-title>
                <v-card-subtitle>
                  {{ role.permissions.length }} permissions assigned
                </v-card-subtitle>
              </v-card-item>
              <v-card-text>
                <div class="text-caption mb-2">Permissions:</div>
                <v-chip-group>
                  <v-chip
                    v-for="permission in role.permissions.slice(0, 3)"
                    :key="permission"
                    size="small"
                    color="purple"
                    variant="outlined"
                  >
                    {{
                      availablePermissions.find((p) => p.key === permission)?.label || permission
                    }}
                  </v-chip>
                  <v-chip
                    v-if="role.permissions.length > 3"
                    size="small"
                    variant="text"
                    color="blue"
                    @click="openPermissionsViewDialog(role)"
                    style="cursor: pointer"
                  >
                    +{{ role.permissions.length - 3 }} more
                  </v-chip>
                </v-chip-group>
              </v-card-text>
              <v-card-actions>
                <v-btn
                  @click="openEditRoleDialog(role)"
                  color="primary"
                  variant="outlined"
                  size="small"
                >
                  <v-icon start>mdi-pencil</v-icon>
                  Edit
                </v-btn>
                <v-btn
                  @click="openDeleteRoleDialog(role)"
                  color="error"
                  variant="outlined"
                  size="small"
                >
                  <v-icon start>mdi-delete</v-icon>
                  Delete
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- Empty State -->
        <v-row v-else>
          <v-col cols="12">
            <v-card class="text-center pa-6" variant="outlined">
              <v-card-text>
                <v-icon size="64" class="mb-4" color="grey">mdi-star-outline</v-icon>
                <h3 class="text-h6 mb-2">No Custom Roles</h3>
                <p class="text-grey mb-4">
                  Create custom roles with specific permissions for your team members.
                </p>
                <v-btn color="primary" @click="openCreateRoleDialog" size="large">
                  <v-icon start>mdi-plus</v-icon>
                  Create Your First Custom Role
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Assign Roles Tab -->
      <v-window-item value="assign-roles">
        <v-row class="mt-4">
          <v-col cols="12">
            <h3 class="text-h6 mb-4">Assign Roles to Members</h3>

            <!-- Info about role change restrictions -->
            <v-alert type="info" class="mb-4">
              <strong>Note:</strong> You cannot change your own role. Only other team members are
              shown below.
            </v-alert>

            <!-- Search -->
            <v-text-field
              v-model="searchQuery"
              label="Search members..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              class="mb-4"
              clearable
            ></v-text-field>
          </v-col>
        </v-row>
        <!-- Members List -->
        <v-row v-if="filteredMembers.length > 0">
          <v-col v-for="member in filteredMembers" :key="member.userId" cols="12" md="6" lg="4">
            <v-card class="mb-4" variant="outlined">
              <v-card-item>
                <v-card-title class="d-flex align-center">
                  <v-avatar
                    :color="
                      member.customRole
                        ? member.customRole.color || 'purple'
                        : permissionService.getRoleColor(member.baseRole)
                    "
                    class="mr-3"
                  >
                    <v-icon>{{
                      member.customRole
                        ? member.customRole.icon || 'mdi-star'
                        : permissionService.getRoleIcon(member.baseRole)
                    }}</v-icon>
                  </v-avatar>
                  {{ member.username }} </v-card-title
                ><v-card-subtitle>
                  <!-- Show custom role if it exists, otherwise show base role -->
                  <v-chip
                    v-if="member.customRole"
                    :color="member.customRole.color || 'purple'"
                    size="small"
                    variant="tonal"
                  >
                    <v-icon start size="small">{{ member.customRole.icon || 'mdi-star' }}</v-icon>
                    {{ member.customRole.name }}
                  </v-chip>
                  <v-chip
                    v-else
                    :color="permissionService.getRoleColor(member.baseRole)"
                    size="small"
                    variant="tonal"
                  >
                    <v-icon start size="small">{{
                      permissionService.getRoleIcon(member.baseRole)
                    }}</v-icon>
                    {{ member.roleLabel || member.baseRole }}
                  </v-chip>
                </v-card-subtitle>
              </v-card-item>
              <v-card-actions>
                <v-btn
                  @click="openMemberRoleDialog(member)"
                  color="primary"
                  variant="outlined"
                  size="small"
                >
                  <v-icon start>mdi-account-cog</v-icon>
                  Change Role
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- Empty State when no members can have their roles changed -->
        <v-row v-else>
          <v-col cols="12">
            <v-card class="text-center pa-6" variant="outlined">
              <v-card-text>
                <v-icon size="64" class="mb-4" color="grey">mdi-account-lock</v-icon>
                <h3 class="text-h6 mb-2">No Members Available</h3>
                <p class="text-grey mb-0">
                  {{
                    searchQuery
                      ? 'No members found matching your search that can have their roles changed.'
                      : 'There are no other team members whose roles you can change.'
                  }}
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Role Permissions Overview Tab -->
      <v-window-item value="permissions">
        <v-row class="mt-4">
          <v-col cols="12">
            <h3 class="text-h6 mb-4">Role Permissions Overview</h3>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="4">
            <v-card color="red-lighten-1" variant="tonal">
              <v-card-title class="text-subtitle-1">
                <v-icon class="mr-2" color="red">mdi-crown</v-icon>
                Admin
              </v-card-title>
              <v-card-text class="text-caption">
                • Full access to all features<br />
                • Add/remove members<br />
                • Delete teams and sub-teams<br />
                • Create sub-teams<br />
                • Manage custom roles<br />
                • All task and announcement permissions<br />
                <strong>• Multiple Admins allowed per team</strong>
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
                <strong>Basic permissions (automatically granted):</strong><br />
                • View team details<br />
                • View tasks and announcements<br />
                • Submit task assignments<br />
                • View team members<br />
                • Assigned by default when added by non-Admin<br />
                • Can receive additional custom permissions
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Custom Roles -->
        <v-row v-if="customRoles.length > 0" class="mt-4">
          <v-col cols="12">
            <h4 class="text-subtitle-1 mb-4">Custom Roles</h4>
          </v-col>
          <v-col v-for="role in customRoles" :key="role._id" cols="12" md="6" lg="4">
            <v-card :color="(role.color || 'purple') + '-lighten-1'" variant="tonal">
              <v-card-title class="text-subtitle-1">
                <v-icon class="mr-2" :color="role.color || 'purple'">{{
                  role.icon || 'mdi-star'
                }}</v-icon>
                {{ role.name }}
              </v-card-title>
              <v-card-text class="text-caption">
                <div v-for="permission in role.permissions.slice(0, 6)" :key="permission">
                  •
                  {{ availablePermissions.find((p) => p.key === permission)?.label || permission }}
                </div>
                <div v-if="role.permissions.length > 6" class="mt-1">
                  <span
                    @click="openPermissionsViewDialog(role)"
                    style="cursor: pointer; color: #1976d2; text-decoration: underline"
                  >
                    ... and {{ role.permissions.length - 6 }} more permissions
                  </span>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>

    <!-- Create Role Dialog -->
    <v-dialog v-model="createRoleDialog" max-width="800px" persistent>
      <v-card>
        <v-card-title class="font-weight-bold text-h6">
          <v-icon class="mr-2" color="primary">mdi-plus</v-icon>
          Create Custom Role
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newRole.name"
            label="Role Name"
            placeholder="e.g., Project Manager, Content Creator"
            variant="outlined"
            class="mb-4"
            required
          ></v-text-field>

          <!-- Icon and Color Selection -->
          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <h4 class="text-subtitle-1 mb-3">Choose Icon</h4>
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" variant="outlined" class="mb-2" block>
                    <v-icon start :color="newRole.color">{{ newRole.icon }}</v-icon>
                    Select Icon
                  </v-btn>
                </template>
                <v-card max-width="400" max-height="300" class="overflow-y-auto">
                  <v-card-text>
                    <v-row>
                      <v-col
                        v-for="icon in availableIcons"
                        :key="icon"
                        cols="3"
                        class="text-center"
                      >
                        <v-btn
                          icon
                          variant="text"
                          @click="newRole.icon = icon"
                          :color="newRole.icon === icon ? newRole.color : 'grey'"
                        >
                          <v-icon>{{ icon }}</v-icon>
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-menu>
            </v-col>
            <v-col cols="12" md="6">
              <h4 class="text-subtitle-1 mb-3">Choose Color</h4>
              <v-select
                v-model="newRole.color"
                :items="availableColors"
                item-title="name"
                item-value="value"
                label="Role Color"
                variant="outlined"
              >
                <template v-slot:selection="{ item }">
                  <v-chip :color="item.raw.value" variant="tonal">
                    <v-icon start>mdi-circle</v-icon>
                    {{ item.raw.name }}
                  </v-chip>
                </template>
                <template v-slot:item="{ item, props }">
                  <v-list-item v-bind="props">
                    <template v-slot:prepend>
                      <v-icon :color="item.raw.value">mdi-circle</v-icon>
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
          </v-row>

          <!-- Preview -->
          <v-card variant="outlined" class="mb-4 pa-3">
            <div class="text-subtitle-2 mb-2">Preview:</div>
            <v-chip :color="newRole.color" size="large" variant="tonal">
              <v-icon start>{{ newRole.icon }}</v-icon>
              {{ newRole.name || 'Role Name' }}
            </v-chip>
          </v-card>

          <div class="mb-4">
            <h4 class="text-subtitle-1 mb-3">Select Permissions</h4>
            <v-alert type="info" variant="tonal" class="mb-3 info-msg">
              <strong>Note:</strong> Basic permissions (View Team, Tasks, Announcements, Members,
              Task Groups, Submit Tasks) are automatically granted to all users and cannot be
              modified.
            </v-alert>
            <v-expansion-panels variant="accordion">
              <v-expansion-panel
                v-for="(permissions, category) in permissionsByCategory"
                :key="category"
              >
                <v-expansion-panel-title>
                  <v-icon class="mr-2">mdi-folder</v-icon>
                  {{ category }} Permissions
                  <v-spacer></v-spacer>
                  <v-chip size="small" variant="outlined">
                    {{ permissions.filter((p) => newRole.permissions.includes(p.key)).length }}/{{
                      permissions.length
                    }}
                  </v-chip>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row>
                    <v-col v-for="permission in permissions" :key="permission.key" cols="12" md="6">
                      <v-checkbox
                        v-model="newRole.permissions"
                        :value="permission.key"
                        :label="permission.label"
                        :hint="permission.description"
                        persistent-hint
                        density="compact"
                      ></v-checkbox>
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="createRoleDialog = false" variant="outlined" :disabled="loading">
            Cancel
          </v-btn>
          <v-btn
            @click="createCustomRole"
            color="primary"
            variant="elevated"
            :loading="loading"
            :disabled="!newRole.name || newRole.permissions.length === 0"
          >
            Create Role
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit Role Dialog -->
    <v-dialog v-model="editRoleDialog" max-width="800px" persistent>
      <v-card v-if="selectedRole">
        <v-card-title class="font-weight-bold text-h6">
          <v-icon class="mr-2" color="primary">mdi-pencil</v-icon>
          Edit Role: {{ selectedRole.name }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="selectedRole.name"
            label="Role Name"
            variant="outlined"
            class="mb-4"
            required
          ></v-text-field>

          <!-- Icon and Color Selection -->
          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <h4 class="text-subtitle-1 mb-3">Choose Icon</h4>
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" variant="outlined" class="mb-2" block>
                    <v-icon start :color="selectedRole.color">{{ selectedRole.icon }}</v-icon>
                    Select Icon
                  </v-btn>
                </template>
                <v-card max-width="400" max-height="300" class="overflow-y-auto">
                  <v-card-text>
                    <v-row>
                      <v-col
                        v-for="icon in availableIcons"
                        :key="icon"
                        cols="3"
                        class="text-center"
                      >
                        <v-btn
                          icon
                          variant="text"
                          @click="selectedRole.icon = icon"
                          :color="selectedRole.icon === icon ? selectedRole.color : 'grey'"
                        >
                          <v-icon>{{ icon }}</v-icon>
                        </v-btn>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-menu>
            </v-col>
            <v-col cols="12" md="6">
              <h4 class="text-subtitle-1 mb-3">Choose Color</h4>
              <v-select
                v-model="selectedRole.color"
                :items="availableColors"
                item-title="name"
                item-value="value"
                label="Role Color"
                variant="outlined"
              >
                <template v-slot:selection="{ item }">
                  <v-chip :color="item.raw.value" variant="tonal">
                    <v-icon start>mdi-circle</v-icon>
                    {{ item.raw.name }}
                  </v-chip>
                </template>
                <template v-slot:item="{ item, props }">
                  <v-list-item v-bind="props">
                    <template v-slot:prepend>
                      <v-icon :color="item.raw.value">mdi-circle</v-icon>
                    </template>
                    <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
          </v-row>

          <!-- Preview -->
          <v-card variant="outlined" class="mb-4 pa-3">
            <div class="text-subtitle-2 mb-2">Preview:</div>
            <v-chip :color="selectedRole.color" size="large" variant="tonal">
              <v-icon start>{{ selectedRole.icon }}</v-icon>
              {{ selectedRole.name || 'Role Name' }}
            </v-chip>
          </v-card>

          <div class="mb-4">
            <h4 class="text-subtitle-1 mb-3">Update Permissions</h4>
            <v-alert type="info" variant="tonal" class="mb-3 info-msg">
              <strong>Note:</strong> Basic permissions (View Team, Tasks, Announcements, Members,
              Task Groups, Submit Tasks) are automatically granted to all users and cannot be
              modified.
            </v-alert>
            <v-expansion-panels variant="accordion">
              <v-expansion-panel
                v-for="(permissions, category) in permissionsByCategory"
                :key="category"
              >
                <v-expansion-panel-title>
                  <v-icon class="mr-2">mdi-folder</v-icon>
                  {{ category }} Permissions
                  <v-spacer></v-spacer>
                  <v-chip size="small" variant="outlined">
                    {{
                      permissions.filter((p) => selectedRole.permissions.includes(p.key)).length
                    }}/{{ permissions.length }}
                  </v-chip>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row>
                    <v-col v-for="permission in permissions" :key="permission.key" cols="12" md="6">
                      <v-checkbox
                        v-model="selectedRole.permissions"
                        :value="permission.key"
                        :label="permission.label"
                        :hint="permission.description"
                        persistent-hint
                        density="compact"
                      ></v-checkbox>
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="editRoleDialog = false" variant="outlined" :disabled="loading">
            Cancel
          </v-btn>
          <v-btn
            @click="updateCustomRole"
            color="primary"
            variant="elevated"
            :loading="loading"
            :disabled="!selectedRole.name || selectedRole.permissions.length === 0"
          >
            Update Role
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Role Dialog -->
    <v-dialog v-model="deleteRoleDialog" max-width="500px" persistent>
      <v-card v-if="selectedRole">
        <v-card-title class="font-weight-bold text-h6">
          <v-icon class="mr-2" color="error">mdi-delete</v-icon>
          Delete Role
        </v-card-title>

        <v-card-text>
          <p>
            Are you sure you want to delete the role <strong>{{ selectedRole.name }}</strong
            >?
          </p>
          <p class="text-caption text-error">
            This action cannot be undone. Members with this role will be reverted to the default
            Member role.
          </p>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="deleteRoleDialog = false" variant="outlined" :disabled="loading">
            Cancel
          </v-btn>
          <v-btn @click="deleteCustomRole" color="error" variant="elevated" :loading="loading">
            Delete Role
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Member Role Assignment Dialog -->
    <v-dialog v-model="memberRoleDialog" max-width="600px" persistent>
      <v-card v-if="selectedMember">
        <v-card-title class="font-weight-bold text-h6">
          <v-icon class="mr-2" color="primary">mdi-account-cog</v-icon>
          Change Role for {{ selectedMember.username }}
        </v-card-title>

        <v-card-text>
          <div class="mb-4">
            <h4 class="text-subtitle-1 mb-3">Current Role</h4>
            <!-- Show custom role if it exists, otherwise show base role -->
            <v-chip
              v-if="selectedMember.customRole"
              :color="selectedMember.customRole.color || 'purple'"
              size="large"
              variant="tonal"
            >
              <v-icon start>{{ selectedMember.customRole.icon || 'mdi-star' }}</v-icon>
              {{ selectedMember.customRole.name }}
            </v-chip>
            <v-chip
              v-else
              :color="permissionService.getRoleColor(selectedMember.baseRole)"
              size="large"
              variant="tonal"
            >
              <v-icon start>{{ permissionService.getRoleIcon(selectedMember.baseRole) }}</v-icon>
              {{ selectedMember.roleLabel || selectedMember.baseRole }}
            </v-chip>
          </div>

          <div class="mb-4">
            <h4 class="text-subtitle-1 mb-3">Assign Default Role</h4>
            <v-row>
              <v-col cols="12" md="4">
                <v-card
                  class="text-center pa-4 cursor-pointer"
                  variant="outlined"
                  :color="
                    !selectedMember.customRole && selectedMember.roleType === 'member'
                      ? 'primary'
                      : ''
                  "
                  @click="confirmRoleChange(selectedMember, 'member')"
                >
                  <v-icon size="40" color="primary">mdi-account</v-icon>
                  <div class="text-subtitle-2 mt-2">Member</div>
                </v-card>
              </v-col>
              <v-col cols="12" md="4">
                <v-card
                  class="text-center pa-4 cursor-pointer"
                  variant="outlined"
                  :color="
                    !selectedMember.customRole && selectedMember.roleType === 'admin' ? 'red' : ''
                  "
                  @click="confirmRoleChange(selectedMember, 'admin')"
                >
                  <v-icon size="40" color="red">mdi-crown</v-icon>
                  <div class="text-subtitle-2 mt-2">Admin</div>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <div v-if="customRoles.length > 0" class="mb-4">
            <h4 class="text-subtitle-1 mb-3">Assign Custom Role</h4>
            <v-row>
              <v-col v-for="role in customRoles" :key="role._id" cols="12" md="6">
                <v-card
                  class="text-center pa-4 cursor-pointer"
                  variant="outlined"
                  :color="selectedMember.customRole?.id === role._id ? role.color || 'purple' : ''"
                  @click="confirmRoleChange(selectedMember, 'custom', role._id)"
                >
                  <v-icon size="40" :color="role.color || 'purple'">{{
                    role.icon || 'mdi-star'
                  }}</v-icon>
                  <div class="text-subtitle-2 mt-2">{{ role.name }}</div>
                  <div class="text-caption">{{ role.permissions.length }} permissions</div>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="memberRoleDialog = false" variant="outlined" :disabled="loading">
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Permissions View Dialog -->
    <v-dialog v-model="permissionsViewDialog" max-width="600px" persistent>
      <v-card v-if="selectedRoleForView">
        <v-card-title class="font-weight-bold text-h6 d-flex align-center">
          <v-icon class="mr-2" :color="selectedRoleForView.color || 'purple'">
            {{ selectedRoleForView.icon || 'mdi-star' }}
          </v-icon>
          {{ selectedRoleForView.name }} Permissions
        </v-card-title>
        <v-card-subtitle> View all permissions assigned to this custom role </v-card-subtitle>

        <v-card-text>
          <div class="mb-3">
            <strong>Total Permissions: {{ selectedRoleForView.permissions.length }}</strong>
          </div>

          <!-- Permission Categories -->
          <v-expansion-panels variant="accordion" multiple>
            <!-- View Permissions -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-2">mdi-eye</v-icon>
                View Permissions ({{ getPermissionsByCategory('view').length }})
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-chip-group>
                  <v-chip
                    v-for="permission in getPermissionsByCategory('view')"
                    :key="permission"
                    size="small"
                    color="green"
                    variant="outlined"
                    class="ma-1"
                  >
                    <v-icon start size="small">mdi-check</v-icon>
                    {{
                      availablePermissions.find((p) => p.key === permission)?.label || permission
                    }}
                  </v-chip>
                </v-chip-group>
                <div
                  v-if="getPermissionsByCategory('view').length === 0"
                  class="text-caption text-grey"
                >
                  No view permissions assigned
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Action Permissions -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-2">mdi-play</v-icon>
                Action Permissions ({{ getPermissionsByCategory('action').length }})
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-chip-group>
                  <v-chip
                    v-for="permission in getPermissionsByCategory('action')"
                    :key="permission"
                    size="small"
                    color="blue"
                    variant="outlined"
                    class="ma-1"
                  >
                    <v-icon start size="small">mdi-check</v-icon>
                    {{
                      availablePermissions.find((p) => p.key === permission)?.label || permission
                    }}
                  </v-chip>
                </v-chip-group>
                <div
                  v-if="getPermissionsByCategory('action').length === 0"
                  class="text-caption text-grey"
                >
                  No action permissions assigned
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Management Permissions -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-2">mdi-shield-crown</v-icon>
                Management Permissions ({{ getPermissionsByCategory('management').length }})
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-chip-group>
                  <v-chip
                    v-for="permission in getPermissionsByCategory('management')"
                    :key="permission"
                    size="small"
                    color="orange"
                    variant="outlined"
                    class="ma-1"
                  >
                    <v-icon start size="small">mdi-check</v-icon>
                    {{
                      availablePermissions.find((p) => p.key === permission)?.label || permission
                    }}
                  </v-chip>
                </v-chip-group>
                <div
                  v-if="getPermissionsByCategory('management').length === 0"
                  class="text-caption text-grey"
                >
                  No management permissions assigned
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- All Permissions List -->
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
                All Permissions ({{ selectedRoleForView.permissions.length }})
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact">
                  <v-list-item
                    v-for="permission in selectedRoleForView.permissions"
                    :key="permission"
                    class="px-0"
                  >
                    <template v-slot:prepend>
                      <v-icon color="success" size="small">mdi-check-circle</v-icon>
                    </template>
                    <v-list-item-title class="text-body-2">
                      {{
                        availablePermissions.find((p) => p.key === permission)?.label || permission
                      }}
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                      {{
                        availablePermissions.find((p) => p.key === permission)?.description ||
                        'Custom permission'
                      }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="closePermissionsViewDialog" color="primary" variant="outlined">
            Close
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Role Change Confirmation Dialog -->
    <v-dialog v-model="confirmRoleDialog" max-width="500px" persistent>
      <v-card v-if="pendingRoleChange">
        <v-card-title class="font-weight-bold text-h6">
          <v-icon class="mr-2" color="warning">mdi-alert</v-icon>
          Confirm Role Change
        </v-card-title>

        <v-card-text>
          <p class="mb-3">
            Are you sure you want to change <strong>{{ pendingRoleChange.member.username }}</strong
            >'s role to <strong>{{ pendingRoleChange.roleName }}</strong
            >?
          </p>

          <v-alert type="info" variant="tonal" class="mb-3">
            <div class="d-flex align-center">
              <div>
                <div class="font-weight-medium">Current Role:</div>
                <!-- Show custom role if it exists, otherwise show base role -->
                <v-chip
                  v-if="pendingRoleChange.member.customRole"
                  :color="pendingRoleChange.member.customRole.color || 'purple'"
                  size="small"
                  variant="tonal"
                  class="mt-1"
                >
                  <v-icon start size="small">{{
                    pendingRoleChange.member.customRole.icon || 'mdi-star'
                  }}</v-icon>
                  {{ pendingRoleChange.member.customRole.name }}
                </v-chip>
                <v-chip
                  v-else
                  :color="permissionService.getRoleColor(pendingRoleChange.member.baseRole)"
                  size="small"
                  variant="tonal"
                  class="mt-1"
                >
                  <v-icon start size="small">{{
                    permissionService.getRoleIcon(pendingRoleChange.member.baseRole)
                  }}</v-icon>
                  {{ pendingRoleChange.member.roleLabel || pendingRoleChange.member.baseRole }}
                </v-chip>
              </div>
              <v-icon class="mx-4" color="grey">mdi-arrow-right</v-icon>
              <div>
                <div class="font-weight-medium">New Role:</div>
                <v-chip
                  :color="
                    pendingRoleChange.roleId
                      ? customRoles.find((r) => r._id === pendingRoleChange.roleId)?.color ||
                        'purple'
                      : permissionService.getRoleColor(pendingRoleChange.roleType)
                  "
                  size="small"
                  variant="tonal"
                  class="mt-1"
                >
                  <v-icon start size="small">
                    {{
                      pendingRoleChange.roleId
                        ? customRoles.find((r) => r._id === pendingRoleChange.roleId)?.icon ||
                          'mdi-star'
                        : permissionService.getRoleIcon(pendingRoleChange.roleType)
                    }}
                  </v-icon>
                  {{ pendingRoleChange.roleName }}
                </v-chip>
              </div>
            </div>
          </v-alert>

          <p class="text-caption text-warning">
            This action will immediately update the user's permissions and access level.
          </p>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="cancelRoleChange" variant="outlined" :disabled="loading"> Cancel </v-btn>
          <v-btn @click="executeRoleChange" color="primary" variant="elevated" :loading="loading">
            Confirm Change
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
  transition: all 0.3s ease;
}

.cursor-pointer:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.info-msg {
  text-align: justify;
}
</style>
