/**
 * value: Value in Kelvin
 */
interface SymphonyRequest {
  value: number;
}

/**
 * value: Value in Celsius
 */
interface SymphonyResponse {
  value: number;
}

/**
 * Converts Kelvin to Celsius
 */
export default async function handler(
  request: SymphonyRequest
): Promise<SymphonyResponse> {
  const { value } = request;

  return {
    value: Math.round(value - 273.15),
  };
}
