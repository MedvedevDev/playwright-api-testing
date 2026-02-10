import { test, expect, request } from "@playwright/test";
import tags from "../test-data/tags.json";
import { getAuthToken } from "../api/auth.api";
import { generateTestData } from "../helpers/test-data.helper";
import { ArticlePage } from "../page-objects/ArticlePage";
import { LoginPage } from "../page-objects/LoginPage";

test.use({
  launchOptions: {
    args: ["--disable-http-cache", "--disable-service-worker"],
  },
});

test.beforeEach("mock tags API", async ({ page }) => {
  const loginPage = new LoginPage(page);

  // Intercept route
  await page.route("**/api/tags", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(tags),
    });
  });
  // Open home page
  await page.goto(process.env.BASE_URL!);

  await page.getByRole("link", { name: "Sign in" }).click();
  await loginPage.login(process.env.USER_EMAIL!, process.env.USER_PASSWORD!);
  // await page
  //   .getByRole("textbox", { name: "Email" })
  //   .fill(process.env.USER_EMAIL!);
  // await page
  //   .getByRole("textbox", { name: "Password" })
  //   .fill(process.env.USER_PASSWORD!);
  // await page.getByRole("button").click();

  //await expect(page.getByText("New Article", { exact: false })).toBeVisible();
});

test("mock first displaying articles in the list", async ({ page }) => {
  // Generate test title and test description
  const testTitle = generateTestData("title");
  const testDescription = generateTestData("description");

  await page.route("**/api/articles*", async (route) => {
    const response = await route.fetch();
    const responseBody = await response.json(); // array of objects: each object has slug, title, descr, body and etc.

    responseBody.articles[0].title = testTitle;
    responseBody.articles[0].description = testDescription;

    // apply new title and description to the very first atricle at the top
    await route.fulfill({
      body: JSON.stringify(responseBody),
    });
  });
  await page.getByText("Global Feed").click();

  // Verify that the article is updated
  await expect(page.locator("app-article-list h1").first()).toContainText(
    testTitle,
  );
  await expect(page.locator("app-article-list p").first()).toContainText(
    testDescription,
  );
});

test("mock article creation @smoke @regression", async ({ page, request }) => {
  // Get Auth Token
  const token = await getAuthToken(request);

  // Generate test title and test description
  const testTitle = generateTestData("title");
  const testDescription = generateTestData("description");
  const testBody = generateTestData("body");

  // Create an article
  const createdArticle = await request.post(
    `${process.env.BASE_API_URL!}/api/articles/`,
    {
      data: {
        article: {
          title: testTitle,
          description: testDescription,
          body: testBody,
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

test("mock article deletion  @regression", async ({ page, request }) => {
  const articlePage = new ArticlePage(page);
  const token = await getAuthToken(request);

  // Generate test article data
  const testTitle = generateTestData("title");
  const testDescription = generateTestData("description");
  const testBody = generateTestData("body");

  await page.getByRole("link", { name: "New Article" }).click();

  // Create an article
  articlePage.createNewArticle(testTitle, testDescription, testBody);
  // Intercept request
  const articleResponse = await page.waitForResponse(
    `${process.env.BASE_API_URL!}/api/articles/`,
  );
  const responseBody = await articleResponse.json();
  const slugId = responseBody.article.slug;

  // Verify that article is created
  await expect(page.locator(".article-page h1")).toContainText(testTitle);
  // Verify that the new article is presented in Global feed
  await page.getByText("Home").click();
  await page.getByText("Global Feed").click();
  await expect(page.locator("app-article-preview h1").first()).toContainText(
    testTitle,
  );

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

test("mock update article @regression", async ({ page, request }) => {
  const articlePage = new ArticlePage(page);
  const token = await getAuthToken(request);

  // Generate test article data
  const testTitle = generateTestData("title");
  const testDescription = generateTestData("description");
  const testBody = generateTestData("body");

  await page.getByRole("link", { name: "New Article" }).click();

  // Create an article
  articlePage.createNewArticle(testTitle, testDescription, testBody);
  // Intercept request
  const articleResponse = await page.waitForResponse(
    `${process.env.BASE_API_URL!}/api/articles/`,
  );
  const responseBody = await articleResponse.json();
  const slugId = responseBody.article.slug;

  // Verify that article is created
  await expect(page.locator(".article-page h1")).toContainText(testTitle);
  // Verify that the new article is presented in Global feed
  await page.getByText("Home").click();
  await page.getByText("Global Feed").click();
  await expect(page.locator("app-article-preview h1").first()).toContainText(
    testTitle,
  );

  // Update article via API
  const updateArticleResponse = await request.put(
    `${process.env.BASE_API_URL!}/api/articles/${slugId}`,
    {
      data: {
        article: {
          title: testTitle + " updated",
          description: testDescription + " updated",
          body: testBody + " updated",
          tagList: [],
        },
      },
      headers: {
        Authorization: "Token " + token,
      },
    },
  );

  expect(updateArticleResponse.status()).toEqual(200);

  // Verify that article data is updated on Backend and UI
  await page.reload();
  // Intercept request
  const allArticlesResponse = await page.waitForResponse("**/api/articles*");
  const allArticlesResponseBody = await allArticlesResponse.json();
  expect(allArticlesResponseBody.articles[0].title).toBe(
    testTitle + " updated",
  );
  expect(allArticlesResponseBody.articles[0].description).toBe(
    testDescription + " updated",
  );
  expect(allArticlesResponseBody.articles[0].body).toBe(testBody + " updated");
  await expect(page.locator("app-article-preview h1").first()).toContainText(
    testTitle + " updated",
  );
});

test("mock update user name @smoke @regression", async ({ page, request }) => {
  const token = await getAuthToken(request);
  const testUserName = generateTestData("username");

  // Update user via API
  const updateUsernameResponse = await request.put(
    `${process.env.BASE_API_URL!}/api/user`,
    {
      data: {
        user: {
          username: testUserName,
        },
      },
      headers: {
        Authorization: "Token " + token,
      },
    },
  );

  expect(updateUsernameResponse.status()).toEqual(200);

  // Perform a full contract check to ensure all user fields are returned correctly
  const body = await updateUsernameResponse.json();
  expect(body.user).toMatchObject({
    id: expect.any(Number),
    email: expect.stringContaining("@"),
    username: expect.any(String),
    bio: expect.any(String),
    image: expect.any(String),
    token: expect.any(String),
  });

  expect(body.user.username).toBe(testUserName);

  // Verify that the new username is displayed on UI
  await page.reload();
  const headerProfileLink = page.getByRole("link", { name: testUserName });
  await expect(headerProfileLink).toBeVisible();
});
