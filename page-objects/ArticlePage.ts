import { Page, Locator, expect } from "@playwright/test";

export class ArticlePage {
  readonly page: Page;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly bodyInput: Locator;
  readonly publishButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.titleInput = page.getByRole("textbox", { name: "Article Title" });
    this.descriptionInput = page.getByRole("textbox", {
      name: "What's this article about?",
    });
    this.bodyInput = page.getByRole("textbox", {
      name: "Write your article (in markdown)",
    });
    this.publishButton = page.getByRole("button", { name: "Publish Article" });
  }

  async createNewArticle(title: string, description: string, body: string) {
    await this.titleInput.fill(title);
    await this.descriptionInput.fill(description);
    await this.bodyInput.fill(body);
    await this.publishButton.click();
  }
}
