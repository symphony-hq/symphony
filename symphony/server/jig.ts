import * as pythonDescriptions from "./python/descriptions.json";
import * as typescriptDescriptions from "./typescript/descriptions.json";
import { pipe } from "fp-ts/lib/function";
import * as RAR from "fp-ts/ReadonlyArray";
import * as fs from "fs";
import { Project } from "ts-morph";

const interfaceToProperty = {
  Request: "parameters",
  Response: "returns",
};

function createInterfaces() {
  pipe(
    [...pythonDescriptions, ...typescriptDescriptions],
    RAR.map((fx) => {
      const { name } = fx;
      const filePath = `./interfaces/${name}.tsx`;

      const source = `import * as React from "react";

      interface Request {}
      export function Request({ props }: { props: Request }) {
        return <pre className="json">{JSON.stringify(props, null, 2)}</pre>;
      }      
      
      interface Response {}
      export function Response({ props }: { props: Response }) {
        return <pre className="json">{JSON.stringify(props, null, 2)}</pre>;
      }               
      `;

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, source, { flag: "w" });
      }

      return fx;
    }),
    RAR.map(async (fx) => {
      const { name } = fx;

      const filePath = `./interfaces/${name}.tsx`;

      const project = new Project();
      const sourceFile = project.addSourceFileAtPath(filePath);

      const interfaceNames = ["Request", "Response"];

      interfaceNames.forEach((interfaceName) => {
        const interfaceNode = sourceFile.getInterface(interfaceName)!;
        const interfaceProperties = interfaceNode.getProperties();

        interfaceProperties.map((property) => {
          property.remove();
        });

        const propertiesFromDescriptions = pipe(
          Object.keys(fx[interfaceToProperty[interfaceName]].properties),
          RAR.map((name) => {
            const property =
              fx[interfaceToProperty[interfaceName]].properties[name];
            const type = property.type;

            return {
              name,
              type,
            };
          })
        );

        propertiesFromDescriptions.map(({ name, type }) => {
          interfaceNode.addProperty({
            name: name,
            type: type,
            hasQuestionToken:
              !fx[interfaceToProperty[interfaceName]].required.includes(name),
          });
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
