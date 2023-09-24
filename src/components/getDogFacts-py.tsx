import React from "react";
interface Response {
  facts: any;
}
export default function Component({ props }: { props: Response }) {
  return <pre className="json">{JSON.stringify(props, null, 2)}</pre>;
}
