import { expect, test } from '@playwright/test';

// Critère d'acceptation du jalon 1 : « je me connecte à la v2 et je retrouve ma cave v1 ».
// Nécessite un compte de test v2 déjà migré (E2E_EMAIL / E2E_PASSWORD) ; ignoré sinon.
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test('un visiteur non connecté est renvoyé vers la connexion', async ({ page }) => {
  await page.goto('/cellars');
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByText('L’abus d’alcool est dangereux pour la santé', { exact: false })).toBeVisible();
});

test.describe('après migration', () => {
  test.skip(!email || !password, 'E2E_EMAIL et E2E_PASSWORD requis');

  test('je retrouve mes caves et une bouteille migrée avec sa photo et son fût', async ({ page }) => {
    await page.goto('/auth');
    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Mot de passe').fill(password!);
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page.getByRole('heading', { name: 'Mes caves' })).toBeVisible();
    const firstCellar = page.locator('article').first();
    await expect(firstCellar).toBeVisible();
    await firstCellar.getByRole('link').first().click();

    const bottleLink = page.getByRole('list').getByRole('link').first();
    await expect(bottleLink).toBeVisible();
    await bottleLink.click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('—');
    await expect(page.getByRole('heading', { name: 'Historique des estimations' })).toBeVisible();
    const migratedWithCask = process.env.E2E_EXPECT_CASK;
    if (migratedWithCask) await expect(page.getByText(`Fût n°${migratedWithCask}`)).toBeVisible();
    if (process.env.E2E_EXPECT_PHOTO) await expect(page.getByRole('img').first()).toBeVisible();
  });
});
