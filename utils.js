const path = require("path")
const fs = require("fs")
const yaml = require("js-yaml")

const loadYamlFile = filePath => {
  const configPath = path.resolve(filePath)
  const content = fs.readFileSync(configPath)
  return yaml.load(content)
}

module.exports = {
  loadYamlFile,
}
