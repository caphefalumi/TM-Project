import { h } from 'vue'

const createWrapperStub = (name, tag = 'div') => ({
  name,
  render() {
    return h(tag, { class: name }, this.$slots.default ? this.$slots.default() : [])
  },
})

const VFormStub = {
  name: 'v-form',
  emits: ['submit'],
  render() {
    return h(
      'form',
      {
        onSubmit: (event) => {
          event?.preventDefault?.()
          this.$emit('submit', event)
        },
      },
      this.$slots.default ? this.$slots.default() : [],
    )
  },
}

const VTextFieldStub = {
  name: 'v-text-field',
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
    type: {
      type: String,
      default: 'text',
    },
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'click:append-inner'],
  render() {
    const input = h('input', {
      type: this.type || 'text',
      value: this.modelValue,
      'data-label': this.label,
      onInput: (event) => this.$emit('update:modelValue', event?.target?.value ?? ''),
    })

    const append = h(
      'button',
      {
        type: 'button',
        class: 'append-inner',
        onClick: () => this.$emit('click:append-inner'),
      },
      this.$slots['append-inner'] ? this.$slots['append-inner']() : [],
    )

    const children = [input, append]

    if (this.$slots.default) {
      children.push(...this.$slots.default())
    }

    return h('div', { class: 'v-text-field' }, children)
  },
}

const VTextareaStub = {
  name: 'v-textarea',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  render() {
    const textarea = h('textarea', {
      value: this.modelValue,
      'data-label': this.label,
      onInput: (event) => this.$emit('update:modelValue', event?.target?.value ?? ''),
    })

    const children = [textarea]

    if (this.$slots.default) {
      children.push(...this.$slots.default())
    }

    return h('div', { class: 'v-textarea' }, children)
  },
}

const VBtnStub = {
  name: 'v-btn',
  props: {
    type: {
      type: String,
      default: 'button',
    },
    disabled: Boolean,
  },
  emits: ['click'],
  render() {
    return h(
      'button',
      {
        type: this.type || 'button',
        disabled: this.disabled,
        onClick: (event) => this.$emit('click', event),
      },
      this.$slots.default ? this.$slots.default() : [],
    )
  },
}

