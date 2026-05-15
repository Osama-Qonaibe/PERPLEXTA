import { Router } from 'express';
import keysRouter from './keys';
import statsRouter from './stats';
import usersRouter from './users';
import financialRouter from './financial';
import databasesRouter from './databases';
import orchestratorRouter from './orchestrator';
import emailsRouter from './emails';
import maintenanceRouter from './maintenance';

const router = Router();

router.use('/keys', keysRouter);
router.use('/stats', statsRouter);
router.use('/users', usersRouter);
router.use('/financial', financialRouter);
router.use('/databases', databasesRouter);
router.use('/orchestrator', orchestratorRouter);
router.use('/emails', emailsRouter);
router.use('/maintenance', maintenanceRouter);

export default router;
