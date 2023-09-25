import * as pythonDescriptions from "./python/descriptions.json";
import * as typescriptDescriptions from "./typescript/descriptions.json";
import { pipe } from "fp-ts/lib/function";
import * as RAR from "fp-ts/ReadonlyArray";
import * as O from "fp-ts/Option";
import * as ts from "typescript";
import * as prettier from "prettier";
import * as fs from "fs";

function createComponents() {
  pipe(
    [...pythonDescriptions, ...typescriptDescriptions],
    RAR.map((fx) => {
      const { name } = fx;
      const filePath = `./interfaces/${name}.tsx`;

      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "", { flag: "w" });
      }

      return fx;
    }),
    RAR.map(async (fx) => {
      const { name, returns } = fx;
      const filePath = `./interfaces/${name}.tsx`;

      const sourceFile = ts.createSourceFile(
        "temp.ts",
        fs.readFileSync(filePath, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const properties = pipe(
        Object.keys(returns.properties),
        RAR.map((key) => {
          const property = returns.properties[key];
          const type = property.type;

          const typeNode = ts.factory.createKeywordTypeNode(
            type === "string"
              ? ts.SyntaxKind.StringKeyword
              : type === "number"
              ? ts.SyntaxKind.NumberKeyword
              : type === "boolean"
              ? ts.SyntaxKind.BooleanKeyword
              : ts.SyntaxKind.AnyKeyword
          );

          return ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(key),
            undefined,
            typeNode
          );
        })
      );

      const newInterface = ts.factory.createInterfaceDeclaration(
        undefined,
        "Response",
        undefined,
        undefined,
        properties
      );

      const updatedStatements = pipe(
        [...sourceFile.statements],
        RAR.findIndex(
          (node: ts.Node) =>
            ts.isInterfaceDeclaration(node) && node.name.text === "Response"
        ),
        O.map((index) =>
          pipe(
            sourceFile.statements,
            RAR.chainWithIndex((statementIndex, statement) =>
              index === statementIndex ? [newInterface] : [statement]
            )
          )
        ),
        O.getOrElse(() => sourceFile.statements)
      );

      const responseInterface = pipe(
        sourceFile.statements,
        RAR.findFirst(
          (node: ts.Node) =>
            ts.isInterfaceDeclaration(node) && node.name.text === "Response"
        )
      );

      if (O.isSome(responseInterface)) {
        const sourceFile = ts.createSourceFile(
          "temp.ts",
          fs.readFileSync(filePath, "utf8"),
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX
        );

        const updatedSourceFile = ts.factory.updateSourceFile(
          sourceFile,
          updatedStatements
        );

        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

        const updatedSource = printer.printFile(updatedSourceFile);

        await prettier
          .format(updatedSource, {
            parser: "typescript",
            printWidth: 200,
          })
          .then((formattedUpdatedSource) => {
            fs.writeFileSync(filePath, formattedUpdatedSource);
          });
      } else {
        const interfaceDeclaration = ts.factory.createInterfaceDeclaration(
          undefined,
          "Response",
          undefined,
          undefined,
          properties
        );

        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

        const interfaceString = printer.printNode(
          ts.EmitHint.Unspecified,
          interfaceDeclaration,
          sourceFile
        );

        const source = `
        import React from "react";

        ${interfaceString}
        
        export default function Component({ props }: { props: Response }) {
          return <pre className="json">{JSON.stringify(props, null, 2)}</pre>;
        }               
        `;

        await prettier
          .format(source, {
            parser: "typescript",
          })
          .then((formattedUpdatedSource) => {
            fs.writeFileSync(filePath, formattedUpdatedSource);
          });
      }
      return fx;
    })
  );
}

createComponents();
