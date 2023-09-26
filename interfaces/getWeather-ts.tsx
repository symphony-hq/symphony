import * as React from "react";

interface Response {
  temperature: number;
  unit: string;
}

export default function Component({ props }: { props: Response }) {
  return <pre className="json">{JSON.stringify(props, null, 2)}</pre>;
}
