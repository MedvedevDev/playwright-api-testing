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

test.beforeEach("Login to application", async ({ page }) => {
  const loginPage = new LoginPage(page);
  // Open home page
  await page.goto(process.env.BASE_URL!);
  await page.getByRole("link", { name: "Sign in" }).click();
  await loginPage.login(process.env.USER_EMAIL!, process.env.USER_PASSWORD!);
});

test.describe("API Integration & Hybrid Tests", () => {
  test.describe("Positive Scenarios", () => {
    test("mock tags array on the main page @regression", async ({ page }) => {
      await page.route("**/api/tags", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(tags),
        });
      });

      // Trigger the mock
      await page.reload();

      // Verify that UI container mocked tags
      const tagList = page.locator(".tag-list");
      await expect(tagList).toContainText(tags.tags[0]);
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

    test("create article via API and verify on UI @smoke @regression", async ({
      page,
      request,
    }) => {
      // Get Auth Token
      const token = await getAuthToken(request);

      // Generate test title and test description
      const testTitle = generateTestData("title");
      const testDescription = generateTestData("description");
      const testBody = generateTestData("body");

      // Create an article
      const createdArticleResponse = await request.post(
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
      expect(createdArticleResponse.status()).toEqual(201);

      // Perform a full contract check to ensure all user fields are returned correctly
      const articleResponseBody = await createdArticleResponse.json();
      expect(articleResponseBody.article).toMatchObject({
        title: testTitle,
        description: testDescription,
        body: testBody,
        slug: expect.any(String),
        tagList: expect.any(Array),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        favorited: expect.any(Boolean),
        favoritesCount: expect.any(Number),
        author: expect.any(Object),
      });

      // Delete just created article with UI
      await page.getByText("Global Feed").click();
      await page
        .locator("app-article-preview")
        .filter({ hasText: testTitle })
        .locator("h1")
        .click();
      await page
        .getByRole("button", { name: "Delete Article" })
        .first()
        .click();

      // Verify that the article is deleted
      await page.getByText("Global Feed").click();
      await expect(
        page.locator("app-article-preview h1").first(),
      ).not.toContainText(testTitle);
    });

    test("delete article via API and verify UI removal  @smoke @regression", async ({
      page,
      request,
    }) => {
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
      await expect(
        page.locator("app-article-preview h1").first(),
      ).toContainText(testTitle);

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

    test("update article via API and verify data integrity @smoke @regression", async ({
      page,
      request,
    }) => {
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
      await expect(
        page.locator("app-article-preview h1").first(),
      ).toContainText(testTitle);

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

      // Perform a full contract check to ensure all user fields are returned correctly
      const body = await updateArticleResponse.json();
      expect(body.article).toMatchObject({
        title: testTitle + " updated",
        description: testDescription + " updated",
        body: testBody + " updated",
        tagList: expect.any(Array),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        favorited: expect.any(Boolean),
        favoritesCount: expect.any(Number),
        author: expect.any(Object),
      });

      // Verify that article data is updated on Backend and UI
      await page.reload();
      // Intercept request
      const allArticlesResponse =
        await page.waitForResponse("**/api/articles*");
      const allArticlesResponseBody = await allArticlesResponse.json();
      expect(allArticlesResponseBody.articles[0].title).toBe(
        testTitle + " updated",
      );
      expect(allArticlesResponseBody.articles[0].description).toBe(
        testDescription + " updated",
      );
      expect(allArticlesResponseBody.articles[0].body).toBe(
        testBody + " updated",
      );
      await expect(
        page.locator("app-article-preview h1").first(),
      ).toContainText(testTitle + " updated");
    });

    test("update username via API and verify header UI @regression", async ({
      page,
      request,
    }) => {
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

    test("add to favourites via API and verify status @regression", async ({
      page,
      request,
    }) => {
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

      // Add to favourites
      const addArticleToFavsResponse = await request.post(
        `${process.env.BASE_API_URL!}/api/articles/${slugId}/favorite`,
        {
          headers: {
            Authorization: "Token " + token,
          },
        },
      );
      expect(addArticleToFavsResponse.status()).toEqual(200);

      // Perform a full contract check to ensure all user fields are returned correctly
      const body = await addArticleToFavsResponse.json();
      expect(body.article).toMatchObject({
        author: expect.any(Object),
        body: expect.any(String),
        createdAt: expect.any(String),
        description: expect.any(String),
        favorited: true,
        favoritesCount: 1,
        id: expect.any(Number),
        slug: expect.any(String),
        tagList: expect.any(Array),
        title: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify that favourite status for particular article is updated  on UI
      await page.getByText("Home").click();
      const firstLikeButton = page
        .locator("app-article-preview")
        .first()
        .locator("button");
      await expect(firstLikeButton).toHaveText("1");
    });

    test("remove from favourites via API and verify status @regression", async ({
      page,
      request,
    }) => {
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

      // Add current article to favourites
      await page.getByText("Home").click();
      const firstLikeButton = page
        .locator("app-article-preview")
        .first()
        .locator("button");
      await firstLikeButton.click();
      // Wait for the UI to show that the current article is favourited
      await expect(firstLikeButton).toContainText("1");

      // Remove from  favourites
      const addArticleToFavsResponse = await request.delete(
        `${process.env.BASE_API_URL!}/api/articles/${slugId}/favorite`,
        {
          headers: {
            Authorization: "Token " + token,
          },
        },
      );
      expect(addArticleToFavsResponse.status()).toEqual(200);

      // Perform a full contract check to ensure all user fields are returned correctly
      const body = await addArticleToFavsResponse.json();
      expect(body.article).toMatchObject({
        author: expect.any(Object),
        body: expect.any(String),
        createdAt: expect.any(String),
        description: expect.any(String),
        favorited: false,
        favoritesCount: 0,
        id: expect.any(Number),
        slug: expect.any(String),
        tagList: expect.any(Array),
        title: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Verify that favourite status for particular article is updated  on UI
      await page.getByText("Global Feed").click();
      await expect(firstLikeButton).toHaveText("0");
    });
  });

  test.describe("Negative & Edge Case Scenarios", () => {
    test("UI shoud show loading state when tags API fails with 500 @negative @regression", async ({
      page,
    }) => {
      await page.route("**/api/tags", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ errors: { body: ["Internal Server Error"] } }),
        });
      });
      await page.reload();
      await expect(page.locator(".tag-list")).toBeEmpty();
      await expect(page.getByText("Loading tags...")).toBeVisible();
    });

    test("should handle network failure for tags API via abort @negative @regression", async ({
      page,
    }) => {
      await page.route("**/api/tags", (route) =>
        route.abort("internetdisconnected"),
      );

      await page.reload();
      await expect(page.locator(".tag-list")).toBeEmpty();
      await expect(page.getByText("Loading tags...")).toBeVisible();
    });

    test("should show UI state when articles API fails with 500 @negative @regression", async ({
      page,
    }) => {
      await page.route("**/api/articles*", async (route) => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ errors: { body: ["Server Error"] } }),
        });
      });

      await page.getByText("Global Feed").click();
      await expect(page.getByText("Loading articles...")).toBeVisible();
    });

    test("mock empty articles list @edge-case", async ({ page }) => {
      await page.route("**/api/articles*", async (route) => {
        const response = await route.fetch();
        const responseBody = await response.json();

        // Simulate an empty array of articles
        responseBody.articles = [];
        responseBody.articlesCount = 0;

        await route.fulfill({
          body: JSON.stringify(responseBody),
        });
      });

      await page.getByText("Global Feed").click();
      await expect(
        page.getByText("No articles are here... yet."),
      ).toBeVisible();
    });
  });
});
