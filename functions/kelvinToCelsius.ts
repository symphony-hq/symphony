/**
 * @property {number} number Number in Kelvin.
 */
interface SymphonyRequest {
  number: number;
}

/**
 * @property {number} temperature Number in Celsius.
 */
interface SymphonyResponse {
  number: number;
}

/**
 * @description Converts Kelvin to Celsius.
 */
export default async function handler(
  request: SymphonyRequest
): Promise<SymphonyResponse> {
  const { number } = request;

  return {
    number: Math.round(number - 273.15),
  };
}
