import axios from "axios";
import React from "react";

/**
 * @property {string} lat Latitude of the city.
 * @property {string} lon Longitude of the city.
 */
interface SymphonyRequest {
  lat: string;
  lon: string;
}

/**
 * @property {string} temperature The temperature of the city.
 * @property {string} unit The unit of the temperature.
 */
interface SymphonyResponse {
  temperature: number;
  unit: string;
}

/**
 * @description Gets temperature of a city.
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
    unit: "Celsius",
  };
}
