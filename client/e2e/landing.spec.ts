import { expect, test } from '@playwright/test'

test.describe('landing page', () => {
  test('renders the public landing experience', async ({ page }) => {
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
      if (url.includes('/api/users') || url.includes('/api/auth/tokens/access')) {
        await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
        return
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })

    await page.goto('/')
    await expect(page).toHaveTitle(/Team/i)
    await expect(page.locator('#app')).toBeVisible()
  })
})
