const fs = require("fs")
const path = require("path")
const mime = require("mime-types")
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const configDefaults = {
  region: null,
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

const uploadFile = (s3, config, file, key) => new Promise((resolve, reject) => {
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
  s3.send(new PutObjectCommand(params))
    .then(data => resolve(data), err => reject(err))
    .finally(() => stream.close())
})

const upload = argv => {
  const config = getConfig(argv)
  const { region, accessKeyId, secretAccessKey, dir, exclude } = config

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: accessKeyId || "unknown",
      secretAccessKey: secretAccessKey || "unknown",
    }
  })

  const directory = path.resolve(dir)
  const files = findFiles(directory).filter(x => {
    const ext = path.extname(x).slice(1)
    return !exclude.includes(ext)
  })

  const promises = files.map(file => {
    const key = getKey(file, directory)
    return uploadFile(s3, config, file, key)
      .then(() => console.log("Uploaded", file))
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
