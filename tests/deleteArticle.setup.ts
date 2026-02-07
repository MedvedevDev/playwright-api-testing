import { test as setup, expect } from "@playwright/test";
import { getAuthToken } from "../api/auth.api";

// runs as a teardown to clean up by removing the created article via API
setup("delete the article", async ({ request }) => {
  // Get Auth Token
  const token = await getAuthToken();
  // Delete article via API
  const deleteArticleResponse = await request.delete(
    `${process.env.BASE_API_URL!}/api/articles/${process.env.SLUGID}`,
    {
      headers: {
        Authorization: "Token " + token,
      },
    },
  );

  expect(deleteArticleResponse.status()).toEqual(204);
});
