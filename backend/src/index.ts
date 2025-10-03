import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import productsRouter from './routes/products';
import aiRouter from './routes/ai';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/products', productsRouter);
app.use('/ai', aiRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));