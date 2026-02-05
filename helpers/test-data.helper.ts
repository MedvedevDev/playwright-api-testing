import { fakerDE as faker } from "@faker-js/faker";

export function generateTestData(data: string): string {
  switch (data.toLowerCase()) {
    case "description":
      return faker.lorem.sentence(5);

    case "body":
      return faker.lorem.paragraph(10);

    case "title":
      return faker.lorem.sentence(3);

    default:
      throw new Error(`Unknown test data type: ${data}`);
  }
}
