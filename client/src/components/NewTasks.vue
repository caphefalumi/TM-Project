<script setup>
import { ref, onMounted, computed } from 'vue'
import { permissionService } from '../services/permissionService.js'

const user = ref({
  userId: '',
  username: '',
  email: '',
})

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

const emit = defineEmits(['update:dialog', 'create-task'])

// Selected users for task assignment
const selectedUsers = ref([])

// Task form data
const taskForm = ref({
  title: '',
  category: 'Report',
  tags: [],
  description: '',
  priority: 'Medium',
  weighted: 0,
  startDate: '',
  dueDate: '',
  teamId: '',
  design: {
    numberOfFields: 0,
    fields: [],
  },
})

// Available categories and priorities
// Static fallbacks - always available and fast
const DEFAULT_CATEGORIES = ['Report', 'Development', 'Design', 'Marketing', 'Other']
const DEFAULT_PRIORITIES = ['Urgent', 'High', 'Medium', 'Low', 'Optional']
const DEFAULT_FIELD_TYPES = [
  'Short text',
  'Long text',
  'Number',
  'Date',
  'Select',
  'URLs',
  'Image',
  'Phone',
]

// Default field types - static and fast

// Reactive arrays that can be updated from API if needed
const categories = ref([...DEFAULT_CATEGORIES])
const priorities = ref([...DEFAULT_PRIORITIES])
const fieldTypes = ref([...DEFAULT_FIELD_TYPES])

// Form states
const loading = ref(false)
const currentStep = ref(1) // 1: Basic Info, 2: Dynamic Fields
const newTag = ref('')
const newField = ref({
  label: '',
  type: 'Short text',
  config: {
    required: false,
    options: [],
    min: 0,
    max: 100,
  },
})

const newOption = ref('')

onMounted(async () => {
  setUserFromProps(props.userProps)
  taskForm.value.teamId = props.teamId
})

const setUserFromProps = (userProps) => {
  console.log('User Props:', userProps)
  user.value.userId = userProps.userId
  user.value.username = userProps.username
  user.value.email = userProps.email
}

const allFilled = computed(() => {
  return (
    taskForm.value.title &&
    taskForm.value.teamId &&
    taskForm.value.startDate &&
    taskForm.value.dueDate &&
    taskForm.value.startDate < taskForm.value.dueDate &&
    selectedUsers.value.length > 0
  )
})

// Close dialog
const closeDialog = () => {
  emit('create-task', taskForm.value) // Emit task data
  emit('update:dialog', false)
  resetForm()
}

// Reset form
const resetForm = () => {
  taskForm.value = {
    title: '',
    category: 'Report',
    tags: [],
    description: '',
    priority: 'Medium',
    weighted: 1,
    startDate: '',
    dueDate: '',
    teamId: `${props.teamId}`,
    design: {
      numberOfFields: 0,
      fields: [],
    },
  }
  selectedUsers.value = []
  currentStep.value = 1
  newTag.value = ''
  newField.value = {
    label: '',
    type: 'Short text',
    config: {
      required: false,
      options: [],
      min: 0,
      max: 100,
    },
  }
}

// Add new field to task design
const addField = () => {
  if (!newField.value.label) return

  const fieldToAdd = {
    label: newField.value.label,
    type: newField.value.type,
    config: { ...newField.value.config },
  }

  // Clean up config based on field type
  if (fieldToAdd.type !== 'Select') {
    delete fieldToAdd.config.options
  }
  if (fieldToAdd.type !== 'Number') {
    delete fieldToAdd.config.min
    delete fieldToAdd.config.max
  }

  taskForm.value.design.fields.push(fieldToAdd)
  taskForm.value.design.numberOfFields = taskForm.value.design.fields.length

  // Reset new field form
  newField.value = {
    label: '',
    type: 'Short text',
    config: {
      required: false,
      options: [],
      min: 0,
      max: 100,
    },
  }
}

// Remove field
const removeField = (field) => {
  // remove field by field label
  const index = taskForm.value.design.fields.findIndex((f) => f.label === field.label)
  if (index > -1) {
    taskForm.value.design.fields.splice(index, 1)
    taskForm.value.design.numberOfFields = taskForm.value.design.fields.length
  }
}

// Add option to select field
const addOption = () => {
  if (newOption.value && !newField.value.config.options.includes(newOption.value)) {
    newField.value.config.options.push(newOption.value)
    newOption.value = ''
  }
}

// Remove option from select field
const removeOption = (option) => {
  const index = newField.value.config.options.indexOf(option)
  if (index > -1) {
    newField.value.config.options.splice(index, 1)
  }
}

