import { APIRequestContext, request } from "@playwright/test";

export async function getAuthToken(
  request: APIRequestContext,
): Promise<string> {
  const response = await request.post(
    `${process.env.BASE_API_URL}/api/users/login`,
    {
      data: {
        user: {
          email: process.env.USER_EMAIL,
          password: process.env.USER_PASSWORD,
        },
      },
    },
  );

  const responseBody = await response.json();
  return responseBody.user.token;
}
