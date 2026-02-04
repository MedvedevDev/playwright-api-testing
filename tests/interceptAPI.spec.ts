import { test, expect, request } from "@playwright/test";
import tags from "../test-data/tags.json";

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

test("delete article", async ({ page, request }) => {
  // Perform login
  const response = await request.post(
    `${process.env.BASE_API_URL!}/api/users/login`,
    {
      data: { user: { email: "testemail@gaga.ge", password: "testpassword" } },
    },
  );

  // Get the auth token from response
  const responseBody = await response.json();
  const token = responseBody.user.token;

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

  // Delete just created article
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
