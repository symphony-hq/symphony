import * as chokidar from "chokidar";
import { ChildProcess, exec } from "child_process";

let process: ChildProcess;

const generatePythonDescriptions = () => {
  if (process) process.kill();
  process = exec("yarn nps describe.py");
};

const pythonWatcher = chokidar.watch("./functions/*.py");

pythonWatcher
  .on("ready", generatePythonDescriptions)
  .on("add", generatePythonDescriptions)
  .on("change", generatePythonDescriptions)
  .on("unlink", generatePythonDescriptions);

const generateTypescriptDescriptions = () => {
  if (process) process.kill();
  process = exec("yarn nps describe.ts");
};

const typescriptWatcher = chokidar.watch("./functions/*.ts");

typescriptWatcher
  .on("ready", generateTypescriptDescriptions)
  .on("add", generateTypescriptDescriptions)
  .on("change", generateTypescriptDescriptions)
  .on("unlink", generateTypescriptDescriptions);

const generateInterfaces = () => {
  if (process) process.kill();
  process = exec("node -r @swc-node/register symphony/server/jig.ts");
};

const descriptionsWatcher = chokidar.watch(
  "./symphony/server/*/descriptions.json"
);

descriptionsWatcher
  .on("ready", generateInterfaces)
  .on("add", generateInterfaces)
  .on("change", generateInterfaces)
  .on("unlink", generateInterfaces);
