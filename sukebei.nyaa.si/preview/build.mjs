import * as esbuild from "esbuild";
// import { userscript } from "esbuild-plugin-userscript";
// import fs from "node:fs"; // Used to read files
import fs from "node:fs/promises"; // Used for async file operations
import { fileURLToPath } from "node:url"; // Used to convert URL to file path
import { dirname } from "node:path"; // Used to extract the directory from a path
import addMetaPlugin from "./add-meta-plugin.mjs"; // Import the custom plugin

// 1. Get the URL of the current module
const currentModuleUrl = import.meta.url;
const currentFilePath = fileURLToPath(currentModuleUrl);
const currentDir = dirname(currentFilePath);

console.log(`Current module URL: ${currentDir}`);
// log currentFilePath
// console.log(`Current file path: ${currentFilePath}`);
console.log(`${currentDir}/script-ts.user.ts`);


await esbuild.build({
  entryPoints: [`${currentDir}/script-ts.user.ts`],
  bundle: true,
  metafile: true,
  write: false,
  platform: "browser",
  outfile: `${currentDir}/dist/script-ts.user.js`,
  plugins: [
    addMetaPlugin(await fs.readFile(`${currentDir}/meta.js`, "utf8")),
  ],
});
console.log("Build completed successfully.");
