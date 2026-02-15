const fs = require('fs');
const path = require('path');

const file = path.join(
  __dirname,
  '../android/gradle/wrapper/gradle-wrapper.properties'
);

let content = fs.readFileSync(file, 'utf8');

if (!content.includes('distributionSha256Sum')) {
  content += '\ndistributionSha256Sum=ED1A8D686605FD7C23BDF62C7FC7ADD1C5B23B2BBC3721E661934EF4A4911D7C\n';
  fs.writeFileSync(file, content);
  console.log('Added distributionSha256Sum');
} else {
  console.log('distributionSha256Sum already present');
}