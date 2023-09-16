const npsUtils = require("nps-utils");

module.exports = {
  scripts: {
    inspect: "nodemon --watch functions --exec ts-node .symphony/inspect.ts",
    service: "nodemon --watch functions --exec ts-node .symphony/service.ts",
    studio: "react-scripts start",
    dev: npsUtils.concurrent.nps("inspect", "service", "studio"),
  },
};
