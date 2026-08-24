import { expect, test } from '@playwright/test'

test.describe('public navigation', () => {
  test('opens about and legal pages', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      if (route.request().url().includes('/api/csrf-token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ csrfToken: 'e2e-token' }),
        })
        return
      }
      await route.fulfill({ status: 401, body: '{}' })
    })

    await page.goto('/about')
    await expect(page.locator('#app')).toBeVisible()
    await page.goto('/privacy-policy')
    await expect(page.locator('#app')).toBeVisible()
    await page.goto('/terms-of-service')
    await expect(page.locator('#app')).toBeVisible()
    await page.goto('/not-a-real-page')
    await expect(page.getByText(/not found/i).first()).toBeVisible()
  })
})
