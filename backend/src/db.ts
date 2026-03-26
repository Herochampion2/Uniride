
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { Ride } from './models/Ride.js'
import { Route } from './models/Route.js'
import { User } from './models/User.js'

type Schema = {
  rides: Ride[],
  routes: Route[],
  users: User[]
}

const defaultData: Schema = { rides: [], routes: [], users: [] }

const adapter = new JSONFile<Schema>('db.json')
const db = new Low(adapter, defaultData)

await db.read()

db.data ||= defaultData

if (!db.data.users.length) {
    db.data.users.push(
        {
          id: '1',
          name: 'Alice',
          email: 'alice@example.com',
          university: 'University of Example',
          phone: '123-456-7890',
          schedule: ['Monday 9am-5pm', 'Wednesday 9am-5pm', 'Friday 9am-5pm'],
        },
        {
          id: '2',
          name: 'Bob',
          email: 'bob@example.com',
          university: 'University of Example',
          phone: '098-765-4321',
          schedule: ['Monday 8am-4pm', 'Tuesday 8am-4pm', 'Thursday 8am-4pm'],
        },
    )
    await db.write()
}

export default db
