const fs = require("fs")
const path = require("path")
const mime = require("mime-types")
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")

const configDefaults = {
  region: null,
  dir: null,
  bucket: null,
  exclude: [],
  accessKeyId: null,
  secretAccessKey: null,
  targetDir: null,
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

const getKey = (file, root, targetDir) => {
  const filepath = path.relative(root, file)
  return path.join(targetDir, filepath)
}

const uploadFile = (s3, config, file, key) => {
  return fs.promises.readFile(file).then(data => {
    const { bucket } = config
    const basename = path.basename(file)
    const contentType = mime.contentType(basename)
    const params = { Bucket: bucket, Body: data, Key: key, ContentType: contentType }
    return s3.send(new PutObjectCommand(params))
  })
}

const upload = argv => {
  const config = getConfig(argv)
  const { region, accessKeyId, secretAccessKey, dir, exclude, targetDir } = config

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: accessKeyId || "unknown",
      secretAccessKey: secretAccessKey || "unknown",
    },
  })

  const directory = path.resolve(dir)
  const files = findFiles(directory).filter(x => {
    const ext = path.extname(x).slice(1)
    return !exclude.includes(ext)
  })

  const promises = files.map(file => {
    const key = getKey(file, directory, targetDir)
    return uploadFile(s3, config, file, key)
      .then(() => console.log("Uploaded", file))
  })

  return Promise.all(promises)
    .then(() => {
      console.log("Completed")
      return process.exit(0)
    })
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = upload
