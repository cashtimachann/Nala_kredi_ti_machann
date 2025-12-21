// Small prestart check to ensure we run under recommended Node versions
const fs = require('fs');
const semver = require('semver');

const required = '>=18 <23'; // recommended range - temporarily allowing Node 22
const current = process.version;

if (!semver.satisfies(semver.coerce(current), required)) {
  console.error(`\nERROR: Unsupported Node.js version ${current}\n`);
  console.error('This project is tested with Node 18.x LTS (or Node 20.x). Please switch to a supported Node version.');
  console.error('\nYou can use nvm to switch Node versions:');
  console.error('  nvm install 18');
  console.error('  nvm use 18');
  console.error('  npm ci');
  process.exit(1);
}

process.exit(0);
