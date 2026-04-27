import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import vehiclesRouter from "./vehicles";
import documentsRouter from "./documents";
import dashboardRouter from "./dashboard";
import notificationsRouter from "./notifications";
import storageRouter from "./storage";
import { uploadsRouter } from "./upload-routes";
import reportsRouter from "./reports";
import profileRouter from "./profile";
import supportRouter from "./support";
import telegramRouter from "./telegram";
import tirCarnetsRouter from "./tir-carnets";
import dazvolsRouter from "./dazvols";

const router: IRouter = Router();

router.use(supportRouter);
router.use(uploadsRouter);
router.use(healthRouter);
router.use(authRouter);
router.use(companiesRouter);
router.use(vehiclesRouter);
router.use(documentsRouter);
router.use(dashboardRouter);
router.use(notificationsRouter);
router.use(storageRouter);
router.use(reportsRouter);
router.use(profileRouter);
router.use(telegramRouter);
router.use(tirCarnetsRouter);
router.use(dazvolsRouter);

export default router;