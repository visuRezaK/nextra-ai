import { removeBackground } from "@imgly/background-removal-node";
import { readFile, writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, "../public/images/profile-reza.jpeg");
const outputPath = join(__dirname, "../public/images/profile-reza-nobg.png");

console.log("Removing background from", inputPath);
const imageData = await readFile(inputPath);
const blob = new Blob([imageData], { type: "image/jpeg" });

const result = await removeBackground(blob);
const arrayBuffer = await result.arrayBuffer();
await writeFile(outputPath, Buffer.from(arrayBuffer));

console.log("Done! Saved to", outputPath);
