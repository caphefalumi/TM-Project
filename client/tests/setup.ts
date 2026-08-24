import { vi } from 'vitest'
import { config } from '@vue/test-utils'

// Route Axios through fetch so existing fetch mocks still cover API calls.
vi.mock('axios', () => {
  const request = vi.fn(async (config: Record<string, unknown> = {}) => {
    const url = String(config.url || '/')
    const response = (await fetch(url, {
      method: String(config.method || 'GET'),
      headers: config.headers as HeadersInit | undefined,
      body: config.data as BodyInit | undefined,
      credentials: config.withCredentials === false ? 'omit' : 'include',
      signal: config.signal as AbortSignal | undefined,
    })) as Response & { headers?: Headers }

    if (!response) {
      return { status: 500, statusText: 'No response', headers: {}, data: null }
    }

    const headers = response?.headers || new Headers({ 'content-type': 'application/json' })
    const contentType =
      typeof headers.get === 'function' ? headers.get('content-type') || '' : 'application/json'
    const text = typeof response.text === 'function' ? await response.text() : JSON.stringify(response)
    let data: unknown = text
    if (contentType.includes('application/json') || (typeof text === 'string' && (text.startsWith('{') || text.startsWith('[')))) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    } else if (typeof response.json === 'function') {
      try {
        data = await response.json()
      } catch {
        data = text
      }
    }
    const headerMap: Record<string, string> = {}
    if (typeof headers.forEach === 'function') {
      headers.forEach((value, key) => {
        headerMap[key] = value
      })
    }
    return {
      status: response.status,
      statusText: response.statusText,
      headers: headerMap,
      data,
    }
  })

  return {
    default: {
      create: () => ({ request }),
    },
  }
})

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
