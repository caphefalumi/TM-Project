import { expect, test } from '@playwright/test'

test.describe('auth pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const url = route.request().url()
      if (url.includes('/api/csrf-token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ csrfToken: 'e2e-token' }),
        })
        return
      }
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    })
  })

  test('shows the login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText(/login/i).first()).toBeVisible()
    await expect(page.locator('input').first()).toBeVisible()
  })

  test('navigates between login and register', async ({ page }) => {
    await page.goto('/login')
    await page.goto('/register')
    await expect(page).toHaveURL(/register/)
    await expect(page.locator('#app')).toBeVisible()
  })
})
