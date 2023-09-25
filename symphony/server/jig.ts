import * as pythonDescriptions from "./python/descriptions.json";
import * as typescriptDescriptions from "./typescript/descriptions.json";
import { pipe } from "fp-ts/lib/function";
import * as RAR from "fp-ts/ReadonlyArray";
import * as fs from "fs";
import { Project } from "ts-morph";

function createInterfaces() {
  pipe(
    [...pythonDescriptions, ...typescriptDescriptions],
    RAR.map((fx) => {
      const { name } = fx;
      const filePath = `./interfaces/${name}.tsx`;

      const source = `import React from "react";

      interface Response {}
      
      export default function Component({ props }: { props: Response }) {
        return <pre className="json">{JSON.stringify(props, null, 2)}</pre>;
      }               
      `;

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, source, { flag: "w" });
      }

      return fx;
    }),
    RAR.map(async (fx) => {
      const { name, returns } = fx;

      const filePath = `./interfaces/${name}.tsx`;

      const propertiesFromDescriptions = pipe(
        Object.keys(returns.properties),
        RAR.map((name) => {
          const property = returns.properties[name];
          const type = property.type;

          return {
            name,
            type,
          };
        })
      );

      const project = new Project();
      const sourceFile = project.addSourceFileAtPath(filePath);
      const responseInterface = sourceFile.getInterface("Response")!;
      const responseProperties = responseInterface.getProperties();

      responseProperties.map((property) => {
        property.remove();
      });

      propertiesFromDescriptions.map(({ name, type }) => {
        responseInterface.addProperty({
          name: name,
          type: type,
          hasQuestionToken: !returns.required.includes(name),
        });
      });

      sourceFile.formatText({
        indentSize: 2,
      });

      await sourceFile.save();

      return fx;
    })
  );
}

createInterfaces();
