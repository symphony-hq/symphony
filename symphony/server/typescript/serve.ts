import { FastifyInstance, fastify } from "fastify";
import * as fs from "fs";
import * as chokidar from "chokidar";

let fastifyInstance: FastifyInstance;

const startServer = async () => {
  fastifyInstance = fastify({
    logger: false,
  });

  const handlerFiles = fs
    .readdirSync("./functions")
    .filter((file) => file.endsWith(".ts"));

  handlerFiles.forEach(async (file) => {
    try {
      const modulePath = require.resolve(`../../../functions/${file}`);
      delete require.cache[modulePath];

      const { handler } = await import(modulePath);
      const routePath = `/${file.slice(0, -3)}`;

      fastifyInstance.post(routePath, async (request, reply) => {
        const payload = request.body;
        return handler(payload, reply);
      });
    } catch (error) {
      console.error(error);
    }
  });

  try {
    await fastifyInstance.listen({ port: 3003 });
  } catch (err) {
    fastifyInstance.log.error(err);
    process.exit(1);
  }
};

const watcher = chokidar.watch("./functions/*.ts", {
  persistent: true,
});

const restartServer = async () => {
  if (fastifyInstance) {
    await fastifyInstance.close();
  }

  await startServer();
};

watcher
  .on("ready", () => {
    startServer().catch(console.error);
  })
  .on("change", () => {
    restartServer().catch(console.error);
  })
  .on("unlink", () => {
    restartServer().catch(console.error);
  });
