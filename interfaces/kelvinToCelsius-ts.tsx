import * as React from "react";

interface Request {
  value: number;
}
export function Request({ props }: { props: Request }) {
  return <div className="json">{JSON.stringify(props, null, 2)}</div>;
}

interface Response {
  value: number;
}
export function Response({ props }: { props: Response }) {
  return <div className="json">{JSON.stringify(props, null, 2)}</div>;
}
