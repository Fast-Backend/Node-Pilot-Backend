import express from 'express';
import cors from 'cors';
import workflowRouter from './routes/workflow.routes';

const app = express();

app.use(cors({
    origin: "https://node-pilot-frontend.onrender.com/"
}));
app.use(express.json());
app.get('/', (req, res) => {
    res.send('Home page');
});
app.use('/api/workflows', workflowRouter);

export default app;