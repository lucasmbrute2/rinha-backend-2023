import express from "express"
import pg from 'pg'
import { randomUUID } from "node:crypto"

const client = new pg.Client({
  port: 5432,
  user: 'user',
  password: 'senha',
  host: 'db',
  database: 'postgres'
})

const app = express()

async function connect() {
  try {
    await client.connect()
  } catch (error) {
    setTimeout(() => {
      connect()
      console.info("database error: trying to connect again, err", error)
    }, 3000);
  }
}

app.use(express.json())

app.post("/pessoas", async (req, res) => {
  try {
    const b = req.body
    if (!b.nome || typeof b.nome !== 'string' || b.nome.length > 100) {
      return res.status(422).end()
    }

    if (!b.apelido || typeof b.apelido !== 'string' || b.apelido.length > 32) {
      return res.status(422).end()
    }

    if (b?.stack?.length) {
      const hasUnvalidStack = b.stack.some(s => typeof s !== 'string' || s.length > 32)

      if (hasUnvalidStack) return res.status(422).end()
    }

    const { apelido, nome, nascimento, stack } = b

    const alreadyExistsUser = await client.query(`
      SELECT * 
      FROM person
      WHERE apelido = '${apelido}'
    `)

    if (alreadyExistsUser.rows.length) return res.status(422).end()

    const stackMap = `{${stack.join(', ')}}`;

    const id = randomUUID()
    await client.query(`
      INSERT INTO PERSON (id, apelido, nome, nascimento, stack)
      VALUES ('${id}','${apelido}', '${nome}', '${nascimento}', '${stackMap}')
    `)

    return res.status(201).location(`/pessoas/${id}`).end()
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
  return res.status(200).json(person.rows[0]).end()
})

app.get('/pessoas', async (req, res) => {
  if (!req.query.t) return res.status(400).end()
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

  return res.status(200).json(response.rows).end()
})

app.get("/contagem-pessoas", async (req, res) => {
  const { rows } = await client.query(`
      SELECT count(*)
      FROM person
  `)

  return res.status(200).json(rows[0]).end()
})

try {
  app.listen(8080, async () => {
    connect()
    console.log("server running")
  })
} catch (error) {
  console.error(error)
}