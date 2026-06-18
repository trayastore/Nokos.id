import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentRouter from "./payment";
import nokosRouter from "./nokos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(paymentRouter);
router.use("/nokos", nokosRouter);

export default router;
