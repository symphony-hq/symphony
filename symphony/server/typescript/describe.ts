import * as ts from "typescript";
import * as fs from "fs";

const FUNCTIONS_DIRECTORY = "./functions";

interface Properties {
  [key: string]: {
    type: string;
    description?: string;
    items?: {
      type: string;
    };
  };
}

interface Parameters {
  type: string;
  properties: Properties;
  required: string[];
}

type Returns = Parameters;

interface Schema {
  name: string;
  description: string;
  parameters: Parameters;
  returns: Returns;
}

function getSchema(propertyType) {
  if (propertyType === "string") {
    return { type: "string" };
  } else if (propertyType === "number") {
    return { type: "number" };
  } else if (propertyType === "boolean") {
    return { type: "boolean" };
  } else if (propertyType.includes("[]")) {
    return { type: "array", items: { type: propertyType.replace("[]", "") } };
  }
}

function extractParameters(node: ts.InterfaceDeclaration) {
  const parameters: Parameters = {
    type: "object",
    properties: {},
    required: [],
  };

  const jsDocComments = ts.getJSDocCommentsAndTags(node);

  for (const member of node.members) {
    if (ts.isPropertySignature(member)) {
      const name = member.name.getText();
      const type = member.type.getText();

      parameters.properties[name] = getSchema(type);

      if (!member.questionToken) {
        parameters.required.push(name);
      }

      for (const comment of jsDocComments) {
        const commentText = comment.getFullText();
        const propertyCommentMatch = new RegExp(`${name}: (.*)`).exec(
          commentText
        );

        if (propertyCommentMatch && propertyCommentMatch[1]) {
          parameters.properties[name]["description"] =
            propertyCommentMatch[1].trim();
        }
      }
    }
  }

  return parameters;
}

function generateSchema(sourceFile: ts.SourceFile, fileName: string) {
  const schema: Schema = {
    name: "",
    description: "",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    returns: {
      type: "object",
      properties: {},
      required: [],
    },
  };

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isInterfaceDeclaration(node)) {
      if (node.name.text === "SymphonyRequest") {
        schema.parameters = extractParameters(node);
      } else if (node.name.text === "SymphonyResponse") {
        schema.returns = extractParameters(node);
      }
    }

    if (ts.isFunctionDeclaration(node)) {
      const jsDocComments = ts.getJSDocCommentsAndTags(node);

      for (const comment of jsDocComments) {
        const commentText = comment.getFullText();
        const propertyCommentMatch = new RegExp(/\* (.*)/).exec(commentText);

        if (propertyCommentMatch && propertyCommentMatch[1]) {
          schema.description = propertyCommentMatch[1].trim();
        }
      }
    }
  });

  schema.name = fileName.replace(".", "-");
  return schema;
}

const readFiles = new Promise((resolve, reject) => {
  const schemas = [] as Schema[];

  fs.readdir(FUNCTIONS_DIRECTORY, (error, files) => {
    if (error) {
      reject(error);
    }

    files
      .filter((fileName) => fileName.endsWith(".ts"))
      .forEach((fileName) => {
        const content = fs.readFileSync(
          `${FUNCTIONS_DIRECTORY}/${fileName}`,
          "utf8"
        );

        const sourceFile = ts.createSourceFile(
          "temp.ts",
          content,
          ts.ScriptTarget.Latest,
          true
        );

        const schema = generateSchema(sourceFile, fileName);
        schemas.push(schema);
      });

    resolve(schemas);
  });
});

readFiles
  .then((metadatas) => {
    fs.writeFileSync(
      "./symphony/server/typescript/descriptions.json",
      JSON.stringify(metadatas, null, 2)
    );
  })
  .catch((error) => console.log(error));
