<script setup>
import { permissionService } from '../scripts/permissionService.js'

const props = defineProps({
  isLoading: Boolean,
  announcements: Array,
  user: Object
})

const emit = defineEmits([
  'toggle-like',
  'view-announcement',
  'edit-announcement',
  'delete-announcement'
])

const getLikeColor = (announcement) => {
  return announcement.likeUsers.includes(props.user.userId) ? 'primary' : ''
}
</script>

<template>
  <!-- Loading State for Announcements -->
  <div v-if="isLoading">
    <v-row>
      <v-col cols="12">
        <v-skeleton-loader type="heading" width="250px" class="mb-4"></v-skeleton-loader>
      </v-col>
    </v-row>

    <!-- Announcement skeletons -->
    <v-row>
      <v-col cols="12" v-for="n in 3" :key="`announcement-skeleton-${n}`">
        <v-card class="mb-4 elevation-2" variant="outlined">
          <v-card-item>
            <v-skeleton-loader type="list-item" class="mb-2"></v-skeleton-loader>
            <v-skeleton-loader type="heading" width="300px" class="mb-1"></v-skeleton-loader>
            <v-skeleton-loader type="text" width="200px" class="mb-1"></v-skeleton-loader>
            <v-skeleton-loader type="text" width="150px"></v-skeleton-loader>
          </v-card-item>
          <v-card-text>
            <v-skeleton-loader type="paragraph" max-width="100%"></v-skeleton-loader>
          </v-card-text>
          <v-card-actions>
            <v-skeleton-loader type="button" width="80px" class="mr-2"></v-skeleton-loader>
            <v-skeleton-loader type="button" width="100px"></v-skeleton-loader>
            <v-spacer></v-spacer>
            <v-skeleton-loader type="button" width="60px" class="mr-2"></v-skeleton-loader>
            <v-skeleton-loader type="button" width="70px"></v-skeleton-loader>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>

  <!-- Actual Announcements Content -->
  <div v-else>
    <v-row>
      <v-col cols="12">
        <h2 class="text-h5 mb-4">Team Announcements</h2>
        <v-card v-if="announcements.length == 0" class="mb-4">
          <v-card-text>
            <p class="text-center text-grey">No announcements yet.</p>
          </v-card-text>
        </v-card>
        <v-card
          v-for="announcement in announcements"
          :key="announcement._id"
          class="mb-4 elevation-2"
          variant="outlined"
        >
          <v-card-item>
            <v-card-title>Author: {{ announcement.createdByUsername }} </v-card-title>
            <v-card-title class="font-weight-bold">{{ announcement.title }}</v-card-title>
            <v-card-subtitle v-if="announcement.subtitle" class="text-caption">
              {{ announcement.subtitle }}
            </v-card-subtitle>
            <v-card-subtitle class="text-caption">
              Last Updated at:{{ new Date(announcement.updatedAt).toLocaleDateString() }}
            </v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <p>{{ announcement.content }}</p>
          </v-card-text>
          <v-card-actions class="pa-3">
            <div class="d-flex flex-wrap announcement-actions-wrapper w-100">
              <v-btn
                @click="$emit('toggle-like', announcement._id)"
                :color="getLikeColor(announcement)"
                variant="outlined"
                class="announcement-action-btn"
              >
                <v-icon start>mdi-thumb-up</v-icon>
                <span>Like ({{ announcement.likeUsers.length }})</span>
              </v-btn>
              <v-btn
                @click="$emit('view-announcement', announcement._id)"
                color="secondary"
                variant="outlined"
                class="announcement-action-btn"
              >
                <v-icon start>mdi-comment-text</v-icon>
                <span>Comments</span>
              </v-btn>
              <v-spacer class="d-none d-sm-flex"></v-spacer>
              <v-btn
                v-if="permissionService.canManageAnnouncements()"
                color="primary"
                variant="outlined"
                @click="$emit('edit-announcement', announcement._id)"
                class="announcement-action-btn"
              >
                <v-icon start>mdi-pencil</v-icon>
                <span>Edit</span>
              </v-btn>
              <v-btn
                v-if="permissionService.canDeleteAnnouncements()"
                color="error"
                variant="outlined"
                @click="$emit('delete-announcement', announcement._id)"
                class="announcement-action-btn"
              >
                <v-icon start>mdi-delete</v-icon>
                <span>Delete</span>
              </v-btn>
            </div>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
/* Announcement Action Buttons */
.announcement-actions-wrapper {
  gap: 8px; /* 8px gap in all directions (horizontal and vertical) */
}

.announcement-action-btn {
  /* Mobile: 2 buttons per row with 8px gap between them */
  /* Total width = 100%, gap = 8px, so each button = (100% - 8px) / 2 */
  flex: 0 0 calc((100% - 8px) / 2);
  min-width: 0;
}

/* Tablet and up: auto width */
@media (min-width: 600px) {
  .announcement-action-btn {
    flex: 0 0 auto;
    min-width: auto;
  }
  
  /* Remove margin on mobile, only apply on desktop */
  .announcement-action-btn:not(:first-child) {
    margin-left: 0;
  }
}
</style>
