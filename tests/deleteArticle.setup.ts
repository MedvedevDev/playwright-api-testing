import { test as setup, expect } from "@playwright/test";
import { getAuthToken } from "../api/auth.api";
import fs from "fs";
import path from "path";

// runs as a teardown to clean up by removing the created article via API
setup("delete the article", async ({ request }) => {
  // Get Auth Token
  const token = await getAuthToken();
  // Delete article via API
  const articleFilePath = path.join(__dirname, "../.auth/article-details.json");
  const fileData = fs.readFileSync(articleFilePath, "utf-8");
  const { slugId } = JSON.parse(fileData);

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
