<script setup>
import { computed } from 'vue'
import { permissionService } from '../scripts/permissionService.js'

const props = defineProps({
  isLoading: Boolean,
  teamMembers: Array,
  memberSearchQuery: String
})

const emit = defineEmits(['update:memberSearchQuery'])

const filteredMembers = computed(() => {
  if (!props.memberSearchQuery) {
    return props.teamMembers
  }

  const query = props.memberSearchQuery.trim()

  // If query starts with #, search by role
  if (query.startsWith('#')) {
    const roleQuery = query.slice(1) // Remove the # symbol
    if (!roleQuery) return props.teamMembers // If just # without role name, show all

    return props.teamMembers.filter((member) => {
      if (member.customRole?.name) {
        return member.customRole.name.toLowerCase().includes(roleQuery)
      }
      const roleName = member.roleLabel || member.baseRole || ''
      return roleName.toLowerCase().includes(roleQuery)
    })
  }

  // Otherwise, search by username
  return props.teamMembers.filter((member) => member.username.includes(query))
})
</script>

<template>
  <!-- Loading State for Members -->
  <div v-if="isLoading">
    <v-row>
      <v-col cols="12">
        <v-skeleton-loader type="heading" width="200px" class="mb-4"></v-skeleton-loader>

        <!-- Search box skeleton -->
        <v-skeleton-loader type="text" height="40px" class="mb-4"></v-skeleton-loader>
      </v-col>
    </v-row>

    <!-- Members skeleton grid -->
    <v-row>
      <v-col v-for="n in 8" :key="`member-skeleton-${n}`" cols="12" md="4">
        <v-card class="mb-2" variant="outlined">
          <v-card-item>
            <v-skeleton-loader type="list-item" class="mb-2"></v-skeleton-loader>
            <v-skeleton-loader type="chip" width="80px"></v-skeleton-loader>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>
  </div>

  <!-- Actual Members Content -->
  <div v-else>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4">
          <h2 class="text-h5">Team Members ({{ filteredMembers.length }})</h2>
        </div>

        <!-- Search Box -->
        <v-text-field
          :model-value="memberSearchQuery"
          @update:model-value="$emit('update:memberSearchQuery', $event)"
          label="Search members..."
          placeholder="Search by username or #role (e.g., #admin, #the-pro)"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="compact"
          clearable
          hide-details
          class="mb-4"
        >
          <template v-slot:append-inner>
            <v-tooltip location="top">
              <template v-slot:activator="{ props }">
                <v-icon v-bind="props" color="grey">mdi-help-circle-outline</v-icon>
              </template>
              <div>
                <div><strong>Search Tips:</strong></div>
                <div>• Type username to search by name</div>
                <div>• Type #role to search by role</div>
                <div>• Examples: john, #admin</div>
              </div>
            </v-tooltip>
          </template>
        </v-text-field>
      </v-col>
      <v-col v-for="member in filteredMembers" :key="member.userId" cols="12" md="4">
        <v-card
          class="mb-2"
          variant="outlined"
          :color="
            member.customRole
              ? member.customRole.color || 'purple'
              : permissionService.getRoleColor(member.baseRole)
          "
        >
          <v-card-item>
            <v-card-title>{{ member.username }}</v-card-title>
            <v-card-subtitle>
              <!-- Show custom role if it exists, otherwise show base role -->
              <v-chip
                v-if="member.customRole"
                :color="member.customRole.color || 'purple'"
                size="small"
                variant="tonal"
              >
                <v-icon start size="small">{{
                  member.customRole.icon || 'mdi-star'
                }}</v-icon>
                {{ member.customRole.name }}
              </v-chip>
              <v-chip
                v-else
                :color="permissionService.getRoleColor(member.baseRole)"
                size="small"
                variant="tonal"
              >
                <v-icon start size="small">{{ permissionService.getRoleIcon(member.baseRole) }}</v-icon>
                {{ member.roleLabel || member.baseRole }}
              </v-chip>
            </v-card-subtitle>
          </v-card-item>
        </v-card>
      </v-col>
    </v-row>

    <!-- No Results State -->
    <v-row v-if="filteredMembers.length === 0 && memberSearchQuery">
      <v-col cols="12">
        <v-card class="text-center pa-6" variant="outlined">
          <v-card-text>
            <v-icon size="64" class="mb-4" color="grey">mdi-account-search</v-icon>
            <h3 class="text-h6 mb-2">No Members Found</h3>
            <p class="text-grey mb-2">
              No members match your search: "<strong>{{ memberSearchQuery }}</strong>"
            </p>
            <p class="text-caption text-grey">
              Try searching by username or use #role to search by role (e.g., #admin)
            </p>
            <v-btn
              color="primary"
              variant="outlined"
              @click="$emit('update:memberSearchQuery', '')"
              class="mt-2"
            >
              Clear Search
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
