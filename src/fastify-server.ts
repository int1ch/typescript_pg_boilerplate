import buildApp from "./fastify-app";

const server = buildApp({
  logger: {
    level: "info",
    prettyPrint: true,
  },
});

// Run the server!
const start = async () => {
  try {
    await server.listen(5000);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

export default start;
