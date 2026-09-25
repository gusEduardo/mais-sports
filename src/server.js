import app from './app.js'

const port = process.env.PORT || 3000

app.listen(port, () => {
    console.log(`+Sports: http://localhost:${port}`)
    console.log(`Teste um evento: http://localhost:${port}/evento/1`)
})
