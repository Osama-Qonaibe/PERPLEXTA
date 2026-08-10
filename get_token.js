import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign(
  { id: 1, email: 'admin@admin.com', role: 'admin' },
  process.env.JWT_SECRET || 'secret',
  { expiresIn: '1h' }
);
console.log(token);
