import React from "react";

interface Response {
  value: number;
}

export default function Component({ props }: { props: Response }) {
  return <pre className="json">{JSON.stringify(props, null, 2)}</pre>;
}
