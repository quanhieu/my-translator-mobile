/**
 * Edge TTS client for React Native using react-native-tcp-socket.
 * Creates raw TLS connection to bypass RN WebSocket header limitations.
 */

import TcpSocket from "react-native-tcp-socket";
import { sha256 } from "js-sha256";
import { Buffer } from "buffer";

const HOST = "speech.platform.bing.com";
const PORT = 443;
const PATH = "/consumer/speech/synthesize/readaloud/edge/v1";
const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const CHROMIUM_MAJOR_VERSION = "143";
const WIN_EPOCH = 11644473600;
const TIMEOUT_MS = 30000;

export type EdgeTTSError = "TIMEOUT" | "CONNECTION_FAILED" | "NO_AUDIO";

export interface EdgeTTSConfig {
  voice: string;
  rate: number;
}

function generateSecMsGec(): string {
  const now = Math.floor(Date.now() / 1000);
  let ticks = now + WIN_EPOCH;
  ticks -= ticks % 300;
  const ticksNs = ticks * 1e7;
  const strToHash = `${ticksNs.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
  return sha256(strToHash).toUpperCase();
}

function generateRequestId(): string {
  return "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
}

function generateWebSocketKey(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateMuid(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function getTimestamp(): string {
  const d = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")} ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}:${String(d.getUTCSeconds()).padStart(2, "0")} GMT+0000 (Coordinated Universal Time)`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function encodeWebSocketFrame(data: string): Buffer {
  const payload = Buffer.from(data, "utf-8");
  const len = payload.length;

  let header: Buffer;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // text frame, FIN
    header[1] = 0x80 | len; // masked
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    // Write 64-bit length as two 32-bit parts (BigInt not supported)
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }

  const mask = Buffer.alloc(4);
  for (let i = 0; i < 4; i++) mask[i] = Math.floor(Math.random() * 256);

  const masked = Buffer.alloc(len);
  for (let i = 0; i < len; i++) {
    masked[i] = payload[i] ^ mask[i % 4];
  }

  return Buffer.concat([header, mask, masked]);
}

export class EdgeTTSClient {
  private voice = "vi-VN-NamMinhNeural";
  private rate = 20;
  private socket: ReturnType<typeof TcpSocket.connectTLS> | null = null;

  configure(cfg: Partial<EdgeTTSConfig>): void {
    if (cfg.voice) this.voice = cfg.voice;
    if (cfg.rate !== undefined) this.rate = cfg.rate;
  }

