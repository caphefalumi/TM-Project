<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  userProps: {
    type: Object,
    required: true,
  },
  teamId: {
    type: String,
    required: true,
  },
  taskId: {
    type: String,
    required: true,
  },
  dialog: {
    type: Boolean,
    required: true,
  },
  task: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['update:dialog', 'submission-success'])

const success = ref(false)
const error = ref(false)
const message = ref('')
const loading = ref(false)

// Form data for submission structure
const submissionForm = ref({
  taskGroupId: props.task.taskGroupId,
  taskId: props.taskId,
  userId: props.userProps.userId,
  teamId: props.teamId,
  submissionData: [],
  submissionDate: '',
})

// Create a separate ref object to store form values with better reactivity
const formValues = ref({})

onMounted(async () => {
  console.log('User Props:', props.userProps)
  // If props.task is defined, initialize the form
  if (props.task && props.task.design && props.task.design.fields) {
    initializeForm()
  }
})

// Initialize or reset the form data
const initializeForm = () => {
  // Reset form values object
  formValues.value = {}

  // Initialize form structure and default values
  if (props.task.design && props.task.design.fields) {
    // Initialize the form values object with default values
    props.task.design.fields.forEach((field) => {
      formValues.value[field.label] = getDefaultValueForField(field)
    })

    // Keep the submission structure for API calls
    submissionForm.value.submissionData = props.task.design.fields.map((field) => ({
      label: field.label,
      type: field.type,
      value: formValues.value[field.label],
    }))
  }
}

// No need for fetchTaskDetails as we're using props.task directly

// Helper function to get a default value based on field type
const getDefaultValueForField = (field) => {
  const isRequired = field.config?.required || false

  switch (field.type.toLowerCase()) {
    case 'short text':
    case 'long text':
    case 'urls':
    case 'phone':
      return isRequired ? '' : '(Not provided)'
    case 'number':
      return field.config.min || 0
    case 'date':
      return new Date().toISOString().split('T')[0]
    case 'select':
      return field.config.options && field.config.options.length > 0
        ? field.config.options[0]
        : '(Not provided)'
    case 'image':
      return isRequired ? null : '(No image)'
    default:
      return isRequired ? '' : '(Not provided)'
  }
}

// Helper function to provide non-empty default values for field types
const getDefaultNonEmptyValue = (fieldType) => {
  switch (fieldType.toLowerCase()) {
    case 'short text':
    case 'long text':
    case 'urls':
    case 'phone':
      return '(Not provided)'
    case 'number':
      return 0
    case 'date':
      return new Date().toISOString().split('T')[0]
    case 'select':
      return 'Default'
    case 'image':
      return '(No image)'
    default:
      return '(Not provided)'
  }
}

// Close dialog
const closeDialog = () => {
  emit('update:dialog', false)
  resetForm()
}

// Reset form to initial state
const resetForm = () => {
  // Reset all state
  initializeForm()
  success.value = false
  error.value = false
  message.value = ''
  loading.value = false
}

// Upload image to GridFS
const uploadImageToServer = async (imageData, filename) => {
  const PORT = import.meta.env.VITE_API_PORT

  try {
    const response = await fetch(`${PORT}/api/images/upload`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData,
        filename,
      }),
    })

    if (response.ok) {
      const result = await response.json()
      return result.fileId
    } else {
      const errorResult = await response.json()
      throw new Error(errorResult.error || 'Failed to upload image')
    }
  } catch (err) {
    console.log('Error uploading image:', err)
    throw err
  }
}

