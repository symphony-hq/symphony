import * as React from "react";

interface Request {
  name: string;
}
export function Request({ props }: { props: Request }) {
  return <div className="json">{JSON.stringify(props, null, 2)}</div>;
}

interface Response {
  greeting: string;
}
export function Response({ props }: { props: Response }) {
  return <div className="json">{JSON.stringify(props, null, 2)}</div>;
}
