const fs = require("fs");
const path = require("path");

function normalizeCalcExpressions(css) {
  let result = "";
  let index = 0;

  while (index < css.length) {
    const calcStart = css.indexOf("calc(", index);

    if (calcStart === -1) {
      result += css.slice(index);
      break;
    }

    result += css.slice(index, calcStart);

    let depth = 0;
    let cursor = calcStart;

    while (cursor < css.length) {
      const char = css[cursor];

      if (char === "(") depth += 1;
      if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          cursor += 1;
          break;
        }
      }

      cursor += 1;
    }

    const expression = css.slice(calcStart + 5, cursor - 1);
    const normalizedExpression = expression.replace(/\s*\+\s*/g, " + ").trim();

    result += `calc(${normalizedExpression})`;
    index = cursor;
  }

  return result;
}

// Простий CSS мінімайзер
function minifyCSS(input) {
  return normalizeCalcExpressions(
    input
      // Видаляємо коментарі
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Видаляємо зайві пробіли
      .replace(/\s+/g, " ")
      .replace(/\s*([{};:,>+~])\s*/g, "$1")
      // Видаляємо пробіли перед {
      .replace(/\{\s*/g, "{")
      .replace(/\}\s*/g, "}")
      .trim(),
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
