const DOMAIN_IMPLEMENTATION_PACKAGE =
  "(?:(?:next|react|react-dom|@tiptap/react|sharp|yauzl-promise|yazl)(?:/|$)|@prisma(?:/|$)|prisma(?:/|$))";
const RESOLVED_DOMAIN_IMPLEMENTATION =
  `(?:${DOMAIN_IMPLEMENTATION_PACKAGE}|(?:\\.\\./)*node_modules/${DOMAIN_IMPLEMENTATION_PACKAGE}|(?:\\.\\./)*node_modules/\\.pnpm/[^/]+/node_modules/${DOMAIN_IMPLEMENTATION_PACKAGE})`;

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
        path: `^(?:(?:node:)?(?:fs|http|https)(?:/|$)|${RESOLVED_DOMAIN_IMPLEMENTATION}|src/(?:(?:infrastructure|adapters)(?:/|$)|modules/[^/]+/(?:infrastructure|adapters)(?:/|$)))`,
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
