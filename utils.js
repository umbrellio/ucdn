const path = require("path")
const fs = require("fs")
const yaml = require("js-yaml")

const toDashCase = str => str.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`);

const loadYamlFile = filePath => {
  const configPath = path.resolve(filePath)
  const content = fs.readFileSync(configPath)
  return yaml.safeLoad(content)
}

module.exports = {
  toDashCase,
  loadYamlFile,
}
