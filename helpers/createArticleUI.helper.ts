import { Page } from "@playwright/test";

export async function createArticleUI(
  page: Page,
  title: string,
  description: string,
  articleText: string,
) {
  await page.getByText("New Article").click();
  await page.getByRole("textbox", { name: "Article Title" }).fill(title);
  await page
    .getByRole("textbox", { name: "What's this article about?" })
    .fill(description);
  await page
    .getByRole("textbox", { name: "Write your article (in markdown)" })
    .fill(articleText);
  await page.getByRole("button", { name: "Publish Article" }).click();
}
