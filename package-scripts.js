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
    describe: "nodemon --watch functions --exec ts-node server/describe.ts",
    service: "ts-node server/service.ts",
    studio: "react-scripts start",
    start: npsUtils.concurrent.nps("describe", "service", "studio"),
    clean: "yarn rimraf node_modules",
  },
};
