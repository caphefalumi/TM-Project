import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// Mock window.isTauri
global.window.isTauri = false

// Mock crypto for generating IDs
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => `test-uuid-${Math.random()}`,
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  }
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Suppress Vuetify warnings in tests
config.global.stubs = {
  transition: false,
  'transition-group': false,
}
