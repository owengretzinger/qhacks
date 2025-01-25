import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express, { Request, Response } from "express";
import { promises as fs } from "fs";
import OpenAI from "openai";
dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is not set in environment variables");
  process.exit(1);
}

if (!process.env.ELEVEN_LABS_API_KEY) {
  console.error(
    "Error: ELEVEN_LABS_API_KEY is not set in environment variables"
  );
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "kgG7dCoKCfLehAPWkJOE";

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

interface Message {
  text: string;
  audio?: string;
  lipsync?: any;
  facialExpression:
    | "smile"
    | "sad"
    | "angry"
    | "surprised"
    | "funnyFace"
    | "default";
  animation:
    | "Talking_0"
    | "Talking_1"
    | "Talking_2"
    | "Crying"
    | "Laughing"
    | "Rumba"
    | "Idle"
    | "Terrified"
    | "Angry";
}

interface ChatResponse {
  messages: Message[];
}

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello World!");
});

app.get("/voices", async (_req: Request, res: Response) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

const execCommand = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message: number): Promise<void> => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  await execCommand(
    `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  await execCommand(
    `./bin/rhubarb -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
  );
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

app.post("/chat", async (req: Request, res: Response) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    res.status(400).send({ error: "No message provided" });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1000,
    temperature: 0.6,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: `
        You are an AI intern assistant.
        You will always reply with a JSON array of messages. With a maximum of 3 messages.
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
        The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry. 
        `,
      },
      {
        role: "user",
        content: userMessage || "Hello",
      },
    ],
  });

  let messages: Message[] = JSON.parse(
    completion.choices[0].message.content || "{}"
  );
  if ((messages as any).messages) {
    messages = (messages as any).messages;
  }

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const fileName = `audios/message_${i}.mp3`;
    const textInput = message.text;
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
    await lipSyncMessage(i);
    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

  res.send({ messages });
});

const readJsonTranscript = async (file: string): Promise<any> => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file: string): Promise<string> => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