// File handling for image uploads
const handleFileUpload = async (fieldName, event) => {
  const file = event.target.files?.[0]

  // Field definition to check if it's required
  const fieldDef = props.task.design.fields.find((f) => f.label === fieldName)
  const isRequired = fieldDef?.config?.required || false

  if (file) {
    // Check file size (limit to 20MB)
    const maxSizeInBytes = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSizeInBytes) {
      error.value = true
      message.value = `File size too large. Please select an image smaller than 20MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      return
    }

    // Check if it's actually an image
    if (!file.type.startsWith('image/')) {
      error.value = true
      message.value = 'Please select a valid image file (JPG, PNG, GIF, etc.)'
      return
    }

    // Clear any previous errors
    error.value = false
    message.value = ''

    // Set loading state for this field
    loading.value = true

    try {
      // Convert file to base64 for upload
      const reader = new FileReader()
      reader.onload = async (e) => {
        let result = e.target.result

        // For large images, compress them
        if (file.size > 1024 * 1024) {
          // If larger than 1MB
          // Create an image element to compress
          const img = new Image()
          img.onload = async () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            // Calculate new dimensions (max 1024px width/height)
            const maxDimension = 1024
            let { width, height } = img

            if (width > height) {
              if (width > maxDimension) {
                height = (height * maxDimension) / width
                width = maxDimension
              }
            } else {
              if (height > maxDimension) {
                width = (width * maxDimension) / height
                height = maxDimension
              }
            }

            canvas.width = width
            canvas.height = height

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height)
            const compressedData = canvas.toDataURL('image/jpeg', 0.8) // 80% quality

            try {
              // Upload compressed image to GridFS
              const fileId = await uploadImageToServer(
                compressedData,
                `${fieldName}_${Date.now()}.jpg`,
              )

              // Store the GridFS file ID instead of base64 data
              formValues.value[fieldName] = fileId
              updateSubmissionData()
            } catch (uploadError) {
              error.value = true
              message.value = `Failed to upload image: ${uploadError.message}`
            } finally {
              loading.value = false
            }
          }
          img.src = result
        } else {
          try {
            // Small image, upload as-is
            const fileId = await uploadImageToServer(
              result,
              `${fieldName}_${Date.now()}.${file.type.split('/')[1]}`,
            )

            // Store the GridFS file ID instead of base64 data
            formValues.value[fieldName] = fileId
            updateSubmissionData()
          } catch (uploadError) {
            error.value = true
            message.value = `Failed to upload image: ${uploadError.message}`
          } finally {
            loading.value = false
          }
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      error.value = true
      message.value = 'Error processing image file'
      loading.value = false
    }
  } else {
    // No file selected or file was removed
    formValues.value[fieldName] = isRequired ? null : '(No image)'
    updateSubmissionData()
  }
}

// Update the submission data array based on form values
// Set undefined or null value to a default value
const updateSubmissionData = () => {
  if (props.task.design && props.task.design.fields) {
    submissionForm.value.submissionData = props.task.design.fields.map((field) => ({
      label: field.label,
      type: field.type,
      value: formValues.value[field.label],
    }))
  }
  // Ensure all required fields have a value
  for (const field of props.task.design.fields) {
    if (field.config && field.config.required) {
      const value = formValues.value[field.label]
      if (value === undefined || value === null || value === '') {
        formValues.value[field.label] = getDefaultValueForField(field)
      }
    }
  }
}

const validateForm = () => {
  // Basic validation to ensure all required fields are filled
  // Validate number fields for min/max constraints
  for (const field of props.task.design.fields) {
    if (field.config && field.config.required) {
      const value = formValues.value[field.label]
      if (value === undefined || value === null || value === '') {
        error.value = true
        message.value = `Please fill the required field: ${field.label}`
        return false
      } else if (field.config.min !== undefined && value < field.config.min) {
        error.value = true
        message.value = `Value for ${field.label} must be at least ${field.config.min}`
        return false
      } else if (field.config.max !== undefined && value > field.config.max) {
        error.value = true
        message.value = `Value for ${field.label} must not exceed ${field.config.max}`
        return false
      }
    }
  }
  return true
}

// Submit task submission
const submitTaskResponse = async () => {
  // Update submission data from form values before validation
  updateSubmissionData()

  // Validate form before submission
  if (!validateForm()) {
    return // Stop if validation fails
  }

  // Filter out null/empty values for non-required fields or provide default values
  const filteredSubmissionData = submissionForm.value.submissionData.map((field) => {
    const fieldDef = props.task.design.fields.find((f) => f.label === field.label)
    const isRequired = fieldDef?.config?.required || false

    // If field is not required and value is null/empty, provide a default value
    if (!isRequired && (field.value === null || field.value === '')) {
      return {
        ...field,
        value: getDefaultNonEmptyValue(field.type),
      }
    }
    return field
  })

  // Create a copy of the form with filtered data
  const submissionData = {
    ...submissionForm.value,
    submissionData: filteredSubmissionData,
  }
  submissionData.taskGroupId = props.task.taskGroupId
  console.log('Submitting task response:', submissionData)

  try {
    loading.value = true
    submissionData.submissionDate = new Date().toISOString()

    const PORT = import.meta.env.VITE_API_PORT
    const response = await fetch(`${PORT}/api/tasks/submit`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData),
    })

    if (response.ok) {
      success.value = true
      error.value = false
      message.value = 'Task submission successful!'
      emit('submission-success')
      // Close dialog after 2 seconds
      setTimeout(() => {
        closeDialog()
      }, 2000)
    } else {
      const result = await response.json()
      error.value = true
      success.value = false
      message.value = result.message || 'Failed to submit task.'
    }
  } catch (err) {
    console.log('Error submitting task:', err)
    error.value = true
    message.value = 'An error occurred during submission.'
  } finally {
    loading.value = false
  }
}

// Get priority color for display
const getPriorityColor = (priority) => {
  const colors = {
    Urgent: 'red-darken-2',
    High: 'orange-darken-1',
    Medium: 'green-darken-1',
    Low: 'blue-darken-1',
    Optional: 'grey-darken-3',
  }
  return colors[priority] || 'grey-darken-3'
}

// Get image URL for GridFS file ID
const getImageUrl = (fileId) => {
  const PORT = import.meta.env.VITE_API_PORT || 'http://localhost:3000'
  return `${PORT}/api/images/${fileId}`
}

// Validate if form is ready to submit
const isFormValid = computed(() => {
  if (!props.task.design || !props.task.design.fields) return false

  // Check if all required fields are filled
  for (const field of props.task.design.fields) {
    if (field.config && field.config.required) {
      const value = formValues.value[field.label]
      if (value === undefined || value === null || value === '') {
        return false
      }
    }
  }
  return true
})

// Watch for form values changes to keep submission data in sync
watch(
  formValues,
  () => {
    updateSubmissionData()
  },
  { deep: true },
)
</script>

<template>
  <v-dialog
    :model-value="props.dialog"
    @update:model-value="closeDialog"
    max-width="800px"
    persistent
  >
    <v-card>
      <v-card-title class="text-h5 pa-4 font-weight-bold">
        <v-btn
          icon
          @click="closeDialog"
          variant="outlined"
          class="close-button"
          v-if="$vuetify.display.smAndUp"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <div class="text-center flex-grow-1">Submit Task: {{ props.task.title }}</div>
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Task Information -->
        <v-card class="mb-4" variant="outlined">
          <v-card-item>
            <v-card-title>{{ props.task.title }}</v-card-title>
            <v-card-subtitle>
              <v-chip :color="getPriorityColor(props.task.priority)" class="mr-2">
                {{ props.task.priority }}
              </v-chip>
              <v-chip color="purple-darken-2">
                {{ props.task.category }}
              </v-chip>
              <v-chip-group>
                <v-chip v-for="tag in task.tags" :key="tag" color="black" size="small" class="ml-1">
                  {{ tag }}
                </v-chip>
              </v-chip-group>
            </v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <p class="mb-2">{{ props.task.description }}</p>
            <div class="text-caption">
              <span>Weight: {{ props.task.weighted }}</span>
            </div>
            <div class="d-flex justify-space-between text-caption">
              <span>Start: {{ new Date(props.task.startDate).toLocaleDateString() }}</span>
              <span>Due: {{ new Date(props.task.dueDate).toLocaleDateString() }}</span>
            </div>
          </v-card-text>
        </v-card>

        <!-- Alert Messages -->
        <v-alert v-if="success" type="success" variant="tonal" class="mb-4" closable>
          {{ message }}
        </v-alert>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable>
          {{ message }}
        </v-alert>

        <!-- Loading -->
        <div v-if="loading" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-2">Loading...</p>
        </div>

        <!-- Task Submission Form -->
        <v-form v-else class="mt-4">
          <div
            v-if="
              props.task.design && props.task.design.fields && props.task.design.fields.length > 0
            "
          >
            <div v-for="(field, index) in props.task.design.fields" :key="index" class="mb-4">
              <label class="text-subtitle-2 mb-1 d-block">
                {{ field.label }}
                <span v-if="field.config && field.config.required" class="text-red">*</span>
              </label>

              <!-- Different field types -->
              <v-text-field
                v-if="
                  field.type.toLowerCase() === 'short text' ||
                  field.type.toLowerCase() === 'urls' ||
                  field.type.toLowerCase() === 'phone'
                "
                v-model="formValues[field.label]"
                :placeholder="`Enter ${field.label}`"
                variant="outlined"
                density="comfortable"
                :required="field.config && field.config.required"
              ></v-text-field>

              <v-textarea
                v-else-if="field.type.toLowerCase() === 'long text'"
                v-model="formValues[field.label]"
                :placeholder="`Enter ${field.label}`"
                variant="outlined"
                density="comfortable"
                rows="3"
                :required="field.config && field.config.required"
              ></v-textarea>

              <div v-else-if="field.type.toLowerCase() === 'number'">
                <v-text-field
                  v-model.number="formValues[field.label]"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :min="field.config ? field.config.min : 0"
                  :max="field.config ? field.config.max : null"
                  :required="field.config && field.config.required"
                ></v-text-field>
                <p class="text-caption text-grey" v-if="field.config">
                  Range: {{ field.config.min || 0 }} to
                  {{ field.config.max !== undefined ? field.config.max : 'unlimited' }}
                </p>
              </div>

              <v-text-field
                v-else-if="field.type.toLowerCase() === 'date'"
                v-model="formValues[field.label]"
                type="date"
                variant="outlined"
                density="comfortable"
                :required="field.config && field.config.required"
              ></v-text-field>

              <v-select
                v-else-if="field.type.toLowerCase() === 'select'"
                v-model="formValues[field.label]"
                :items="field.config ? field.config.options : []"
                variant="outlined"
                density="comfortable"
                :required="field.config && field.config.required"
              ></v-select>

              <div v-else-if="field.type.toLowerCase() === 'image'">
                <v-file-input
                  @change="(e) => handleFileUpload(field.label, e)"
                  :placeholder="`Upload ${field.label}`"
                  variant="outlined"
                  density="comfortable"
                  accept="image/*"
                  :required="field.config && field.config.required"
                  hint="Maximum file size: 20MB. Large images will be automatically compressed."
                  persistent-hint
                ></v-file-input>
                <!-- Display current image if available -->
                <div
                  v-if="
                    formValues[field.label] &&
                    formValues[field.label] !== '(No image)' &&
                    formValues[field.label] !== null
                  "
                  class="mt-2"
                >
                  <p class="text-caption">Current image:</p>
                  <!-- Base64 image -->
                  <v-img
                    v-if="formValues[field.label].startsWith('data:image')"
                    :src="formValues[field.label]"
                    alt="Uploaded image"
                    style="max-height: 100px; max-width: 100%"
                  />
                  <!-- GridFS file ID -->
                  <v-img
                    v-else
                    :src="getImageUrl(formValues[field.label])"
                    alt="Uploaded image"
                    style="max-height: 100px; max-width: 100%"
                  />
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center pa-4">
            <v-alert type="info" class="mb-0">
              This task has no submission fields defined.
            </v-alert>
          </div>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-btn @click="closeDialog" variant="outlined">Cancel</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          @click="submitTaskResponse"
          :loading="loading"
          :disabled="!isFormValid || loading"
        >
          Submit Task
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.close-button {
  position: absolute;
  top: 16px;
  left: 16px;
  transition: 0.35s;
}

.close-button:hover {
  background-color: #d5d5d5;
}

.text-red {
  color: #f44336;
}
</style>
