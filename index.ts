import express from "express"
import pg from 'pg'
import { randomUUID } from "node:crypto"

const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'test',
  password: 'test',
})

const app = express()

app.use(express.json())

app.post("/pessoas", async (req, res) => {
  try {
    const b = req.body
    if (!b.nome) {
      return res.status(422).send("Nome is required")
    }

    if (!b.apelido) return res.status(422).send("Apelido is required")

    const { apelido, nome, nascimento, stack } = b

    const alreadyExistsUser = await client.query(`
      SELECT * 
      FROM person
      WHERE apelido = '${apelido}' OR nome = '${nome}'
    `)

    if (alreadyExistsUser.rows.length) return res.status(422).end()

    const stackMap = `{${stack.join(', ')}}`;

    const id = randomUUID()
    await client.query(`
      INSERT INTO PERSON (id, apelido, nome, nascimento, stack)
      VALUES ('${id}','${apelido}', '${nome}', '${nascimento}', '${stackMap}')
    `)

    return res.status(200).json({
      statusCode: 200,
      insertion: { id, ...b },

    })
  } catch (error) {
    return res.status(500).json({
      res: error,
    })
  }
})

app.get('/pessoas/:id', async (req, res) => {
  const id = req.params.id

  const person = await client.query(`
    SELECT * FROM person
    WHERE id = '${id}'
  `)

  if (!person.rows.length) return res.status(404).end()
  return res.status(200).json(person.rows[0])
})

app.get('/pessoas', async (req, res) => {
  if (!req.query?.t) return res.status(400).end()
  const term = req.query.t

  const response = await client.query(`
    SELECT 
      apelido,
      nome,
      nascimento,
      stack
    FROM (
      SELECT *, unnest(stack) eachstack
      FROM person) x
    WHERE eachstack ILIKE '%${term}%'
    OR apelido ILIKE '%${term}%'
    OR nome ILIKE '%${term}%'
    LIMIT 50
  `)

  // TODO index

  return res.status(200).json({
    url: 'pessoas',
    message: 'ok',
    query: term,
    payload: response.rows
  })
})

app.get("/contagem-pessoas", (req, res) => {
  return res.status(200).json({
    url: 'contagem-pessoas',
    message: 'not implemented'
  })
})

try {
  app.listen(3333, async () => {
    await client.connect()
    console.log("server running")
  })

} catch (error) {
  console.error(error)
}