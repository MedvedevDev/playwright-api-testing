import { test } from "@playwright/test";

test("mocking tags on the website", async ({ page }) => {
  await page.route(
    "*/**/api/tags",
    async (route) => {
      const tags = {
        "tags" : [
          "automation",
          "play"
        ]
      }
      await route.fulfill({
        body: JSON.stringify(tags),
      });
    },
  );

  await page.goto("https://angular.realworld.io/");
});
