<template>
  <v-card class="mx-auto my-8" max-width="500">
    <v-card-title>Submit Feedback</v-card-title>
    <v-card-text>
      <v-form ref="form" v-model="valid">
        <v-textarea label="Message" v-model="feedback.message" required></v-textarea>
        <v-select label="Issue Type" :items="issueTypes" v-model="feedback.issue" required></v-select>
        <div class="mt-4">
          <div class="mb-2">Feature Rating</div>
          <v-rating v-model="feedback.featureRating" length="10" color="yellow darken-3" background-color="grey lighten-1" required></v-rating>
        </div>
        <div class="mt-4">
          <div class="mb-2">Performance Rating</div>
          <v-rating v-model="feedback.perfRating" length="10" color="yellow darken-3" background-color="grey lighten-1" required></v-rating>
        </div>
        <div class="mt-4">
          <div class="mb-2">UI/UX Rating</div>
          <v-rating v-model="feedback.uiRating" length="10" color="yellow darken-3" background-color="grey lighten-1" required></v-rating>
        </div>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" :disabled="!valid" @click="submitFeedback">Submit</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
const valid = ref(false)
const issueTypes = ['bug', 'feature', 'performance', 'ui', 'other']
const feedback = ref({
  message: '',
  issue: '',
  featureRating: 1,
  perfRating: 1,
  uiRating: 1
})

const submitFeedback = async () => {
  const PORT = import.meta.env.VITE_API_PORT
  try {
    const res = await fetch(`${PORT}/api/ratings`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback.value)
    })
    if (!res.ok) { throw new Error('Failed to submit feedback'); }
    feedback.value = { message: '', issue: '', featureRating: 1, perfRating: 1, uiRating: 1 }
    // Optionally show a success message
    alert('Feedback submitted!')
  } catch (err) {
    alert(err.message)
  }
}
</script>

<style scoped>
.v-rating {
  font-size: 2rem;
}
</style>
