import { pipe } from "fp-ts/lib/function";
import * as RAR from "fp-ts/ReadonlyArray";
import * as fs from "fs";
import { Project } from "ts-morph";
import { Descriptions, Property } from "../utils/types";

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

function createInterfaces({ descriptions }: { descriptions: Descriptions[] }) {
  pipe(
    descriptions,
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

const removeInterfaces = ({
  descriptions,
}: {
  descriptions: Descriptions[];
}) => {
  const interfacesDir = "./interfaces";

  const namesFromDescriptions = descriptions.map(({ name }) => name);

  fs.readdir(interfacesDir, (err, interfaceFiles) => {
    if (err) throw err;

    interfaceFiles.forEach((interfaceFile) => {
      const name = interfaceFile.split(".")[0];
      if (!namesFromDescriptions.includes(name)) {
        fs.unlinkSync(`${interfacesDir}/${interfaceFile}`);
      }
    });
  });
};

const refreshInterfaces = () => {
  let descriptions = [];

  try {
    const pythonFunctions = JSON.parse(
      fs.readFileSync("./symphony/server/python/descriptions.json", "utf8")
    );

    const typescriptFunctions = JSON.parse(
      fs.readFileSync("./symphony/server/typescript/descriptions.json", "utf8")
    );

    descriptions = [...pythonFunctions, ...typescriptFunctions];
  } catch (error) {
    // TODO: Handle error
  }

  removeInterfaces({ descriptions });
  createInterfaces({ descriptions });
};

refreshInterfaces();
