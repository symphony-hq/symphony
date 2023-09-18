import * as ts from "typescript";
import * as fs from "fs";

const FUNCTIONS_DIRECTORY = "./functions";

interface Metadata {
  name: string;
  description: string;
  parameters: any;
}

function generateMetadata(sourceFile: ts.SourceFile, fileName: string) {
  let metadata: Metadata = {
    name: "",
    description: "",
    parameters: {},
  };

  ts.forEachChild(sourceFile, (node) => {
    const symphonyTypes = ["SymphonyRequest"];

    if (
      ts.isInterfaceDeclaration(node) &&
      symphonyTypes.includes(node.name.text)
    ) {
      metadata.parameters = extractProperties(node);
    }

    if (ts.isFunctionDeclaration(node)) {
      const jsDocComments = ts.getJSDocCommentsAndTags(node);

      let jsDocComment = "";

      for (const comment of jsDocComments) {
        const commentText = comment.getFullText();
        const propertyCommentMatch = new RegExp(`@description (.*)`).exec(
          commentText
        );

        if (propertyCommentMatch && propertyCommentMatch[1]) {
          jsDocComment = propertyCommentMatch[1].trim();
          break;
        }
      }

      metadata.description = jsDocComment;
    }
  });

  metadata.name = fileName.replace(".ts", "");
  return metadata;
}

function extractProperties(node: ts.InterfaceDeclaration) {
  let properties: any = {
    type: "object",
    properties: {},
    required: [],
  };

  const jsDocComments = ts.getJSDocCommentsAndTags(node);

  for (const member of node.members) {
    if (ts.isPropertySignature(member)) {
      const propertyName = member.name.getText();
      const propertyType = member.type!.getText();

      let jsDocComment = "";
      for (const comment of jsDocComments) {
        const commentText = comment.getFullText();
        const propertyCommentMatch = new RegExp(
          `@property {${propertyType}} ${propertyName} (.*)`
        ).exec(commentText);

        if (propertyCommentMatch && propertyCommentMatch[1]) {
          jsDocComment = propertyCommentMatch[1].trim();
          break;
        }
      }

      properties.properties[propertyName] = {
        type: propertyType,
        description: jsDocComment || "",
      };

      if (!member.questionToken) {
        properties.required.push(propertyName);
      }
    }
  }

  return properties;
}

const readFiles = new Promise((resolve, reject) => {
  let metadatas = [] as any;

  fs.readdir(FUNCTIONS_DIRECTORY, (error, files) => {
    if (error) {
      reject(error);
    }

    files.forEach((fileName) => {
      const code = fs.readFileSync(
        `${FUNCTIONS_DIRECTORY}/${fileName}`,
        "utf8"
      );
      const sourceFile = ts.createSourceFile(
        "temp.ts",
        code,
        ts.ScriptTarget.Latest,
        true
      );

      const metadata = generateMetadata(sourceFile, fileName);
      metadatas.push(metadata);
    });

    resolve(metadatas);
  });
});

readFiles
  .then((metadatas) => {
    fs.writeFileSync(
      "./server/descriptions.json",
      JSON.stringify(metadatas, null, 2)
    );
  })
  .catch((error) => console.log(error));
