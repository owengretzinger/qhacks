import express from "express";
import { z } from "zod";
import { RecallService } from "../services/recall.service.js";

const router = express.Router();
const recallService = new RecallService();

router.post("/create-bot", async (req, res) => {
  try {
    const schema = z.object({
      meetingUrl: z.string(),
    });

    const { meetingUrl } = schema.parse(req.body);
    const result = await recallService.createBot(meetingUrl);
    res.json(result);
  } catch (error: any) {
    console.error("Error creating bot:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.get("/bot-status/:botId", async (req, res) => {
  try {
    const schema = z.object({
      botId: z.string(),
    });

    const { botId } = schema.parse(req.params);
    const result = await recallService.getBotStatus(botId);
    res.json(result);
  } catch (error: any) {
    console.error("Error getting bot status:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

router.get("/bot-transcript/:botId", async (req, res) => {
  try {
    const schema = z.object({
      botId: z.string(),
    });

    const { botId } = schema.parse(req.params);
    const result = await recallService.getBotTranscript(botId);
    res.json(result);
  } catch (error: any) {
    console.error("Error getting bot transcript:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export const meetingRouter = router;
