import { test as setup } from "@playwright/test";

const authFile = ".auth/authorizedUser.json";

setup("authentication", async ({ page }) => {
  await page.goto(process.env.BASE_URL!);
  await page.getByRole("link", { name: "Sign in" }).click();
  await page
    .getByRole("textbox", { name: "Email" })
    .fill(process.env.USER_EMAIL!);
  await page
    .getByRole("textbox", { name: "Password" })
    .fill(process.env.USER_PASSWORD!);
  await page.getByRole("button").click();

  // to make sure that we are logged in
  await page.waitForResponse(`${process.env.BASE_API_URL}/api/tags`);

  await page.context().storageState({ path: authFile });
});
