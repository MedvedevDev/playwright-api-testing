import { expect, test } from "@playwright/test";

/**
 * The likesCounter test depends on newArticle.setup.ts.
 * Playwright runs the setup first to log in and create data,
 * then opens a fresh browser for the main test using the saved session.
 *
 * newArticle.setup.ts authenticates and saves the session to auth.json, allowing likesCounter.spec.ts
 * to skip login and run as an authorized user in an isolated browser instance.
 *
 * Finally, deleteArticle.setup.ts runs as a teardown to clean up by removing the created article via API.
 */
test("like counter increase @regression", async ({ page }) => {
  await page.goto(process.env.BASE_URL!);
  await page.getByText("Global Feed").click();
  const firstLikeButton = page
    .locator("app-article-preview")
    .first()
    .locator("button");

  const likeCountBefore = await firstLikeButton.innerText();
  await firstLikeButton.click();
  await expect(firstLikeButton).not.toHaveText(likeCountBefore);
});
