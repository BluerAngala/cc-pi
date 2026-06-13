import { Router } from "express";
import { toolDefs } from "../../extensions/tool-defs.ts";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ tools: toolDefs });
});

export default router;
