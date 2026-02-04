import { request } from "@playwright/test";

export async function getAuthToken(): Promise<string> {
  const context = await request.newContext({
    baseURL: "https://conduit-api.bondaracademy.com",
  });

  const response = await context.post("/api/users/login", {
    data: {
      user: {
        email: process.env.USER_EMAIL,
        password: process.env.USER_PASSWORD,
      },
    },
  });

  const responseBody = await response.json();
  return responseBody.user.token;
}
