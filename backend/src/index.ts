import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import users from './routes/users.js';
import rides from './routes/rides.js';
import routes from './routes/routes.js';
import routing from './routes/routing.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/users', users);
app.use('/api/rides', rides);
app.use('/api/routes', routes);
app.use('/api/routing', routing);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
