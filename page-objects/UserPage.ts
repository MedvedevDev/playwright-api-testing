import { Page, Locator } from "@playwright/test";

export class UserPage {
  readonly page: Page;
  readonly usernameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByRole("textbox", { name: "Username" });
  }
}
