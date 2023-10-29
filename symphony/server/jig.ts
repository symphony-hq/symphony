import * as pythonDescriptions from "./python/descriptions.json";
import * as typescriptDescriptions from "./typescript/descriptions.json";
import { pipe } from "fp-ts/lib/function";
import * as RAR from "fp-ts/ReadonlyArray";
import * as fs from "fs";
import { Project } from "ts-morph";
import { Property } from "../utils/types";

const interfaceToProperty = {
  Request: "parameters",
  Response: "returns",
};

const getTypeFromProperty = (property: Property) => {
  const { type } = property;

  if (type === "array") {
    return `${property.items.type}[]`;
  } else {
    return type;
  }
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
        return <div className="json">{JSON.stringify(props, null, 2)}</div>;
      }      
      
      interface Response {}
      export function Response({ props }: { props: Response }) {
        return <div className="json">{JSON.stringify(props, null, 2)}</div>;
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
            const type = getTypeFromProperty(property);

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

const removeInterfaces = () => {
  const interfacesDir = "./interfaces";

  const namesFromDescriptions = [
    ...pythonDescriptions,
    ...typescriptDescriptions,
  ].map(({ name }) => name);

  fs.readdir(interfacesDir, (err, interfaceFiles) => {
    if (err) throw err;

    interfaceFiles.forEach((interfaceFile) => {
      const name = interfaceFile.split(".")[0];
      if (!namesFromDescriptions.includes(name)) {
        console.log(name);
        fs.unlinkSync(`${interfacesDir}/${interfaceFile}`);
      }
    });
  });
};

createInterfaces();
removeInterfaces();
