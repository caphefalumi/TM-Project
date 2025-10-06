<script setup>
const props = defineProps({
  team: Object,
  subTeams: Array,
  teamMembers: Array,
  tasks: Array,
  isLoadingSubTeams: Boolean,
  deleteConfirmationText: String,
  deleteConfirmationChecked: Boolean,
  isDeletingTeam: Boolean,
  canDeleteTeam: Boolean
})

const emit = defineEmits([
  'fetch-sub-teams',
  'update:deleteConfirmationText',
  'update:deleteConfirmationChecked',
  'confirm-delete-team',
  'go-back-to-teams'
])

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}
</script>

<template>
  <div class="delete-team-container">
    <!-- Warning Header -->
    <v-row>
      <v-col cols="12">
        <v-alert
          type="error"
          variant="tonal"
          class="mb-6"
          border="start"
          border-color="error"
        >
          <template v-slot:prepend>
            <v-icon size="large">mdi-alert-circle</v-icon>
          </template>
          <v-alert-title class="text-h5 mb-2">
            <v-icon class="mr-2">mdi-delete</v-icon>
            Delete Team - Permanent Action
          </v-alert-title>
          <div class="text-body-1">
            <p class="mb-2">
              <strong>Warning:</strong> This action will permanently delete the current team
              and all its sub-teams.
            </p>
            <p class="mb-0">
              All associated data including tasks, announcements, and member associations
              will be lost forever.
            </p>
          </div>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Team Hierarchy Preview -->
    <v-row>
      <v-col cols="12">
        <v-card variant="outlined" class="mb-4">
          <v-card-title>
            <div class="d-flex flex-column flex-md-row align-md-center justify-space-between gap-2 w-100">
              <div class="d-flex align-center">
                <v-icon class="mr-2" color="error">mdi-family-tree</v-icon>
                Teams to be Deleted
              </div>
              <v-btn
                @click="$emit('fetch-sub-teams')"
                variant="outlined"
                size="large"
                class="flex-grow-1 flex-md-grow-0 mt-2 mb-2"
                :loading="isLoadingSubTeams"
              >
                <v-icon start>mdi-refresh</v-icon>
                Refresh
              </v-btn>
            </div>
          </v-card-title>

          <v-card-text>
            <!-- Loading State -->
            <div v-if="isLoadingSubTeams" class="py-4">
              <v-skeleton-loader type="list-item-three-line" class="mb-2"></v-skeleton-loader>
              <v-skeleton-loader type="list-item-two-line" class="ml-4 mb-2"></v-skeleton-loader>
              <v-skeleton-loader type="list-item-two-line" class="ml-8"></v-skeleton-loader>
            </div>

            <!-- Hierarchy Tree -->
            <div v-else>
              <!-- Current Team (Root) -->
              <div class="team-hierarchy-item root-team">
                <div class="d-flex align-center mb-2">
                  <v-icon color="error" class="mr-2">mdi-crown</v-icon>
                  <div class="flex-grow-1">
                    <div class="text-h6 font-weight-bold">{{ team.title }}</div>
                    <div class="text-body-2 text-grey">
                      Current Team • {{ team.category }}
                    </div>
                    <div class="text-caption text-grey">
                      {{ teamMembers.length }} members • {{ tasks.length }} tasks
                    </div>
                  </div>
                  <v-chip color="error" variant="tonal" size="small">
                    <v-icon start size="small">mdi-delete</v-icon>
                    WILL BE DELETED
                  </v-chip>
                </div>
              </div>

              <!-- Sub Teams -->
              <div v-if="subTeams.length > 0" class="mt-4">
                <div class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
                  <v-icon class="mr-2">mdi-sitemap</v-icon>
                  Sub-teams ({{ subTeams.length }})
                </div>

                <div
                  v-for="(subTeam, index) in subTeams"
                  :key="subTeam._id"
                  class="sub-team-item"
                  :class="{ 'last-sub-team': index === subTeams.length - 1 }"
                >
                  <div class="d-flex align-center mb-2">
                    <!-- Hierarchy Lines -->
                    <div class="hierarchy-lines">
                      <div class="vertical-line" v-if="index < subTeams.length"></div>
                      <div class="horizontal-line"></div>
                    </div>

                    <v-icon color="warning" class="mr-2">mdi-source-branch</v-icon>
                    <div class="flex-grow-1">
                      <div class="text-body-1 font-weight-bold">{{ subTeam.title }}</div>
                      <div class="text-body-2 text-grey">
                        Sub-team • {{ subTeam.category }}
                      </div>
                      <div class="text-caption text-grey">
                        Created: {{ formatDate(subTeam.createdAt) }}
                      </div>
                    </div>
                    <v-chip color="warning" variant="tonal" size="small">
                      <v-icon start size="small">mdi-delete</v-icon>
                      WILL BE DELETED
                    </v-chip>
                  </div>
                </div>
              </div>

              <!-- No Sub Teams -->
              <div v-else class="mt-4">
                <v-alert type="info" variant="tonal" class="mb-0">
                  This team has no sub-teams. Only the current team will be deleted.
                </v-alert>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirmation Section -->
    <v-row>
      <v-col cols="12">
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="error">mdi-shield-alert</v-icon>
            Confirmation Required
          </v-card-title>
          <v-card-text>
            <div class="mb-4">
              <p class="text-body-1 mb-3">
                To proceed with deletion, please confirm by typing the team name exactly as
                shown:
              </p>
              <v-chip color="primary" variant="tonal" class="mb-3">
                {{ team.title }}
              </v-chip>
            </div>

            <v-text-field
              :model-value="deleteConfirmationText"
              @update:model-value="$emit('update:deleteConfirmationText', $event)"
              label="Type team name to confirm deletion"
              variant="outlined"
              :placeholder="team.title"
              :error="deleteConfirmationText && deleteConfirmationText !== team.title"
              :error-messages="
                deleteConfirmationText && deleteConfirmationText !== team.title
                  ? 'Team name does not match'
                  : ''
              "
              class="mb-4"
            >
              <template v-slot:prepend-inner>
                <v-icon color="error">mdi-keyboard</v-icon>
              </template>
            </v-text-field>

            <v-checkbox 
              :model-value="deleteConfirmationChecked"
              @update:model-value="$emit('update:deleteConfirmationChecked', $event)"
              color="error" 
              class="mb-4"
            >
              <template v-slot:label>
                <span class="text-body-2">
                  I understand that this action is
                  <strong>permanent and irreversible</strong>. All data will be lost
                  forever.
                </span>
              </template>
            </v-checkbox>
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn @click="$emit('go-back-to-teams')" variant="outlined" size="large">
              <v-icon start>mdi-arrow-left</v-icon>
              Cancel
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              @click="$emit('confirm-delete-team')"
              color="error"
              variant="elevated"
              size="large"
              :disabled="!canDeleteTeam"
              :loading="isDeletingTeam"
            >
              <v-icon start>mdi-delete-forever</v-icon>
              Delete Team
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
/* Delete Team Tab Styles */
.delete-team-container {
  max-width: 1200px;
  margin: 0 auto;
}

