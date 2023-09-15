/**
 * @property {string} email The email of the person to search.
 */
interface SymphonyRequest {
  email: string;
}

/**
 * @property {string} email The email of the person to search.
 * @property {string} name The name of the person.
 * @property {number} age The age of the person.
 * @property {string} dateOfBirth Date in ISO-8601 format.
 */
interface SymphonyResponse {
  email: string;
  name: string;
  age: number;
  dateOfBirth: string;
}

/**
 * @description Lists search results for a person.
 */
export default function handler(request: SymphonyRequest): SymphonyResponse {
  const { email } = request;

  return {
    email,
    name: "Jeremy Philemon",
    age: 25,
    dateOfBirth: "1995-01-01",
  };
}