// Add tag to task
const addTag = () => {
  if (newTag.value && !taskForm.value.tags.includes(newTag.value)) {
    taskForm.value.tags.push(newTag.value)
    newTag.value = ''
  }
}

// Remove tag from task
const removeTag = (tag) => {
  const index = taskForm.value.tags.indexOf(tag)
  if (index > -1) {
    taskForm.value.tags.splice(index, 1)
  }
}

// Create task
const createTask = async () => {
  if (!taskForm.value.title || !taskForm.value.teamId || taskForm.value.design.fields.length === 0)
    return

  loading.value = true
  const submittedData = {
    ...taskForm.value,
    userId: user.value.userId,
    assignedUsers: selectedUsers.value, // Include selected users
  }
  console.log('Creating task:', submittedData)
  try {
    const PORT = import.meta.env.VITE_API_PORT
    // Ensure description exists even if empty
    if (taskForm.value.description === undefined) {
      taskForm.value.description = ''
    }
    const response = await fetch(`${PORT}/api/tasks/create`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submittedData),
    })

    if (response.ok) {
      closeDialog()
      // You might want to emit an event to refresh tasks
    }
  } catch (error) {
    console.log('Failed to create task:', error)
  } finally {
    loading.value = false
  }
}

// User selection functions
const selectAllUsers = () => {
  selectedUsers.value = props.teamMembers.map((member) => member.userId)
}

const removeSelectedUser = (userId) => {
  const index = selectedUsers.value.indexOf(userId)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  }
}

const getUserRole = (userId) => {
  const user = props.teamMembers.find((member) => member.userId === userId)
  if (!user) return 'Member'
  return user.roleLabel || user.baseRole || 'Member'
}

const getUserName = (userId) => {
  const user = props.teamMembers.find((member) => member.userId === userId)
  return user ? user.username : 'Unknown'
}

// Computed properties for preview
const previewData = computed(() => {
  return {
    title: taskForm.value.title || 'Task Title',
    category: taskForm.value.category,
    tags: taskForm.value.tags,
    description: taskForm.value.description || 'Task description...',
    priority: taskForm.value.priority,
    weighted: taskForm.value.weighted,
    startDate: taskForm.value.startDate || new Date().toISOString().split('T')[0],
    dueDate: taskForm.value.dueDate || new Date().toISOString().split('T')[0],
    fields: taskForm.value.design.fields,
  }
})

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

const getFieldPreviewValue = (field) => {
  switch (field.type) {
    case 'Short text':
      return 'Sample text'
    case 'Long text':
      return 'This is a longer sample text that would appear in a textarea field...'
    case 'Number':
      return field.config.min || 0
    case 'Date':
      return new Date().toISOString().split('T')[0]
    case 'Select':
      return field.config.options[0] || 'Option 1'
    case 'URLs':
      return 'https://example.com'
    case 'Image':
      return '[Image placeholder]'
    case 'Phone':
      return '+1 (555) 123-4567'
    default:
      return 'Sample value'
  }
}
</script>