.team-hierarchy-item {
  padding: 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-error), 0.05);
  border: 1px solid rgba(var(--v-theme-error), 0.2);
}

.root-team {
  border: 2px solid rgba(var(--v-theme-error), 0.4);
  background: rgba(var(--v-theme-error), 0.08);
}

.sub-team-item {
  position: relative;
  margin-left: 24px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-warning), 0.05);
  border: 1px solid rgba(var(--v-theme-warning), 0.2);
}

.sub-team-item.last-sub-team {
  margin-bottom: 0; /* Remove bottom margin from last item */
}

.sub-team-item.last-sub-team .hierarchy-lines {
  overflow: visible;
}

.hierarchy-lines {
  position: absolute;
  left: -24px;
  top: 0;
  width: 24px;
  height: 100%;
  display: flex;
  align-items: center;
}

.vertical-line {
  position: absolute;
  left: 12px;
  top: -8%;
  height: calc(100% + 12px); /* Extend to connect with next item */
  width: 2px;
  background: rgba(var(--v-theme-primary), 0.3);
}

/* Special styling for the last sub-team's vertical line */
.sub-team-item.last-sub-team .vertical-line {
  height: 32px; /* Only extend to the horizontal line, don't go beyond */
  top: -8px; /* Start from the top of the container */
}

.horizontal-line {
  position: absolute;
  left: 12px;
  top: 24px;
  width: 12px;
  height: 2px;
  background: rgba(var(--v-theme-primary), 0.3);
}

.horizontal-line::before {
  content: '';
  position: absolute;
  right: -3px;
  top: -3px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.6);
}
</style>
