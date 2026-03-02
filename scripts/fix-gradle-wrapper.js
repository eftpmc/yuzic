const fs = require("fs");
const path = require("path");

const WRAPPER_PATH = path.join(
  __dirname,
  "../android/gradle/wrapper/gradle-wrapper.properties"
);

async function run() {
  if (!fs.existsSync(WRAPPER_PATH)) {
    console.log("Gradle wrapper not found, skipping SHA fix.");
    return;
  }

  let content = fs.readFileSync(WRAPPER_PATH, "utf8");

  const urlMatch = content.match(/distributionUrl=(.*)/);
  if (!urlMatch) {
    console.log("No distributionUrl found.");
    return;
  }

  const distributionUrl = urlMatch[1].replace(/\\/g, "");
  const fileName = distributionUrl.split("/").pop();

  console.log("Detected Gradle distribution:", fileName);

  const checksumPage = await fetch("https://gradle.org/release-checksums/");
  const html = await checksumPage.text();

  const regex = new RegExp(`${fileName}[\\s\\S]*?SHA-256:\\s*([a-f0-9]{64})`, "i");
  const match = html.match(regex);

  if (!match) {
    console.error("Could not find checksum for", fileName);
    process.exit(1);
  }

  const sha = match[1];
  console.log("Official SHA256:", sha);

  if (content.includes("distributionSha256Sum=")) {
    content = content.replace(
      /distributionSha256Sum=.*/,
      `distributionSha256Sum=${sha}`
    );
  } else {
    content += `\ndistributionSha256Sum=${sha}\n`;
  }

  fs.writeFileSync(WRAPPER_PATH, content);
  console.log("Gradle wrapper SHA updated successfully.");
}

run();