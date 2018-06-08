const p = require('path')
const fs = require('fs-extra')

const test = require('tape')
const mkdirp = require('mkdirp')

const Store = require('..')

const TEST_DIR = p.join(__dirname, 'test-storage')
let idx = 0

test('setup', t => {
  mkdirp(TEST_DIR)
  t.end()
})

test('can create and get info for a core', async t => {
  let s = await create(idx++)
  let core = await s.get()
  let info = await s.info(core.key)
  t.same(core.sparse, info.sparse)
  t.same(core.writable, info.writable)

  await cleanup(s)
  t.end()
})

test('can create and get info for a core, across restarts', async t => {
  let s = await create(idx)
  let core = await s.get()
  await s.close()

  s = await create(idx++)
  let info = await s.info(core.key)
  t.same(core.sparse, info.sparse)
  t.same(core.writable, true)

  await cleanup(s)
  t.end()
})

test('can create and replicate a core', async t => {
  let s1 = await create(idx++)
  let s2 = await create(idx++)

  let core1 = await s1.get({ valueEncoding: 'utf-8' })
  await append(core1, 'hello!')

  let core2 = await s2.get(core1.key, { valueEncoding: 'utf-8' })
  let block = await get(core2, 0)

  // Delay to let the replication propagate.
  setTimeout(async () => {
    t.same(block, 'hello!')
    await cleanup(s1, s2)
    t.end()
  }, 100)
})

test.skip('should not seed if seed is false', t => {
})

test.skip('should stop seeding', t => {
})

test('teardown', t => {
  fs.remove(TEST_DIR)
  t.end()
})

async function cleanup () {
  for (var i = 0; i < arguments.length; i++) {
    let store = arguments[i]
    await store.close()
    await fs.remove(store.dir)
  }
}

async function create (idx) {
  console.log('CREATING WITH IDX:', idx)
  let store = Store(p.join(TEST_DIR, `s${idx}`), { network: { port: 4000 + idx } })
  await store.ready
  return store
}

async function append (core, val) {
  return new Promise((resolve, reject) => {
    core.append(val, err => {
      if (err) return reject(err)
      return resolve()
    })
  })
}

async function get (core, idx) {
  return new Promise((resolve, reject) => {
    core.get(idx, (err, value) => {
      if (err) return reject(err)
      return resolve(value)
    })
  })
}
