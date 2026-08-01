import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.production'), override: true });
}

