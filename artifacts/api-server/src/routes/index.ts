import { Router, type IRouter } from "express";
import healthRouter from "./health";
import backupRouter from "./backup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(backupRouter);

export default router;
