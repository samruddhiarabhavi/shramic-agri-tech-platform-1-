// Run this with: node test-db.js
// It will show exactly what's happening with your DB connection

require('dotenv').config()

console.log('=== ENV VALUES ===')
console.log('DB_HOST:', process.env.DB_HOST)
console.log('DB_USER:', process.env.DB_USER)
console.log('DB_PASS:', process.env.DB_PASS ? '(set, length: ' + process.env.DB_PASS.length + ')' : '(EMPTY!)')
console.log('DB_NAME:', process.env.DB_NAME)
console.log('=================')

const mysql = require('mysql2/promise')

async function test() {
  try {
    const conn = await mysql.createConnection({
      host:     process.env.DB_HOST     || 'localhost',
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASS     || '',
      database: process.env.DB_NAME     || 'shramic_db',
    })
    console.log('✅ Database connected successfully!')
    const [rows] = await conn.query('SHOW TABLES')
    console.log('Tables in shramic_db:')
    rows.forEach(r => console.log(' -', Object.values(r)[0]))
    await conn.end()
  } catch (err) {
    console.log('❌ Connection failed:', err.message)
    console.log('\nFix: Open backend/.env and make sure DB_PASS is correct')
  }
}

test()