export default {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/projects/*/slides/*/screenshot": ["./node_modules/playwright-core/**/*"],
  },
};
