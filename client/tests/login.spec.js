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

import { h } from 'vue'

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

const GoogleLoginStub = {
  name: 'GoogleLogin',
  emits: ['success', 'error'],
  render() {
    return h('div', { class: 'google-login' }, this.$slots.default ? this.$slots.default() : [])
  },
}

const VIconLoginStub = {
  name: 'v-icon-login',
  render() {
    return h('div', { class: 'v-icon-login' }, this.$slots.default ? this.$slots.default() : [])
  },
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
    vi.clearAllTimers()
  })

  const mountLogin = async (options = {}) => {
    const { global: globalOptions, ...mountOptions } = options
    wrapper = mount(Login, {
      global: {
        plugins: [router, pinia],
        ...globalOptions,
        stubs: {
          GoogleLogin: GoogleLoginStub,
          'v-icon-login': VIconLoginStub,
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
      // Act
      await mountLogin()

      // Assert
      const usernameField = wrapper.find('input[data-label="Username"]')
      const passwordField = wrapper.find('input[type="password"]')
      const loginButton = wrapper.find('button[type="submit"]')

      expect(usernameField.exists()).toBe(true)
      expect(passwordField.exists()).toBe(true)
      expect(loginButton.exists()).toBe(true)
    })

    it('should have back button and navigation links', async () => {
      // Act
      await mountLogin()

      // Assert
      const backButton = wrapper.findAll('button').find(btn =>
        btn.html().includes('mdi-arrow-left')
      )
      expect(backButton).toBeDefined()

      const signUpButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Sign up')
      )
      expect(signUpButton).toBeDefined()
    })
  })

  describe('Form Validation', () => {
    it('should show error when fields are empty', async () => {
      // Arrange
      await mountLogin()
      const form = wrapper.find('form')

      // Act
      await form.trigger('submit.prevent')
      await flushPromises()

      // Assert
      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.exists()).toBe(true)
      expect(errorAlert.text()).toContain('All fields are required')
    })

    it('should show error when only username is provided', async () => {
      // Arrange
      await mountLogin()
      const usernameInput = wrapper.find('input[data-label="Username"]')
      const form = wrapper.find('form')

      // Act
      await usernameInput.setValue('testuser')
      await form.trigger('submit.prevent')
      await flushPromises()

      // Assert
      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('All fields are required')
    })

    it('should show error when only password is provided', async () => {
      // Arrange
      await mountLogin()
      const passwordInput = wrapper.find('input[type="password"]')
      const form = wrapper.find('form')

      // Act
      await passwordInput.setValue('password123')
      await form.trigger('submit.prevent')
      await flushPromises()

      // Assert
      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('All fields are required')
    })
  })

  describe('Local Authentication', () => {
    it('should display error message when API returns error', async () => {
      // Arrange
      await mountLogin()
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ error: 'Invalid credentials' }, false, 401)
      )

      const usernameInput = wrapper.find('input[data-label="Username"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const form = wrapper.find('form')

      // Act
      await usernameInput.setValue('wronguser')
      await passwordInput.setValue('wrongpass')
      await form.trigger('submit.prevent')
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/local/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'wronguser',
            password: 'wrongpass',
          }),
        })
      )
      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('Invalid credentials')
    })

    it('should handle successful login and navigate to home', async () => {
      // Arrange
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)

      await mountLogin()

      // Mock successful login response
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

      // Act
      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')
      await form.trigger('submit.prevent')
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/local/login',
        expect.any(Object)
      )
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/me',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )
      expect(router.currentRoute.value.path).toBe('/home')
    })

    it('should handle network error gracefully', async () => {
      // Arrange
      await mountLogin()
      fetchMock.mockRejectedValue(new Error('Network error'))

      const usernameInput = wrapper.find('input[data-label="Username"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const form = wrapper.find('form')

      // Act
      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')
      await form.trigger('submit.prevent')
      await flushPromises()

      // Assert
      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('Network error')
    })
  })

  describe('Email Verification Flow', () => {
    it('should show resend verification button when email not verified', async () => {
      // Arrange
      await mountLogin()
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse(
          { error: 'Email not verified. Please check your inbox.' },
          false,
          403
        )
      )

      const usernameInput = wrapper.find('input[data-label="Username"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const form = wrapper.find('form')

      // Act
      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')
      await form.trigger('submit.prevent')
      await flushPromises()

      // Assert
      const resendButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Resend Verification Email')
      )
      expect(resendButton).toBeDefined()
    })

    it('should resend verification email successfully', async () => {
      // Arrange
      await mountLogin()

      // First mock: login fails with email not verified
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse(
          { error: 'Email not verified. Please check your inbox.' },
          false,
          403
        )
      )

      const usernameInput = wrapper.find('input[data-label="Username"]')
      const passwordInput = wrapper.find('input[type="password"]')
      const form = wrapper.find('form')

      await usernameInput.setValue('testuser')
      await passwordInput.setValue('password123')
      await form.trigger('submit.prevent')
      await flushPromises()

      // Second mock: resend verification succeeds
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ success: 'Verification email sent' })
      )

      // Act
      const resendButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Resend Verification Email')
      )
      await resendButton.trigger('click')
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/resend-verification',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'testuser' }),
        })
      )
      const successAlert = wrapper.find('.v-alert[data-type="success"]')
      expect(successAlert.text()).toContain('Verification email sent')
    })
  })

  describe('OAuth Flow (Web)', () => {
    it('should render Google OAuth button for web', async () => {
      // Arrange
      window.isTauri = false

      // Act
      await mountLogin()

      // Assert
      const googleLogin = wrapper.findComponent({ name: 'GoogleLogin' })
      expect(googleLogin.exists()).toBe(true)
    })

    it('should handle OAuth registration flow', async () => {
      // Arrange
      await mountLogin()
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({
          success: 'register',
        })
      )

      // Act - simulate OAuth callback with token
      const oauthResponse = { access_token: 'mock-oauth-token' }
      await wrapper.vm.loginUsingOAuth(oauthResponse)
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/oauth',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ token: 'mock-oauth-token' }),
        })
      )
      expect(wrapper.vm.usingOAuthRegister).toBe(true)
      const successAlert = wrapper.find('.v-alert[data-type="success"]')
      expect(successAlert.text()).toContain('Authorization completed')
    })

    it('should handle OAuth login for existing user', async () => {
      // Arrange
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

      // Act
      const oauthResponse = { access_token: 'mock-oauth-token' }
      await wrapper.vm.loginUsingOAuth(oauthResponse)
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/home')
    })

    it('should show error when OAuth fails', async () => {
      // Arrange
      await mountLogin()
      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ error: 'OAuth authentication failed' }, false, 401)
      )

      // Act
      const oauthResponse = { access_token: 'invalid-token' }
      await wrapper.vm.loginUsingOAuth(oauthResponse)
      await flushPromises()

      // Assert
      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('OAuth authentication failed')
    })
  })

  describe('OAuth Flow (Tauri Desktop)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      window.isTauri = true
    })

    afterEach(() => {
      vi.useRealTimers()
      window.isTauri = false
    })

    it('should render Tauri-specific OAuth button', async () => {
      // Act
      await mountLogin()

      // Assert
      const tauriButton = wrapper.findComponent({ name: 'v-icon-login' })
      expect(tauriButton.exists()).toBe(true)
    })

    it('should open browser and poll for OAuth completion', async () => {
      // Arrange
      await mountLogin()

      // Mock OAuth start endpoint
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/auth/oauth/start')) {
          return mockFetchResponse({ success: true })
        }
        if (url.includes('/api/auth/oauth/status')) {
          return mockFetchResponse({ status: 'pending' })
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      // Act
      const promise = wrapper.vm.loginWithGoogleInTauri()
      await flushPromises()

      // Assert - browser should open
      expect(open).toHaveBeenCalled()
      const openCall = open.mock.calls[0][0]
      expect(openCall).toContain('accounts.google.com/o/oauth2/v2/auth')
      expect(openCall).toContain('client_id=test-client-id')
      expect(openCall).toContain('code_challenge_method=S256')

      // Assert - should start polling
      await advanceTimersAndFlush(2000)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/oauth/status'),
        undefined
      )
    })

    it('should handle successful OAuth polling for new user', async () => {
      // Arrange
      await mountLogin()

      let pollCount = 0
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/auth/oauth/start')) {
          return mockFetchResponse({ success: true })
        }
        if (url.includes('/api/auth/oauth/status')) {
          pollCount++
          if (pollCount >= 2) {
            return mockFetchResponse({
              status: 'completed',
              action: 'register',
              userEmail: 'newuser@example.com',
            })
          }
          return mockFetchResponse({ status: 'pending' })
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      // Act
      const promise = wrapper.vm.loginWithGoogleInTauri()

      // Simulate polling
      await flushPromises()
      await advanceTimersAndFlush(2000)
      await advanceTimersAndFlush(2000)
      await flushPromises()

      // Assert
      expect(wrapper.vm.usingOAuthRegister).toBe(true)
      expect(wrapper.vm.userEmail).toBe('newuser@example.com')
      const successAlert = wrapper.find('.v-alert[data-type="success"]')
      expect(successAlert.text()).toContain('Authorization completed')
    })

    it('should handle successful OAuth polling for existing user', async () => {
      // Arrange
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)

      await mountLogin()

      let pollCount = 0
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/auth/oauth/start')) {
          return mockFetchResponse({ success: true })
        }
        if (url.includes('/api/auth/oauth/status')) {
          pollCount++
          if (pollCount >= 2) {
            return mockFetchResponse({
              status: 'completed',
              action: 'login',
              userId: mockUser.userId,
              username: mockUser.username,
              userEmail: mockUser.email,
            })
          }
          return mockFetchResponse({ status: 'pending' })
        }
        if (url.includes('/api/sessions/me')) {
          return mockFetchResponse({ success: true })
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      // Act
      wrapper.vm.loginWithGoogleInTauri()
      await flushPromises()
      await advanceTimersAndFlush(2000)
      await advanceTimersAndFlush(2000)
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/home')
    })

    it('should timeout after max polling attempts', async () => {
      // Arrange
      await mountLogin()

      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/auth/oauth/start')) {
          return mockFetchResponse({ success: true })
        }
        if (url.includes('/api/auth/oauth/status')) {
          return mockFetchResponse({ status: 'pending' })
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      // Act
      wrapper.vm.loginWithGoogleInTauri()
      await flushPromises()

      // Advance past max attempts (60 attempts * 2 seconds)
      for (let i = 0; i < 61; i++) {
        await advanceTimersAndFlush(2000)
      }

      // Assert
      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('OAuth timeout')
    })

    it('should handle OAuth error status', async () => {
      // Arrange
      await mountLogin()

      let pollCount = 0
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/auth/oauth/start')) {
          return mockFetchResponse({ success: true })
        }
        if (url.includes('/api/auth/oauth/status')) {
          pollCount++
          if (pollCount >= 2) {
            return mockFetchResponse({
              status: 'error',
              message: 'User denied access',
            })
          }
          return mockFetchResponse({ status: 'pending' })
        }
        return mockFetchResponse({ error: 'Not found' }, false, 404)
      })

      // Act
      wrapper.vm.loginWithGoogleInTauri()
      await flushPromises()
      await advanceTimersAndFlush(2000)
      await advanceTimersAndFlush(2000)
      await flushPromises()

      // Assert
      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('User denied access')
    })
  })

  describe('OAuth Registration Completion', () => {
    it('should complete OAuth registration with username', async () => {
      // Arrange
      const mockUser = createMockUser()
      AuthStore.getUserByAccessToken.mockResolvedValue(mockUser)

      await mountLogin()

      // Set OAuth register mode
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

      // Act
      const usernameInput = wrapper.find('input[data-label="Username"]')
      await usernameInput.setValue('newusername')
      const form = wrapper.find('form')
      await form.trigger('submit.prevent')
      await flushPromises()

      // Assert
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/google/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'newusername',
            email: 'newuser@example.com',
          }),
        })
      )
      expect(router.currentRoute.value.path).toBe('/home')
    })

    it('should show error if username is already taken', async () => {
      // Arrange
      await mountLogin()
      wrapper.vm.usingOAuthRegister = true
      wrapper.vm.userEmail = 'newuser@example.com'
      await flushPromises()

      fetchMock.mockResolvedValueOnce(
        mockFetchResponse({ error: 'Username already exists' }, false, 409)
      )

      // Act
      const usernameInput = wrapper.find('input[data-label="Username"]')
      await usernameInput.setValue('existinguser')
      const form = wrapper.find('form')
      await form.trigger('submit.prevent')
      await flushPromises()

      // Assert
      const errorAlert = wrapper.find('.v-alert[data-type="error"]')
      expect(errorAlert.text()).toContain('Username already exists')
    })
  })

  describe('Navigation', () => {
    it('should navigate to register page when clicking Sign up', async () => {
      // Arrange
      await mountLogin()

      // Act
      const signUpButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Sign up')
      )
      await signUpButton.trigger('click')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/register')
    })

    it('should navigate to forgot password page', async () => {
      // Arrange
      await mountLogin()

      // Act
      const forgotPasswordButton = wrapper.findAll('button').find(btn =>
        btn.text().includes('Forgot Password')
      )
      await forgotPasswordButton.trigger('click')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/forgot-password')
    })

    it('should navigate back to landing page', async () => {
      // Arrange
      await mountLogin()

      // Act
      const backButton = wrapper.findAll('button').find(btn =>
        btn.html().includes('mdi-arrow-left')
      )
      await backButton.trigger('click')
      await flushPromises()

      // Assert
      expect(router.currentRoute.value.path).toBe('/')
    })
  })

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      // Arrange
      await mountLogin()
      const passwordFields = wrapper.findAll('.v-text-field')
      const passwordWrapper = passwordFields.find(field =>
        field.find('input').attributes('data-label') === 'Password'
      )
      expect(passwordWrapper).toBeDefined()
      const passwordInput = passwordWrapper.find('input')
      expect(passwordInput.attributes('type')).toBe('password')

      // Act - click eye icon
      const toggleButton = passwordWrapper.find('.append-inner')
      await toggleButton.trigger('click')
      await flushPromises()

      // Assert
      expect(wrapper.vm.showPassword).toBe(true)

      // Should now be text type
      const toggledInput = passwordWrapper.find('input')
      expect(toggledInput.attributes('type')).toBe('text')
    })
  })
})
