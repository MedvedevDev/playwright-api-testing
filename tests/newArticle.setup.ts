import { test as setup, expect } from "@playwright/test";
import { getAuthToken } from "../api/auth.api";
import { generateTestData } from "../helpers/test-data.helper";
import path from "path";
const authFile = path.join(__dirname, "../.auth/user.json");

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
setup("create new article", async ({ page, request }) => {
  // Navigate to Login
  await page.goto(process.env.BASE_URL!);
  await page.getByRole("link", { name: "Sign in" }).click();
  await page
    .getByRole("textbox", { name: "Email" })
    .fill(process.env.USER_EMAIL!);
  await page
    .getByRole("textbox", { name: "Password" })
    .fill(process.env.USER_PASSWORD!);
  await page.getByRole("button").click();

  // Get Auth Token
  const token = await getAuthToken();
  // Generate test title and test description
  const title = generateTestData("title");
  const description = generateTestData("description");
  const articleText = generateTestData("body");

  const createdArticleResponse = await request.post(
    `${process.env.BASE_API_URL!}/api/articles/`,
    {
      data: {
        article: {
          tagList: [],
          title: title,
          description: description,
          body: articleText,
        },
      },
      headers: {
        Authorization: "Token " + token,
      },
    },
  );
  expect(createdArticleResponse.status()).toEqual(201);

  // save slug id from articleResponse body
  const response = await createdArticleResponse.json();
  const slugId = response.article.slug;
  process.env["SLUGID"] = slugId;
  // saving auth state
  await page.context().storageState({ path: authFile });
});
