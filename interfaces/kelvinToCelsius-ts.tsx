import * as React from "react";

interface Request {
  value: number;
}
export function Request({ props }: { props: Request }) {
  return <pre className="json">{JSON.stringify(props, null, 2)}</pre>;
}

interface Response {
  value: number;
}
export function Response({ props }: { props: Response }) {
  return <pre className="json">{JSON.stringify(props, null, 2)}</pre>;
}
