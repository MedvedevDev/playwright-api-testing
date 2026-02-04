import { test, expect, request } from "@playwright/test";
import tags from "../test-data/tags.json";
import { getAuthToken } from "../api/auth.api";
import { createArticleUI } from "../helpers/createArticleUI.helper";

test.use({
  launchOptions: {
    args: ["--disable-http-cache", "--disable-service-worker"],
  },
});

test.beforeEach("mock tags API", async ({ page }) => {
  await page.route("**/api/tags", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(tags),
    });
  });
  await page.goto(process.env.BASE_URL!);
  await page.getByRole("link", { name: "Sign in" }).click();
  await page
    .getByRole("textbox", { name: "Email" })
    .fill(process.env.USER_EMAIL!);
  await page
    .getByRole("textbox", { name: "Password" })
    .fill(process.env.USER_PASSWORD!);
  await page.getByRole("button").click();
});

test("mock articles API", async ({ page }) => {
  await page.route("**/api/articles*", async (route) => {
    const response = await route.fetch();
    const responseBody = await response.json(); // array of objects: each object has slug, title, descr, body and etc.

    responseBody.articles[0].title = "NEW TITLE";
    responseBody.articles[0].description = "LOREM IPSUM LOREM";

    // apply new title and description to the very first atricle at the top
    await route.fulfill({
      body: JSON.stringify(responseBody),
    });
  });
  await page.getByText("Global Feed").click();

  // Verify that the article is updated
  await expect(page.locator("app-article-list h1").first()).toContainText(
    "NEW TITLE",
  );
  await expect(page.locator("app-article-list p").first()).toContainText(
    "LOREM IPSUM LOREM",
  );
});

test("create article without the UI", async ({ page, request }) => {
  // Get Auth Token
  const token = await getAuthToken();

  // Create an article
  const createdArticle = await request.post(
    `${process.env.BASE_API_URL!}/api/articles/`,
    {
      data: {
        article: {
          title: "from api",
          description: "from api",
          body: "fromf api",
          tagList: [],
        },
      },
      headers: {
        Authorization: "Token " + token,
      },
    },
  );
  // Assert that the article is created
  expect(createdArticle.status()).toEqual(201);

  // Delete just created article with UI
  const articleResponseBody = await createdArticle.json();
  const createdArticleTitle = articleResponseBody.article.title;
  await page.getByText("Global Feed").click();
  await page
    .locator("app-article-preview")
    .filter({ hasText: createdArticleTitle })
    .locator("h1")
    .click();
  await page.getByRole("button", { name: "Delete Article" }).first().click();

  // Verify that the article is deleted
  await page.getByText("Global Feed").click();
  await expect(
    page.locator("app-article-preview h1").first(),
  ).not.toContainText(createdArticleTitle);
});

test("intercept create article response and delete article without UI", async ({
  page,
  request,
}) => {
  // Create an article
  createArticleUI(
    page,
    "New Awesome Article",
    "This is description fot the New Awesome Article",
    "I like Playwroght  + JavaScript",
  );

  // Intercept the response
  const articleResponse = await page.waitForResponse(
    `${process.env.BASE_API_URL!}/api/articles/`,
  );
  const responseBody = await articleResponse.json();
  const slugId = responseBody.article.slug;

  // Verify that article is created
  await expect(page.locator(".article-page h1")).toContainText(
    "New Awesome Article",
  );
  // Verify that the new article is presented in Global feed
  await page.getByText("Home").click();
  await page.getByText("Global Feed").click();
  await expect(page.locator("app-article-preview h1").first()).toContainText(
    "New Awesome Article",
  );

  // Get Auth Token
  const token = await getAuthToken();
  // Delete article via API
  const deleteArticleResponse = await request.delete(
    `${process.env.BASE_API_URL!}/api/articles/${slugId}`,
    {
      headers: {
        Authorization: "Token " + token,
      },
    },
  );

  expect(deleteArticleResponse.status()).toEqual(204);
});
