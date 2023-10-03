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
      database: "symphony/database/setup.sh",
      default: npsUtils.concurrent.nps("initialize.py", "initialize.database"),
    },
    describe: {
      ts: "nodemon --watch functions -e ts --exec yarn ts-node symphony/server/typescript/describe.ts",
      py: "nodemon --watch functions -e py --exec venv/bin/python3 symphony/server/python/describe.py",
      all: npsUtils.concurrent.nps("describe.ts", "describe.py"),
    },
    jig: "nodemon --watch symphony/server -e json --exec yarn ts-node symphony/server/jig.ts",
    service: "ts-node symphony/server/service.ts",
    client: "yarn vite --port 3000",
    database: "postgrest symphony/database/postgrest.conf",
    start: npsUtils.concurrent.nps(
      "describe.all",
      "service",
      "client",
      "jig",
      "database"
    ),
    lint: "eslint .",
    clean: {
      ts: "rm -rf node_modules",
      py: "rm -rf venv",
      database: "symphony/database/destroy.sh",
      all: npsUtils.concurrent.nps("clean.ts", "clean.py",),
      default: "yarn nps clean.all",
    },
  },
};
