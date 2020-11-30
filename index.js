import { App } from '@tinyhttp/app'
import handler from 'serve-handler'

import path from 'path'

const app = new App()

app.get('/', (req, res) => {
  res.sendFile(path.resolve('public/index.html'), {}, (err) => {
    if (err) console.error(err)
  })
}).get('/about', (req, res) => {
  res.sendFile(path.resolve('public/about.html'), {}, (err) => {
    if (err) console.error(err)
  })
}).get('/login', (req, res) => {
  res.sendFile(path.resolve('public/login.html'), {}, (err) => {
    if (err) console.error(err)
  })
}).get('/editor', (req, res) => {
  res.sendFile(path.resolve('public/editor.html'), {}, (err) => {
    if (err) console.error(err)
  })
}).get('/status', (req, res) => {
  res.sendFile(path.resolve('public/status.html'), {}, (err) => {
    if (err) console.error(err)
  })
}).get('/viewCsv', (req, res) => {
  res.sendFile(path.resolve('public/viewCsv.html'), {}, (err) => {
    if (err) console.error(err)
  })
}).get('/visualizeTables', (req, res) => {
  res.sendFile(path.resolve('public/visualizeTables.html'), {}, (err) => {
    if (err) console.error(err)
  })
}).get('/ontologyMapping', (req, res) => {
  res.sendFile(path.resolve('public/ontologyMapping.html'), {}, (err) => {
    if (err) console.error(err)
  })
}).use(
  // Static files handler
    async (req, res) =>
      await handler(req, res, {
        public: "public",
        cleanUrls: true,
        directoryListing: false
      })
).listen(3000, () => console.log(`Started on http://localhost:3000`))