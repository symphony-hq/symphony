const npsUtils = require("nps-utils");
const dotenv = require("dotenv");
const config = dotenv.config();

if (config.error) {
  throw config.error;
}

let requiredEnvVariables = ["OPENAI_API_KEY"];
requiredEnvVariables.forEach((variable) => {
  if (!process.env[variable]) {
    console.error(`Missing environment variable: ${variable}`);
    process.exit(1);
  }
});

module.exports = {
  scripts: {
    initialize: {
      py: "virtualenv -p python3 venv && source venv/bin/activate && pip install -r requirements.txt",
      default: "yarn nps initialize.py",
    },
    describe: {
      ts: "nodemon --watch functions --exec yarn ts-node server/typescript/describe.ts",
      py: "nodemon --watch functions --exec python3 server/python/describe.py",
      all: npsUtils.concurrent.nps("describe.ts", "describe.py"),
    },
    service: "ts-node server/service.ts",
    studio: "react-scripts start",
    start: npsUtils.concurrent.nps("describe.all", "service", "studio"),
    clean: {
      ts: "yarn rimraf node_modules",
      py: "yarn rimraf venv",
      all: npsUtils.concurrent.nps("clean.ts", "clean.py"),
      default: "yarn nps clean.all",
    },
  },
};
