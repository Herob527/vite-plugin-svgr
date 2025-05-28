import type { Config } from "@svgr/core";
import fs from "fs";
import { createFilter, type FilterPattern, type Plugin } from "vite";

export interface VitePluginSvgrOptions {
  svgrOptions?: Config;
  sourceMaps?: boolean;
  exclude?: FilterPattern;
  include?: FilterPattern;
}

export default function vitePluginSvgr({
  svgrOptions,
  sourceMaps = false,
  include = "**/*.svg?react",
  exclude,
}: VitePluginSvgrOptions = {}): Plugin {
  const filter = createFilter(include, exclude);
  const postfixRE = /[?#].*$/s;

  return {
    name: "vite-plugin-svgr",
    enforce: "pre", // to override `vite:asset`'s behavior
    async load(id) {
      if (filter(id)) {
        const { transform } = await import("@svgr/core");
        const { default: jsx } = await import("@svgr/plugin-jsx");
        const { transform: swcTransform } = await import('@swc/core')

        const filePath = id.replace(postfixRE, "");
        const svgCode = await fs.promises.readFile(filePath, "utf8");

        const componentCode = await transform(svgCode, svgrOptions, {
          filePath,
          caller: {
            defaultPlugins: [jsx],
          },
        });

        const swcRes = await swcTransform(componentCode, {
          filename: id,
          sourceMaps,
          jsc: {
            parser: {
              syntax: 'ecmascript',
              jsx: true
            }
          }
        })

        return {
          code: swcRes.code,
          map: swcRes.map
        };
      }
    },
  };
}
