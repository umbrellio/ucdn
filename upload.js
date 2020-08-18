const fs = require("fs")
const path = require("path")
const mime = require("mime-types")
const AWS = require("aws-sdk")

const s3 = new AWS.S3()
const configDefaults = {
  dir: null,
  bucket: null,
  exclude: [],
  accessKeyId: null,
  secretAccessKey: null,
}

const getConfig = passedConfig => {
  const receivedConfig = passedConfig || {}
  return { ...configDefaults, ...receivedConfig }
}

const findFiles = directory => {
  const files = fs.readdirSync(directory, { withFileTypes: true })
  return files.reduce((mem, file) => {
    const filepath = path.join(directory, file.name)
    return file.isDirectory()
      ? [...mem, ...findFiles(filepath) ]
      : [...mem, filepath]
  }, [])
}

const getKey = (file, root) => path.relative(root, file)

const uploadFile = (config, file, key) => new Promise((resolve, reject) => {
  const { bucket } = config
  const stream = fs.createReadStream(file)
  const basename = path.basename(file)
  const params = {
    Bucket: bucket,
    Body: stream,
    Key: key,
    ContentType: mime.contentType(basename),
  }

  stream.on("error", reject)
  s3.upload(params, (err, data) => {
    stream.close()
    if (err) reject(err)
    else resolve(data)
  })
})

const upload = argv => {
  const config = getConfig(argv)
  const { accessKeyId, secretAccessKey, dir, exclude } = config

  AWS.config.update({
    accessKeyId: accessKeyId || "unknown",
    secretAccessKey: secretAccessKey || "unknown",
  })

  const directory = path.resolve(dir)
  const files = findFiles(directory).filter(x => {
    const ext = path.extname(x).slice(1)
    return !exclude.includes(ext)
  })

  const promises = files.map(file => {
    const key = getKey(file, directory)
    return uploadFile(config, file, key)
      .then(data => console.log("Uploaded", data.Location))
  })

  return Promise.all(promises)
    .then(() => {
      console.log("Completed")
      process.exit(0)
    })
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = upload