<template>
  <v-dialog
    :model-value="props.dialog"
    @update:model-value="closeDialog"
    max-width="1400px"
    persistent
  >
    <v-card>
      <v-card-title class="text-h5 pa-4 font-weight-bold">
        <v-btn icon @click="closeDialog" variant="outlined" class="close-button">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <div class="text-center flex-grow-1">Create New Task</div>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-row no-gutters class="fill-height">
          <!-- Left Side - Task Creation Form -->
          <v-col cols="12" md="6" class="pa-4 border-end">
            <div class="task-creation-side">
              <h3 class="text-h6 mb-4">Task Details</h3>

              <!-- Step 1: Basic Information -->
              <v-card v-if="currentStep === 1" flat>
                <v-card-text class="pa-2">
                  <v-form>
                    <v-text-field
                      v-model="taskForm.title"
                      label="Task Title"
                      variant="outlined"
                      class="mb-3"
                      required
                    ></v-text-field>

                    <v-select
                      v-model="taskForm.category"
                      :items="categories"
                      label="Category"
                      variant="outlined"
                      class="mb-3"
                    ></v-select>

                    <v-textarea
                      v-model="taskForm.description"
                      label="Description"
                      variant="outlined"
                      rows="3"
                      class="mb-3"
                    ></v-textarea>

                    <!-- Tags Section -->
                    <div class="mb-3">
                      <h4 class="text-subtitle-2 mb-2">Tags (Optional):</h4>

                      <!-- Add Tag Input -->
                      <v-text-field
                        v-model="newTag"
                        label="Add Tag"
                        variant="outlined"
                        density="compact"
                        @keyup.enter="addTag"
                        append-inner-icon="mdi-plus"
                        @click:append-inner="addTag"
                        placeholder="Enter tag name"
                        class="mb-2"
                      ></v-text-field>

                      <!-- Display Current Tags -->
                      <v-chip-group v-if="taskForm.tags.length > 0" column class="mb-2">
                        <v-chip
                          v-for="tag in taskForm.tags"
                          :key="tag"
                          closable
                          @click:close="removeTag(tag)"
                          size="small"
                          color="primary"
                          variant="outlined"
                        >
                          {{ tag }}
                        </v-chip>
                      </v-chip-group>

                      <div v-if="taskForm.tags.length === 0" class="text-caption text-grey mb-2">
                        No tags added yet. Tags help categorize and filter tasks.
                      </div>
                    </div>

                    <v-row>
                      <v-col cols="6">
                        <v-select
                          v-model="taskForm.priority"
                          :items="priorities"
                          label="Priority"
                          variant="outlined"
                          class="mb-3"
                        ></v-select>
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="taskForm.weighted"
                          label="Weight"
                          type="number"
                          variant="outlined"
                          class="mb-3"
                          min="0"
                          max="500"
                        ></v-text-field>
                      </v-col>
                    </v-row>
                    <v-row>
                      <v-col cols="6">
                        <v-text-field
                          v-model="taskForm.startDate"
                          label="Start Date"
                          type="date"
                          variant="outlined"
                          class="mb-3"
                          min="2025-01-01"
                          max="2035-12-31"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model="taskForm.dueDate"
                          label="Due Date"
                          type="date"
                          variant="outlined"
                          class="mb-3"
                          required
                          min="2025-01-01"
                          max="2035-12-31"
                        ></v-text-field>
                      </v-col>
                    </v-row>

                    <!-- User Selection -->
                    <v-divider class="my-4"></v-divider>
                    <h4 class="text-subtitle-1 mb-3">Assign to Team Members:</h4>

                    <div class="d-flex align-center mb-3">
                      <v-btn
                        @click="selectAllUsers"
                        variant="outlined"
                        class="mb-2"
                        :disabled="selectedUsers.length === props.teamMembers.length"
                      >
                        Select All
                      </v-btn>
                      <v-spacer></v-spacer>
                      <span class="text-caption"
                        >{{ selectedUsers.length }} of {{ props.teamMembers.length }} selected</span
                      >
                    </div>

                    <v-select
                      v-model="selectedUsers"
                      :items="props.teamMembers"
                      item-title="username"
                      item-value="userId"
                      label="Select Team Members"
                      variant="outlined"
                      multiple
                      chips
                      closable-chips
                      class="mb-3"
                    ></v-select>

                    <!-- Selected Users Display -->
                    <div v-if="selectedUsers.length > 0" class="mb-3">
                      <h5 class="text-subtitle-2 mb-2">Selected Members:</h5>
                      <div class="d-flex flex-wrap gap-2">
                        <v-chip
                          v-for="userId in selectedUsers"
                          :key="userId"
                          :color="permissionService.getRoleColor(getUserRole(userId))"
                          closable
                          @click:close="removeSelectedUser(userId)"
                          class="mr-1"
                        >
                          {{ getUserName(userId) }} ({{ getUserRole(userId) }})
                        </v-chip>
                      </div>
                    </div>
                  </v-form>
                </v-card-text>
                <div class="validation-messages mb-3">
                  <v-alert
                    v-if="!allFilled"
                    type="warning"
                    variant="tonal"
                    density="compact"
                    class="mb-2"
                  >
                    <template v-slot:prepend>
                      <v-icon>mdi-alert-circle</v-icon>
                    </template>
                    <div class="text-caption">
                      <strong>Please complete the following to continue:</strong>
                      <ul class="mt-1 ml-4">
                        <li v-if="!taskForm.title">Add a task title</li>
                        <li v-if="!taskForm.startDate">Select a start date</li>
                        <li v-if="!taskForm.dueDate">Select a due date</li>
                        <li v-if="taskForm.startDate >= taskForm.dueDate">
                          Start date must be before due date
                        </li>
                        <li v-if="selectedUsers.length === 0">Assign at least one team member</li>
                      </ul>
                    </div>
                  </v-alert>
                </div>
                <v-card-actions class="px-0">
                  <v-spacer></v-spacer>
                  <v-btn
                    variant="outlined"
                    color="primary"
                    @click="currentStep = 2"
                    :disabled="!allFilled"
                  >
                    Next: Add Fields
                  </v-btn>
                </v-card-actions>
              </v-card>

              <!-- Step 2: Dynamic Fields -->
              <v-card v-else flat>
                <v-card-title class="px-0 pb-2">
                  <span>Custom Fields ({{ taskForm.design.fields.length }})</span>
                  <v-spacer></v-spacer>
                  <v-btn
                    color="primary"
                    size="small"
                    @click="currentStep = 1"
                    prepend-icon="mdi-arrow-left"
                  >
                    Back
                  </v-btn>
                </v-card-title>

                <v-card-text class="pa-0">
                  <!-- Existing Fields -->
                  <div v-if="taskForm.design.fields.length > 0" class="mb-4">
                    <h4 class="text-subtitle-1 mb-2">Current Fields:</h4>
                    <v-chip-group column>
                      <v-chip
                        v-for="field in taskForm.design.fields"
                        :key="field.label"
                        closable
                        @click:close="removeField(field)"
                        :color="field.config.required ? 'primary' : 'default'"
                      >
                        {{ field.label }} ({{ field.type }})
                      </v-chip>
                    </v-chip-group>
                  </div>

                  <!-- Add New Field Form -->
                  <v-divider class="my-4"></v-divider>
                  <h4 class="text-subtitle-1 mb-3">Add New Field:</h4>

                  <v-text-field
                    v-model="newField.label"
                    label="Field Label"
                    variant="outlined"
                    class="mb-3"
                    density="compact"
                  ></v-text-field>

                  <v-select
                    v-model="newField.type"
                    :items="fieldTypes"
                    label="Field Type"
                    variant="outlined"
                    class="mb-3"
                    density="compact"
                  ></v-select>

                  <v-checkbox
                    v-model="newField.config.required"
                    label="Required Field"
                    class="mb-3"
                  ></v-checkbox>

                  <!-- Number Field Config -->
                  <div v-if="newField.type === 'Number'" class="mb-3">
                    <v-row>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="newField.config.min"
                          label="Min Value"
                          type="number"
                          variant="outlined"
                          density="compact"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="6">
                        <v-text-field
                          v-model.number="newField.config.max"
                          label="Max Value"
                          type="number"
                          variant="outlined"
                          density="compact"
                        ></v-text-field>
                      </v-col>
                    </v-row>
                  </div>

                  <!-- Select Field Config -->
                  <div v-if="newField.type === 'Select'" class="mb-3">
                    <v-text-field
                      v-model="newOption"
                      label="Add Option"
                      variant="outlined"
                      density="compact"
                      @keyup.enter="addOption"
                      append-inner-icon="mdi-plus"
                      @click:append-inner="addOption"
                    ></v-text-field>

                    <v-chip-group v-if="newField.config.options.length > 0" column class="mt-2">
                      <v-chip
                        v-for="option in newField.config.options"
                        :key="option"
                        closable
                        @click:close="removeOption(option)"
                        size="small"
                      >
                        {{ option }}
                      </v-chip>
                    </v-chip-group>
                  </div>

                  <v-btn
                    color="primary"
                    @click="addField"
                    :disabled="
                      !newField.label ||
                      (newField.type === 'Select' && newField.config.options.length === 0)
                    "
                    block
                    class="mb-4"
                  >
                    Add Field
                  </v-btn>

                  <!-- Validation warning for Step 2 -->
                  <div class="validation-messages mb-3">
                    <v-alert
                      v-if="taskForm.design.fields.length === 0"
                      type="warning"
                      variant="tonal"
                      density="compact"
                      class="mb-2"
                    >
                      <template v-slot:prepend>
                        <v-icon>mdi-alert-circle</v-icon>
                      </template>
                      <div class="text-caption">
                        <strong>At least 1 custom field is required to create a task</strong>
                        <p class="mt-1 mb-0">
                          Add fields above to define what information team members need to submit
                          when completing this task.
                        </p>
                      </div>
                    </v-alert>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-col>

          <!-- Right Side - Preview -->
          <v-col cols="12" md="6" class="pa-4 bg-grey-lighten-5">
            <div class="task-preview-side">
              <h3 class="text-h6 mb-4">Task Preview</h3>

              <v-card class="mb-4">
                <v-card-item>
                  <v-card-title>{{ previewData.title }}</v-card-title>
                  <v-card-subtitle>
                    <v-chip :color="getPriorityColor(previewData.priority)" class="mr-2">
                      {{ previewData.priority }}
                    </v-chip>
                    <v-chip color="purple-darken-2">
                      {{ previewData.category }}
                    </v-chip>
                    <!-- Tags Preview -->
                    <v-chip-group>
                      <v-chip
                        v-for="tag in previewData.tags"
                        :key="tag"
                        color="black"
                        size="small"
                        class="ml-1"
                      >
                        {{ tag }}
                      </v-chip>
                    </v-chip-group>
                  </v-card-subtitle>
                </v-card-item>

                <v-card-text>
                  <p class="mb-2">{{ previewData.description }}</p>
                  <div class="text-caption">
                    <span>Weight: {{ taskForm.weighted }}</span>
                  </div>
                  <div class="d-flex justify-space-between text-caption">
                    <span>Start: {{ new Date(taskForm.startDate).toLocaleDateString() }}</span>
                    <span>Due: {{ new Date(taskForm.dueDate).toLocaleDateString() }}</span>
                  </div>
                </v-card-text>
              </v-card>

              <!-- Preview Dynamic Fields -->
              <v-card v-if="previewData.fields.length > 0">
                <v-card-title>Submission Form Preview</v-card-title>
                <v-card-text>
                  <div v-for="field in previewData.fields" :key="field.label" class="mb-3">
                    <label class="text-subtitle-2 mb-1 d-block">
                      {{ field.label }}
                      <span v-if="field.config.required" class="text-red">*</span>
                    </label>

                    <!-- Preview different field types -->
                    <v-text-field
                      v-if="
                        field.type === 'Short text' ||
                        field.type === 'URLs' ||
                        field.type === 'phone'
                      "
                      :model-value="getFieldPreviewValue(field)"
                      variant="outlined"
                      density="compact"
                      readonly
                    ></v-text-field>

                    <v-textarea
                      v-else-if="field.type === 'long text'"
                      :model-value="getFieldPreviewValue(field)"
                      variant="outlined"
                      density="compact"
                      rows="3"
                      readonly
                    ></v-textarea>

                    <v-text-field
                      v-else-if="field.type === 'number'"
                      :model-value="getFieldPreviewValue(field)"
                      type="number"
                      variant="outlined"
                      density="compact"
                      readonly
                      :hint="`Range: ${field.config.min} - ${field.config.max}`"
                    ></v-text-field>

                    <v-text-field
                      v-else-if="field.type === 'date'"
                      :model-value="getFieldPreviewValue(field)"
                      type="date"
                      variant="outlined"
                      density="compact"
                      readonly
                    ></v-text-field>

                    <v-select
                      v-else-if="field.type === 'select'"
                      :model-value="getFieldPreviewValue(field)"
                      :items="field.config.options"
                      variant="outlined"
                      density="compact"
                      readonly
                    ></v-select>

                    <v-file-input
                      v-else-if="field.type === 'image'"
                      label="Upload Image"
                      variant="outlined"
                      density="compact"
                      accept="image/*"
                      readonly
                    ></v-file-input>

                    <div v-else class="text-caption text-grey">
                      Preview for {{ field.type }} field
                    </div>
                  </div>
                </v-card-text>
              </v-card>

              <v-alert v-else type="info" class="mt-4">
                Add custom fields to see them in the preview
              </v-alert>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-btn @click="closeDialog" variant="outlined">Cancel</v-btn>
        <v-spacer></v-spacer>
        <v-btn
          variant="outlined"
          color="primary"
          @click="createTask"
          :loading="loading"
          :disabled="
            !taskForm.title ||
            !taskForm.teamId ||
            currentStep !== 2 ||
            taskForm.design.fields.length === 0
          "
        >
          Create Task
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Border on the right for desktop, on the bottom for mobile */
.border-end {
  border-bottom: 1px solid #e0e0e0;
}

@media (min-width: 960px) {
  .border-end {
    border-right: 1px solid #e0e0e0;
    border-bottom: none;
  }
}

.task-creation-side {
  max-height: 500px;
  overflow-y: auto;
}

.task-preview-side {
  max-height: 500px;
  overflow-y: auto;
}

/* Adjust heights for mobile */
@media (max-width: 959px) {
  .task-creation-side {
    max-height: 400px;
  }

  .task-preview-side {
    max-height: 400px;
  }
}

.fill-height {
  min-height: 500px;
}

@media (max-width: 959px) {
  .fill-height {
    min-height: auto;
  }
}

.close-button {
  border: 2px solid black;
  position: absolute;
  top: 16px;
  left: 16px;
  transition: 0.35s;
}

.close-button:hover {
  background-color: #d5d5d5;
}
</style>