  async speak(text: string): Promise<string> {
    if (!text.trim()) throw new Error("Empty text");

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.stop();
        reject(new Error("TIMEOUT" as EdgeTTSError));
      }, TIMEOUT_MS);

      const cleanup = () => {
        clearTimeout(timeout);
        this.stop();
      };

      this._doSpeak(text)
        .then((result) => {
          cleanup();
          resolve(result);
        })
        .catch((err) => {
          cleanup();
          reject(err);
        });
    });
  }

  stop(): void {
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {
        /* ignore */
      }
      this.socket = null;
    }
  }

  private async _doSpeak(text: string): Promise<string> {
    const connectionId = generateRequestId();
    const secMsGec = generateSecMsGec();
    const secMsGecVersion = `1-${CHROMIUM_FULL_VERSION}`;
    const wsKey = generateWebSocketKey();

    const queryParams =
      `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
      `&ConnectionId=${connectionId}` +
      `&Sec-MS-GEC=${secMsGec}` +
      `&Sec-MS-GEC-Version=${secMsGecVersion}`;

    const muid = generateMuid();
    const upgradeRequest =
      `GET ${PATH}${queryParams} HTTP/1.1\r\n` +
      `Host: ${HOST}\r\n` +
      `Upgrade: websocket\r\n` +
      `Connection: Upgrade\r\n` +
      `Sec-WebSocket-Key: ${wsKey}\r\n` +
      `Sec-WebSocket-Version: 13\r\n` +
      `Origin: chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold\r\n` +
      `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0\r\n` +
      `Pragma: no-cache\r\n` +
      `Cache-Control: no-cache\r\n` +
      `Accept-Encoding: gzip, deflate, br, zstd\r\n` +
      `Accept-Language: en-US,en;q=0.9\r\n` +
      `Cookie: muid=${muid};\r\n` +
      `\r\n`;

    return new Promise((resolve, reject) => {
      const audioChunks: Uint8Array[] = [];
      let buffer = Buffer.alloc(0);
      let handshakeComplete = false;
      let gotTurnEnd = false;

      console.log("[EdgeTTS] Connecting to", HOST, PORT);
      let socket: ReturnType<typeof TcpSocket.connectTLS>;
      try {
        socket = TcpSocket.connectTLS(
        { host: HOST, port: PORT },
        () => {
          console.log("[EdgeTTS] TLS connected, sending upgrade request");
          socket.write(upgradeRequest);
        },
      );

      this.socket = socket;

      socket.on("data", (rawData) => {
        const data = typeof rawData === "string" ? Buffer.from(rawData) : rawData;
        console.log("[EdgeTTS] Received data:", data.length, "bytes");
        buffer = Buffer.concat([buffer, data]);

        if (!handshakeComplete) {
          const headerEnd = buffer.indexOf("\r\n\r\n");
          if (headerEnd !== -1) {
            const response = buffer.slice(0, headerEnd).toString();
            console.log("[EdgeTTS] HTTP Response:", response.substring(0, 300));
            if (!response.includes("101")) {
              reject(new Error("CONNECTION_FAILED" as EdgeTTSError));
              socket.destroy();
              return;
            }
            handshakeComplete = true;
            buffer = buffer.slice(headerEnd + 4);

            // Send config message
            const timestamp = getTimestamp();
            const configMsg =
              `X-Timestamp:${timestamp}\r\n` +
              `Content-Type:application/json; charset=utf-8\r\n` +
              `Path:speech.config\r\n\r\n` +
              `{"context":{"synthesis":{"audio":{"metadataoptions":` +
              `{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},` +
              `"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;

            socket.write(encodeWebSocketFrame(configMsg));

            // Send SSML
            const escapedText = escapeXml(text);
            const rateStr = this.rate >= 0 ? `+${this.rate}%` : `${this.rate}%`;
            const ssml =
              `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
              `<voice name='${this.voice}'>` +
              `<prosody pitch='+0Hz' rate='${rateStr}' volume='+0%'>${escapedText}</prosody>` +
              `</voice></speak>`;

            const ssmlMsg =
              `X-RequestId:${generateRequestId()}\r\n` +
              `Content-Type:application/ssml+xml\r\n` +
              `X-Timestamp:${getTimestamp()}Z\r\n` +
              `Path:ssml\r\n\r\n${ssml}`;

            socket.write(encodeWebSocketFrame(ssmlMsg));
          }
          return;
        }

        // Parse WebSocket frames
        while (buffer.length >= 2) {
          const firstByte = buffer[0];
          const secondByte = buffer[1];
          const opcode = firstByte & 0x0f;
          const masked = (secondByte & 0x80) !== 0;
          let payloadLen = secondByte & 0x7f;
          let headerLen = 2;

          if (payloadLen === 126) {
            if (buffer.length < 4) break;
            payloadLen = buffer.readUInt16BE(2);
            headerLen = 4;
          } else if (payloadLen === 127) {
            if (buffer.length < 10) break;
            payloadLen = Number(buffer.readBigUInt64BE(2));
            headerLen = 10;
          }

          if (masked) headerLen += 4;
          const totalLen = headerLen + payloadLen;
          if (buffer.length < totalLen) break;

          let payload = buffer.slice(headerLen, totalLen);
          if (masked) {
            const mask = buffer.slice(headerLen - 4, headerLen);
            for (let i = 0; i < payload.length; i++) {
              payload[i] ^= mask[i % 4];
            }
          }

          buffer = buffer.slice(totalLen);

          if (opcode === 0x01) {
            // Text frame
            const textContent = payload.toString("utf-8");
            console.log("[EdgeTTS] Text frame:", textContent.substring(0, 200));
            if (textContent.includes("Path:turn.end")) {
              console.log("[EdgeTTS] Got turn.end, closing");
              gotTurnEnd = true;
              socket.destroy();
            }
          } else if (opcode === 0x02) {
            // Binary frame
            console.log("[EdgeTTS] Binary frame:", payload.length, "bytes");
            // Binary frame
            if (payload.length > 2) {
              const hdrLen = (payload[0] << 8) | payload[1];
              if (payload.length > 2 + hdrLen) {
                const audioData = payload.slice(2 + hdrLen);
                audioChunks.push(new Uint8Array(audioData));
              }
            }
          } else if (opcode === 0x08) {
            // Close frame
            socket.destroy();
          }
        }
      });

      socket.on("error", (err: Error) => {
        console.log("[EdgeTTS] Socket error:", err.message);
        reject(new Error("CONNECTION_FAILED" as EdgeTTSError));
      });

      socket.on("close", () => {
        this.socket = null;

        // If we have audio chunks, return them even without turn.end
        if (audioChunks.length > 0) {
          const totalLen = audioChunks.reduce((sum, c) => sum + c.length, 0);
          const combined = new Uint8Array(totalLen);
          let off = 0;
          for (const chunk of audioChunks) {
            combined.set(chunk, off);
            off += chunk.length;
          }
          console.log("[EdgeTTS] Returning", totalLen, "bytes audio");
          resolve(uint8ToBase64(combined));
          return;
        }

        // No audio received
        console.log("[EdgeTTS] No audio received, gotTurnEnd:", gotTurnEnd);
        reject(new Error("NO_AUDIO" as EdgeTTSError));
      });
      } catch (err) {
        console.log("[EdgeTTS] Connect error:", (err as Error).message);
        reject(new Error("CONNECTION_FAILED" as EdgeTTSError));
      }
    });
  }
}

export const edgeTTS = new EdgeTTSClient();