const VCheckboxStub = {
  name: 'v-checkbox',
  props: {
    modelValue: {
      type: [Boolean, Array],
      default: false,
    },
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  render() {
    const checkbox = h('input', {
      type: 'checkbox',
      checked: Array.isArray(this.modelValue)
        ? this.modelValue.includes(true)
        : !!this.modelValue,
      'data-label': this.label,
      onChange: (event) => this.$emit('update:modelValue', event?.target?.checked ?? false),
    })

    const children = [checkbox]
    if (this.$slots.default) {
      children.push(...this.$slots.default())
    }

    return h('label', { class: 'v-checkbox' }, children)
  },
}

const VSelectStub = {
  name: 'v-select',
  props: {
    modelValue: {
      type: [String, Number, Array],
      default: '',
    },
    items: {
      type: Array,
      default: () => [],
    },
    multiple: Boolean,
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  methods: {
    getOptionValue(option) {
      if (option && typeof option === 'object') {
        return option.value ?? option.title ?? option.text ?? option
      }
      return option
    },
    getOptionText(option) {
      if (option && typeof option === 'object') {
        return option.title ?? option.text ?? option.value ?? ''
      }
      return option
    },
    onChange(event) {
      if (this.multiple) {
        const values = Array.from(event?.target?.selectedOptions || []).map((opt) => opt.value)
        this.$emit('update:modelValue', values)
      } else {
        this.$emit('update:modelValue', event?.target?.value ?? '')
      }
    },
  },
  render() {
    const options = this.items.length
      ? this.items
      : Array.isArray(this.modelValue)
        ? this.modelValue
        : [this.modelValue]

    const optionNodes = options.map((option, index) =>
      h(
        'option',
        {
          key: index,
          value: this.getOptionValue(option),
          selected: this.multiple
            ? Array.isArray(this.modelValue) && this.modelValue.includes(this.getOptionValue(option))
            : this.modelValue === this.getOptionValue(option),
        },
        this.getOptionText(option),
      ),
    )

    const select = h(
      'select',
      {
        multiple: this.multiple,
        'data-label': this.label,
        onChange: this.onChange,
      },
      optionNodes,
    )

    const children = [select]
    if (this.$slots.default) {
      children.push(...this.$slots.default())
    }

    return h('div', { class: 'v-select' }, children)
  },
}

const VSliderStub = {
  name: 'v-slider',
  props: {
    modelValue: {
      type: [Number, String],
      default: 0,
    },
    min: {
      type: Number,
      default: 0,
    },
    max: {
      type: Number,
      default: 100,
    },
  },
  emits: ['update:modelValue'],
  render() {
    const slider = h('input', {
      type: 'range',
      min: this.min,
      max: this.max,
      value: this.modelValue,
      onInput: (event) => this.$emit('update:modelValue', Number(event?.target?.value ?? 0)),
    })
    return h('div', { class: 'v-slider' }, [slider])
  },
}

const VFileInputStub = {
  name: 'v-file-input',
  props: {
    modelValue: {
      type: [Array, Object, String, Number, Boolean, null],
      default: null,
    },
    multiple: Boolean,
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'change'],
  render() {
    const input = h('input', {
      type: 'file',
      multiple: this.multiple,
      'data-label': this.label,
      onChange: (event) => {
        const fileList = event?.target?.files
        const value = this.multiple ? Array.from(fileList || []) : fileList?.[0] ?? null
        this.$emit('update:modelValue', value)
        this.$emit('change', value)
      },
    })

    const children = [input]
    if (this.$slots.default) {
      children.push(...this.$slots.default())
    }

    return h('div', { class: 'v-file-input' }, children)
  },
}

const VAlertStub = {
  name: 'v-alert',
  props: {
    type: {
      type: String,
      default: 'info',
    },
  },
  render() {
    return h(
      'div',
      { class: 'v-alert', 'data-type': this.type },
      this.$slots.default ? this.$slots.default() : [],
    )
  },
}

const VIconStub = {
  name: 'v-icon',
  render() {
    return h('span', { class: 'v-icon' }, this.$slots.default ? this.$slots.default() : [])
  },
}

const VChipStub = createWrapperStub('v-chip', 'span')
const VDividerStub = createWrapperStub('v-divider', 'hr')
const VSkeletonLoaderStub = createWrapperStub('v-skeleton-loader', 'div')
const VProgressLinearStub = {
  name: 'v-progress-linear',
  props: {
    modelValue: {
      type: [Number, String],
      default: undefined,
    },
    value: {
      type: [Number, String],
      default: undefined,
    },
  },
  render() {
    return h('div', {
      class: 'v-progress-linear',
      'data-value': this.modelValue ?? this.value ?? 0,
    })
  },
}

const VPaginationStub = {
  name: 'v-pagination',
  props: {
    modelValue: {
      type: Number,
      default: 1,
    },
    length: {
      type: Number,
      default: 1,
    },
  },
  emits: ['update:modelValue'],
  render() {
    const buttons = []
    const total = this.length || 1
    for (let page = 1; page <= total; page += 1) {
      buttons.push(
        h(
          'button',
          {
            type: 'button',
            'data-page': page,
            onClick: () => this.$emit('update:modelValue', page),
          },
          page.toString(),
        ),
      )
    }

    return h('nav', { class: 'v-pagination' }, buttons)
  },
}

const simpleWrapperComponents = [
  'v-container',
  'v-row',
  'v-col',
  'v-card',
  'v-card-title',
  'v-card-text',
  'v-card-actions',
  'v-dialog',
  'v-tabs',
  'v-tab',
  'v-window',
  'v-window-item',
  'v-stepper',
  'v-stepper-header',
  'v-stepper-item',
  'v-stepper-window',
  'v-stepper-window-item',
  'v-list',
  'v-list-item',
  'v-list-item-title',
  'v-list-item-subtitle',
  'v-avatar',
  'v-toolbar',
  'v-toolbar-title',
  'v-spacer',
]

const wrapperEntries = Object.fromEntries(
  simpleWrapperComponents.map((name) => [name, createWrapperStub(name)]),
)

export const vuetifyStubs = {
  ...wrapperEntries,
  'v-form': VFormStub,
  'v-text-field': VTextFieldStub,
  'v-textarea': VTextareaStub,
  'v-select': VSelectStub,
  'v-slider': VSliderStub,
  'v-file-input': VFileInputStub,
  'v-checkbox': VCheckboxStub,
  'v-btn': VBtnStub,
  'v-alert': VAlertStub,
  'v-icon': VIconStub,
  'v-chip': VChipStub,
  'v-divider': VDividerStub,
  'v-skeleton-loader': VSkeletonLoaderStub,
  'v-progress-linear': VProgressLinearStub,
  'v-pagination': VPaginationStub,
}

export const getVuetifyStubs = (overrides = {}) => ({
  ...vuetifyStubs,
  ...overrides,
})

export default vuetifyStubs
