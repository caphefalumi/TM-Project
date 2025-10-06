<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const DEFAULT_ROLE_COLORS = {
  admin: 'red',
  member: 'blue',
}

const router = useRouter()

const props = defineProps({
  dialog: {
    type: Boolean,
    required: true,
  },
  userProps: {
    type: Object,
    required: true,
  },
  members: {
    type: Array,
    required: true,
  },
  teamId: {
    type: String,
    required: true,
  },
})

const success = ref(false)
const error = ref(false)
const message = ref('')
const loading = ref(false)

const searchUsernameField = ref('')

const selectedMembers = ref([])

const resetSelectedMembers = () => {
  selectedMembers.value = []
}

const emit = defineEmits(['update:dialog', 'members-removed'])

// Compute members that can be removed (excluding current user)
const removableMembers = computed(() => {
  return props.members.filter(
    (member) =>
      member.userId !== props.userProps.userId &&
      member.username.includes(searchUsernameField.value),
  )
})

const toggleMemberSelection = (member) => {
  const index = selectedMembers.value.findIndex((m) => m.userId === member.userId)
  if (index === -1) {
    // If not selected, add to selected list
    selectedMembers.value.push(member)
  } else {
    // If already selected, remove from selected list
    selectedMembers.value.splice(index, 1)
  }
}

const isSelected = (userId) => {
  return selectedMembers.value.some((member) => member.userId === userId)
}

const getMemberChipColor = (member) => {
  if (member?.customRole?.color) {
    return member.customRole.color
  }

  const baseRole = member?.baseRole || member?.role || 'Member'
  return DEFAULT_ROLE_COLORS[baseRole.toLowerCase()] || 'primary'
}

const removeMembers = async () => {
  if (selectedMembers.value.length === 0) {
    error.value = true
    success.value = false
    message.value = 'Please select at least one member to remove'
    return
  }

  loading.value = true

  try {
    const PORT = import.meta.env.VITE_API_PORT
    const membersToRemove = selectedMembers.value.map((member) => ({
      userId: member.userId,
    }))
    const response = await fetch(`${PORT}/api/teams/${props.teamId}/users/`, {
      method: 'DELETE',
      credentials: 'include', // Include cookies for authentication
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important: sends refresh token cookie
      body: JSON.stringify(membersToRemove),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to remove members')
    }

    success.value = true
    error.value = false
    message.value = 'Members removed successfully!'

    // Emit event after successful removal
    emit('members-removed')

    // Close dialog after a short delay
    setTimeout(() => {
      closeDialog()
    }, 1500)
  } catch (err) {
    console.log('Error removing members:', err)
    error.value = true
    success.value = false
    message.value = err.message || 'Failed to remove members'
  } finally {
    loading.value = false
  }
}

const closeDialog = () => {
  resetSelectedMembers()
  success.value = false
  error.value = false
  message.value = ''
  emit('update:dialog', false)
}

onMounted(() => {
  resetSelectedMembers()
})
</script>

<template>
  <v-dialog v-model="props.dialog" max-width="600px" persistent>
    <v-card>
      <v-card-title class="font-weight-bold text-center text-h5 mb-2 mt-2">
        Remove Team Members
      </v-card-title>

      <v-card-text>
        <p class="mb-4">Select the members you want to remove from the team:</p>

        <!-- Display alert messages -->
        <v-alert v-if="success" type="success" class="mb-4" closable>{{ message }}</v-alert>
        <v-alert v-if="error" type="error" class="mb-4" closable>{{ message }}</v-alert>

        <!-- Search field - placed outside the conditional so it's always visible -->
        <v-text-field
          v-model="searchUsernameField"
          label="Search members by username"
          prepend-inner-icon="mdi-magnify"
          class="mb-4"
          variant="outlined"
        ></v-text-field>

        <!-- Selected members -->
        <div v-if="selectedMembers.length > 0" class="mb-4">
          <p class="text-subtitle-1 mb-2">Selected for removal:</p>
          <v-chip
            v-for="member in selectedMembers"
            :key="member.userId"
            class="ma-1"
            :color="getMemberChipColor(member)"
            closable
            @click:close="toggleMemberSelection(member)"
          >
            {{ member.username }} ({{ member.roleLabel || member.baseRole || member.role }})
          </v-chip>
        </div>

        <!-- Member list -->
        <v-list v-if="removableMembers.length > 0">
          <v-list-item
            v-for="member in removableMembers"
            :key="member.userId"
            @click="toggleMemberSelection(member)"
            :class="{ 'selected-member': isSelected(member.userId) }"
          >
            <v-list-item-title class="d-flex align-center justify-space-between">
              <span>{{ member.username }}</span>
              <v-chip size="small" :color="getMemberChipColor(member)">
                {{ member.roleLabel || member.baseRole || member.role }}
              </v-chip>
            </v-list-item-title>
            <template v-slot:append>
              <v-icon v-if="isSelected(member.userId)" color="error">mdi-check</v-icon>
            </template>
          </v-list-item>
        </v-list>

        <v-alert v-else type="info" class="mt-4">
          There are no other members in this team that you can remove.
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="outlined" @click="closeDialog" :disabled="loading"> Cancel </v-btn>
        <v-btn
          color="error"
          variant="elevated"
          @click="removeMembers"
          :loading="loading"
          :disabled="selectedMembers.length === 0 || loading"
        >
          Remove Selected Members
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.selected-member {
  background-color: rgba(244, 67, 54, 0.1);
}

.selected-member:hover {
  background-color: rgba(244, 67, 54, 0.2);
}

.v-list-item {
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.v-list-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
