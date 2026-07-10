/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      from: { path: "^src" },
      to: { circular: true },
    },
    {
      name: "no-cross-feature-internals",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/(?!$1(?:/|$))",
        pathNot: "^src/modules/[^/]+/public\\.ts$",
      },
    },
    {
      name: "domain-stays-pure",
      severity: "error",
      from: { path: "^src/modules/[^/]+/domain/" },
      to: {
        path: "^(?:(?:node:)?fs(?:/|$)|next(?:/|$)|react(?:/|$)|@prisma(?:/|$)|prisma(?:/|$)|node_modules/(?:(?:next|react)(?:/|$)|@prisma(?:/|$)|prisma(?:/|$))|node_modules/\\.pnpm/[^/]+/node_modules/(?:(?:next|react)(?:/|$)|@prisma(?:/|$)|prisma(?:/|$))|src/modules/[^/]+/(?:infrastructure|adapters)(?:/|$))",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
    },
  },
};
