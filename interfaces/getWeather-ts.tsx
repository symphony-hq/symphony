import * as React from "react";

interface Request {
  lat: number;
  lon: number;
}
export function Request({ props }: { props: Request }) {
  return <pre className="json">{JSON.stringify(props, null, 2)}</pre>;
}

interface Response {
  temperature: number;
  unit: string;
}
export function Response({ props }: { props: Response }) {
  return <pre className="json">{JSON.stringify(props, null, 2)}</pre>;
}
