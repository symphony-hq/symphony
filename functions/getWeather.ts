import axios from "axios";

/**
 * lat: Latitude of the city
 * lon: Longitude of the city
 */
interface SymphonyRequest {
  lat: number;
  lon: number;
}

/**
 * temperature: The temperature of the city
 * unit: The unit of the temperature
 */
interface SymphonyResponse {
  temperature: number;
  unit: string;
}

/**
 * Gets temperature of a city
 */
export default async function handler(
  request: SymphonyRequest
): Promise<SymphonyResponse> {
  const { lat, lon } = request;

  const result = await axios
    .get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=bab3aa11dfaea12cda0525211c1cf3a5`
    )
    .then((response) => {
      return response.data;
    });

  return {
    temperature: result.main.temp,
    unit: "Kelvin",
  };
}
