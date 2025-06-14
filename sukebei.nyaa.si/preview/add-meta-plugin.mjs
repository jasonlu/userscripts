// my-plugin.js
import fs from 'node:fs/promises'; // Use fs/promises for async file operations
import path from 'node:path';

/**
 * An esbuild plugin that prepends text to the top of the output bundle(s).
 * @param {string} text The text to prepend.
 * @returns {import('esbuild').Plugin}
 */
const prependTextPlugin = (text) => ({
  name: 'prepend-text-plugin', // Unique name for your plugin
  setup(build) {
    // Register a callback to run after the build is complete
    build.onEnd(async (result) => {
      if (result.errors.length > 0) {
        console.error('Build failed, not prepending text.');
        return;
      }

      console.log('[prepend-text-plugin] Build completed successfully. Prepending text...');

      // Iterate over each output file
      for (const outputFile of result.outputFiles || []) {
        // outputFiles are only present if 'write' is false,
        // otherwise esbuild writes directly to disk.
        // We'll handle both scenarios.

        // Determine the output path based on 'write' option
        const outputPath = outputFile.path;//path.join(build.initialOptions.outdir || 'dist', path.basename(outputFile.path));
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        let fileContent;
        if (build.initialOptions.write === false) {
          // If 'write' is false, content is in outputFile.contents
          fileContent = new TextDecoder().decode(outputFile.contents);
        } else {
          // If 'write' is true (default), read from disk
          try {
            fileContent = await fs.readFile(outputPath, 'utf8');
          } catch (error) {
            console.error(`[prepend-text-plugin] Error reading file ${outputPath}:`, error);
            continue; // Skip to next file
          }
        }

        const newContent = text + '\n' + fileContent;

        try {
          await fs.writeFile(outputPath, newContent);
          console.log(`[prepend-text-plugin] Prepended text to ${outputPath}`);
        } catch (error) {
          console.error(`[prepend-text-plugin] Error writing to file ${outputPath}:`, error);
        }
      }
    });
  },
});

export default prependTextPlugin;