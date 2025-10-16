/**
 * Login View Tests
 * Tests authentication flows, OAuth integration, and form validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import Login from '../src/views/Login.vue'
import {
  createTestPinia,
  setupFetchMock,
  mockFetchResponse,
  createMockUser,
  flushPromises,
  setupOAuthPollingMock,
  advanceTimersAndFlush,
} from './helpers.js'
import { useAuthStore } from '../src/stores/auth.js'

// Mock dependencies
vi.mock('../src/scripts/authStore.js', () => ({
  default: {
    getUserByAccessToken: vi.fn(),
    logout: vi.fn(),
  },
}))

vi.mock('../src/composables/useComponentCache.js', () => ({
  useComponentCache: () => ({
    clearAllCaches: vi.fn(),
  }),
}))

vi.mock('@tauri-apps/plugin-shell', () => ({
  open: vi.fn(),
}))

import AuthStore from '../src/scripts/authStore.js'
import { open } from '@tauri-apps/plugin-shell'

const createStubComponent = (name) => ({
  name,
  template: '<div><slot div>',
})

const VFormStub = {
  name: 'v-form',
  emits: ['submit'],
  template: '<form @submit.prevent="$emit(\'submit\', $event)"><slot orm>',
}

const VTextFieldStub = {
  name: 'v-text-field',
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
    label: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'text',
    },
  },
  emits: ['update:modelValue', 'click:append-inner'],
  template: `
    <div class="v-text-field">
      <input
        :type="type || 'text'"
        :data-label="label"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
      >
      <button type="button" class="append-inner" @click="$emit('click:append-inner')"></button>
      <slot></slot>
    </div>
  `,
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
  template: `
    <button :type="type || 'button'" :disabled="disabled" @click="$emit('click', $event)">
      <slot></slot>
    </button>
  `,
}

const VAlertStub = {
  name: 'v-alert',
  props: {
    type: {
      type: String,
      default: 'info',
    },
  },
  template: '<div class="v-alert" :data-type="type"><slot></slot></div>',
}

const VIconStub = {
  name: 'v-icon',
  template: '<span class="v-icon"><slot></slot></span>',
}

const VIconLoginStub = {
  name: 'v-icon-login',
  template: '<div class="v-icon-login"><slot></slot></div>',
}

const GoogleLoginStub = {
  name: 'GoogleLogin',
  emits: ['success', 'error'],
  template: '<div class="google-login"><slot></slot></div>',
}

const baseStubs = {
  'v-container': createStubComponent('v-container'),
  'v-row': createStubComponent('v-row'),
  'v-col': createStubComponent('v-col'),
  'v-card': createStubComponent('v-card'),
  'v-card-title': createStubComponent('v-card-title'),
  'v-card-text': createStubComponent('v-card-text'),
  'v-divider': {
    name: 'v-divider',
    template: '<div class="v-divider"><slot></slot></div>',
  },
  'v-form': VFormStub,
  'v-text-field': VTextFieldStub,
  'v-btn': VBtnStub,
  'v-icon': VIconStub,
  'v-alert': VAlertStub,
  'v-icon-login': VIconLoginStub,
  GoogleLogin: GoogleLoginStub,
}

describe('Login View', () => {
  let wrapper
  let router
  let pinia
  let authStore
  let fetchMock

  beforeEach(() => {
    // Setup mocks
    fetchMock = setupFetchMock()
    pinia = createTestPinia()
    authStore = useAuthStore(pinia)

    // Create router
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Landing</div>' } },
        { path: '/login', component: Login },
        { path: '/register', component: { template: '<div>Register</div>' } },
        { path: '/home', component: { template: '<div>Home</div>' } },
        { path: '/forgot-password', component: { template: '<div>Forgot Password</div>' } },
      ],
    })

    // Mock environment variables
    import.meta.env.VITE_API_PORT = 'http://localhost:3000'
    import.meta.env.VITE_DESKTOP_CLIENT_ID = 'test-client-id'

    // Reset window.isTauri
    window.isTauri = false
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.restoreAllMocks()
    if (vi.isFakeTimers()) {
      vi.useRealTimers()
    }
  })

  const mountLogin = async (options = {}) => {
    const { global: globalOptions, ...mountOptions } = options
    wrapper = mount(Login, {
      global: {
        plugins: [router, pinia],
        ...globalOptions,
        stubs: {
          ...baseStubs,
          ...(globalOptions?.stubs || {}),
        },
      },
      ...mountOptions,
    })
    await flushPromises()
    return wrapper
  }

  describe('Form Rendering', () => {
    it('should render login form with username and password fields', async () => {
      await mountLogin()

      const usernameField = wrapper.find('input[data-label="Username"]')
      const passwordField = wrapper.find('input[type="password"]')
      const loginButton = wrapper.find('button[type="submit"]')

      expect(usernameField.exists()).toBe(true)
      expect(passwordField.exists()).toBe(true)
      expect(loginButton.exists()).toBe(true)
    })

    it('should have back button and navigation links', async () => {
      await mountLogin()

      const backButton = wrapper
        .findAll('button')
        .find((btn) => btn.html().includes('mdi-arrow-left'))
      expect(backButton).toBeDefined()

      const signUpButton = wrapper.findAll('button').find((btn) => btn.text().includes('Sign up'))
      expect(signUpButton).toBeDefined()
    })
  })

  describe('Form Validation', () => {
    it('should show error when fields are empty', async () => {
      await mountLogin()
      const form = wrapper.find('form')

      await form.trigger('submit.prevent')
      await flushPromises()

      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.exists()).toBe(true)
      expect(errorAlert.text()).toContain('All fields are required')
    })

    it('should show error when only username is provided', async () => {
      await mountLogin()
      const usernameInput = wrapper.find('input[data-label="Username"]')
      const form = wrapper.find('form')

      await usernameInput.setValue('testuser')
      await form.trigger('submit.prevent')
      await flushPromises()

      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('All fields are required')
    })

    it('should show error when only password is provided', async () => {
      await mountLogin()
      const passwordInput = wrapper.find('input[type="password"]')
      const form = wrapper.find('form')

      await passwordInput.setValue('password123')
      await form.trigger('submit.prevent')
      await flushPromises()

      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('All fields are required')
    })
  })

  describe('Local Authentication', () => {
    it('should display error message when API returns error', async () => {
      await mountLogin()
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ error: 'Invalid credentials' }, false, 401),
      )

      const usernameInput = wrapper.find('input[data-label="Username"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const form = wrapper.find('form')

      await usernameInput.setValue('wronguser')
      await passwordInput.setValue('wrongpass')
      await form.trigger('submit.prevent')
      await flushPromises()

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/local/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'wronguser',
            password: 'wrongpass',
          }),
        }),
      )
      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('Invalid credentials')
    })

    it('should handle successful login and navigate to home', async () => {
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)

      await mountLogin()

      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/auth/local/login')) {
          return mockFetchResponse({
            success: 'Login successful',
            user: mockUser,
          })
        }
        if (url.includes('/api/sessions/me')) {
          return mockFetchResponse({ success: true })
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      const usernameInput = wrapper.find('input[data-label="Username"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const form = wrapper.find('form')

      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')
      await form.trigger('submit.prevent')
      await flushPromises()

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/local/login',
        expect.any(Object),
      )
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/me',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      )
      expect(router.currentRoute.value.path).toBe('/home')
    })

    it('should handle network error gracefully', async () => {
      await mountLogin()
      fetchMock.mockRejectedValue(new Error('Network error'))

      const usernameInput = wrapper.find('input[data-label="Username"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const form = wrapper.find('form')

      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')
      await form.trigger('submit.prevent')
      await flushPromises()

      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('Network error')
    })
  })

  describe('Email Verification Flow', () => {
    it('should show resend verification button when email not verified', async () => {
      await mountLogin()
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ error: 'Email not verified. Please check your inbox.' }, false, 403),
      )

      const usernameInput = wrapper.find('input[data-label="Username"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const form = wrapper.find('form')

      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')
      await form.trigger('submit.prevent')
      await flushPromises()

      const resendButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('Resend Verification Email'))
      expect(resendButton).toBeDefined()
    })

    it('should resend verification email successfully', async () => {
      await mountLogin()

      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ error: 'Email not verified. Please check your inbox.' }, false, 403),
      )

      const usernameInput = wrapper.find('input[data-label="Username"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const form = wrapper.find('form')

      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')
      await form.trigger('submit.prevent')
      await flushPromises()

      fetchMock.mockResolvedValueOnce(mockFetchResponse({ success: 'Verification email sent' }))

      const resendButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('Resend Verification Email'))
      await resendButton.trigger('click')
      await flushPromises()

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/resend-verification',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'testuser' }),
        }),
      )
      const successAlert = wrapper.find('.v-alert[data-type="success"]')
      expect(successAlert.text()).toContain('Verification email sent')
    })
  })

  describe('OAuth Flow (Web)', () => {
    it('should render Google OAuth button for web', async () => {
      window.isTauri = false

      await mountLogin()

      const googleLogin = wrapper.findComponent({ name: 'GoogleLogin' })
      expect(googleLogin.exists()).toBe(true)
    })

    it('should handle OAuth registration flow', async () => {
      await mountLogin()
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          success: 'register',
        }),
      )

      const oauthResponse = { access_token: 'mock-oauth-token' }
      await wrapper.vm.loginUsingOAuth(oauthResponse)
      await flushPromises()

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/oauth',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ token: 'mock-oauth-token' }),
        }),
      )
      expect(wrapper.vm.usingOAuthRegister).toBe(true)
      const successAlert = wrapper.find('.v-alert[data-type="success"]')
      expect(successAlert.text()).toContain('Authorization completed')
    })

    it('should handle OAuth login for existing user', async () => {
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)

      await mountLogin()

      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/auth/oauth')) {
          return mockFetchResponse({
            success: 'login',
            userId: mockUser.userId,
            username: mockUser.username,
            email: mockUser.email,
          })
        }
        if (url.includes('/api/sessions/me')) {
          return mockFetchResponse({ success: true })
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      const oauthResponse = { access_token: 'mock-oauth-token' }
      await wrapper.vm.loginUsingOAuth(oauthResponse)
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/home')
    })

    it('should show error when OAuth fails', async () => {
      await mountLogin()
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ error: 'OAuth authentication failed' }, false, 401),
      )

      const oauthResponse = { access_token: 'invalid-token' }
      await wrapper.vm.loginUsingOAuth(oauthResponse)
      await flushPromises()

      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('OAuth authentication failed')
    })
  })

  describe('OAuth Flow (Tauri Desktop)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      global.window.isTauri = true
    })

    afterEach(() => {
      if (vi.isFakeTimers()) {
        vi.useRealTimers()
      }
      global.window.isTauri = false
    })

    it('should render Tauri-specific OAuth button', async () => {
      await mountLogin()

      const tauriButton = wrapper.findComponent({ name: 'v-icon-login' })
      expect(tauriButton.exists()).toBe(true)
    })

    it('should open browser with deeplink redirect', async () => {
      await mountLogin()

      await wrapper.vm.loginWithGoogleInTauri()
      await flushPromises()

      expect(open).toHaveBeenCalled()
      const openCall = open.mock.calls[0][0]
      expect(openCall).toContain('accounts.google.com/o/oauth2/v2/auth')
      expect(openCall).toContain('redirect_uri=com.teams-management.vn%3A%2F%2Foauth%2Fcallback')
      expect(openCall).toContain('client_id=test-client-id')
      expect(openCall).toContain('code_challenge_method=S256')
    })

    it('should initiate OAuth with deeplink for new user registration', async () => {
      await mountLogin()

      await wrapper.vm.loginWithGoogleInTauri()
      await flushPromises()

      expect(open).toHaveBeenCalled()
      const openCall = open.mock.calls[0][0]
      expect(openCall).toContain('accounts.google.com/o/oauth2/v2/auth')
      expect(openCall).toContain('com.teams-management.vn')

      // Should show success message about opening browser
      const successAlert = wrapper.find('.v-alert[data-type="success"]')
      expect(successAlert.text()).toContain('Opening browser for authentication')
    })

    it('should initiate OAuth with deeplink for existing user login', async () => {
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)

      await mountLogin()

      await wrapper.vm.loginWithGoogleInTauri()
      await flushPromises()

      expect(open).toHaveBeenCalled()
      const openCall = open.mock.calls[0][0]
      expect(openCall).toContain('accounts.google.com/o/oauth2/v2/auth')
      expect(openCall).toContain('com.teams-management.vn')

      // Should show success message about opening browser
      const successAlert = wrapper.find('.v-alert[data-type="success"]')
      expect(successAlert.text()).toContain('Opening browser for authentication')
    })

    it('should handle OAuth initialization', async () => {
      await mountLogin()

      await wrapper.vm.loginWithGoogleInTauri()
      await flushPromises()

      expect(open).toHaveBeenCalled()
      const openCall = open.mock.calls[0][0]
      expect(openCall).toContain('accounts.google.com/o/oauth2/v2/auth')
      expect(openCall).toContain('redirect_uri=com.teams-management.vn%3A%2F%2Foauth%2Fcallback')

      // Should not be loading anymore since OAuth is handled by deeplink
      expect(wrapper.vm.isLoading).toBe(false)
    })

    it('should handle OAuth data from sessionStorage', async () => {
      // Simulate OAuth data stored by OAuth2Redirect component
      const oauthData = {
        action: 'login',
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
      }
      sessionStorage.setItem('oauth_login_data', JSON.stringify(oauthData))

      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)

      await mountLogin()
      await flushPromises()

      // Should process the stored OAuth data and redirect
      expect(wrapper.vm.userId).toBe('test-user-id')
      expect(wrapper.vm.username).toBe('testuser')
      expect(wrapper.vm.userEmail).toBe('test@example.com')
    })
  })

  describe('OAuth Registration Completion', () => {
    it('should complete OAuth registration with username', async () => {
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)

      await mountLogin()

      wrapper.vm.usingOAuthRegister = true
      wrapper.vm.userEmail = 'newuser@example.com'
      await flushPromises()

      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/auth/google/register')) {
          return mockFetchResponse({
            success: 'Registration successful',
            userId: mockUser.userId,
            username: 'newusername',
            email: 'newuser@example.com',
          })
        }
        if (url.includes('/api/sessions/me')) {
          return mockFetchResponse({ success: true })
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      const usernameInput = wrapper.find('input[data-label="Username"]')
      await usernameInput.setValue('newusername')
      const form = wrapper.find('form')
      await form.trigger('submit.prevent')
      await flushPromises()

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/google/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'newusername',
            email: 'newuser@example.com',
          }),
        }),
      )
      expect(router.currentRoute.value.path).toBe('/home')
    })

    it('should show error if username is already taken', async () => {
      await mountLogin()
      wrapper.vm.usingOAuthRegister = true
      wrapper.vm.userEmail = 'newuser@example.com'
      await flushPromises()

      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ error: 'Username already exists' }, false, 409),
      )

      const usernameInput = wrapper.find('input[data-label="Username"]')
      await usernameInput.setValue('existinguser')
      const form = wrapper.find('form')
      await form.trigger('submit.prevent')
      await flushPromises()

      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('Username already exists')
    })
  })

  describe('Navigation', () => {
    it('should navigate to register page when clicking Sign up', async () => {
      await mountLogin()

      const signUpButton = wrapper.findAll('button').find((btn) => btn.text().includes('Sign up'))
      await signUpButton.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/register')
    })

    it('should navigate to forgot password page', async () => {
      await mountLogin()

      const forgotPasswordButton = wrapper
        .findAll('button')
        .find((btn) => btn.text().includes('Forgot Password'))
      await forgotPasswordButton.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/forgot-password')
    })

    it('should navigate back to landing page', async () => {
      await mountLogin()

      const backButton = wrapper
        .findAll('button')
        .find((btn) => btn.html().includes('mdi-arrow-left'))
      await backButton.trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/')
    })
  })

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      await mountLogin()
      const passwordFields = wrapper.findAll('.v-text-field')
      const passwordWrapper = passwordFields.find(
        (field) => field.find('input').attributes('data-label') === 'Password',
      )
      expect(passwordWrapper).toBeDefined()
      const passwordInput = passwordWrapper.find('input')
      expect(passwordInput.attributes('type')).toBe('password')

      const toggleButton = passwordWrapper.find('.append-inner')
      await toggleButton.trigger('click')
      await flushPromises()

      expect(wrapper.vm.showPassword).toBe(true)

      const toggledInput = passwordWrapper.find('input')
      expect(toggledInput.attributes('type')).toBe('text')
    })
  })
})
