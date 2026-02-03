import { test } from "@playwright/test";
import tags from '../test-data/tags.json'

test.use({
  launchOptions: {
    args: [
      "--disable-http-cache",
      "--disable-service-worker",
    ],
  },
});



test("intercept and mock tags API", async ({ page }) => {
  await page.route(
    "*/**/api/tags",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(tags),
      });
    },
  );

  await page.goto("https://conduit.bondaracademy.com/");
});


test("intercept and intercept articles API", async({page})=>{
  await page.route("*/**/api/articles*", async route => {
    const response = await route.fetch();
    const responseBody = await response.json(); // array of objects: each object has slug, title, descr, body and etc.
    
    console.log(responseBody.articles[0])
    responseBody.articles[0].title = "NEW TITLE"
    responseBody.articles[0].description = "THIS IS A DESCROPTION"

    // apply new title and description to the very first atricle at the top
    await route.fulfill({
      body: JSON.stringify(responseBody)
    })
  })

  await page.goto("https://conduit.bondaracademy.com/");
})