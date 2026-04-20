const fs = require("fs");
const path = require("path");

// Простий CSS мінімайзер
function minifyCSS(input) {
  return (
    input
      // Видаляємо коментарі
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Видаляємо зайві пробіли
      .replace(/\s+/g, " ")
      .replace(/\s*([{};:,>+~])\s*/g, "$1")
      // Видаляємо пробіли перед {
      .replace(/\{\s*/g, "{")
      .replace(/\}\s*/g, "}")
      .trim()
  );
}

const inputFile = path.join(__dirname, "css", "style.css");
const outputFile = path.join(__dirname, "css", "style.min.css");

const css = fs.readFileSync(inputFile, "utf8");
const minified = minifyCSS(css);

fs.writeFileSync(outputFile, minified, "utf8");

const originalSize = Buffer.byteLength(css);
const minifiedSize = Buffer.byteLength(minified);
const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(2);

console.log(`✅ CSS мінімізовано:`);
console.log(`   Оригінальний розмір: ${(originalSize / 1024).toFixed(2)} KB`);
console.log(`   Мінімізований розмір: ${(minifiedSize / 1024).toFixed(2)} KB`);
console.log(`   Заощаджено: ${savings}%`);
