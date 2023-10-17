import * as React from "react";

interface Request {
  lat: number;
  lon: number;
}
export function Request({ props }: { props: Request }) {
  return <div className="json">{JSON.stringify(props, null, 2)}</div>;
}

interface Response {
  temperature: number;
  unit: string;
}
export function Response({ props }: { props: Response }) {
  return <div className="json">{JSON.stringify(props, null, 2)}</div>;
}
