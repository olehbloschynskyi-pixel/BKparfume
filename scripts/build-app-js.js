const fs = require("fs");
const path = require("path");
const { minify } = require("terser");

const ROOT_DIR = path.resolve(__dirname, "..");
const INPUT_FILE = path.join(ROOT_DIR, "js", "app-v4.js");
const OUTPUT_FILE = path.join(ROOT_DIR, "js", "app-v4.min.js");

async function main() {
  const source = fs.readFileSync(INPUT_FILE, "utf8");
  const result = await minify(source, {
    compress: true,
    mangle: true,
    format: {
      comments: false,
    },
  });

  if (!result.code) {
    throw new Error("Failed to minify js/app-v4.js");
  }

  fs.writeFileSync(OUTPUT_FILE, `${result.code}\n`);
  console.log(`Built ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
