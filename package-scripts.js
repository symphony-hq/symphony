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
      ts: "node -r @swc-node/register symphony/server/typescript/describe.ts",
      py: "source venv/bin/activate && python symphony/server/python/describe.py",
    },
    serve: {
      ts: "node -r @swc-node/register symphony/server/typescript/serve.ts",
      py: "source venv/bin/activate && python symphony/server/python/serve.py",
      all: npsUtils.concurrent.nps("serve.ts", "serve.py"),
    },
    watch: "node -r @swc-node/register symphony/server/watch.ts",
    client: "yarn vite --port 3000",
    service: "node -r @swc-node/register symphony/server/service.ts",
    database: "postgrest symphony/database/postgrest.conf",
    start: npsUtils.concurrent.nps(
      "watch",
      "client",
      "service",
      "database",
      "serve.all"
    ),
    lint: "eslint .",
    clean: {
      ts: "rm -rf node_modules",
      py: "rm -rf venv",
      database: "symphony/database/destroy.sh",
      all: npsUtils.concurrent.nps("clean.ts", "clean.py"),
      default: "yarn nps clean.all",
    },
  },
};
