import express from 'express';
import cors from 'cors';
import workflowRouter from './routes/workflow.routes';

const app = express();

app.use(cors({
    origin: "*"
}));
app.use(express.json());
app.get('/', (req, res) => {
    res.send('Home page');
});
app.use('/api', workflowRouter);

export default app;