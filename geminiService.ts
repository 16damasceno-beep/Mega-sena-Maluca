
import { GoogleGenAI, Modality } from "@google/genai";
import { ChaosLevel } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getChaosCommentary = async (type: 'win' | 'lose' | 'pick', numbers: number[], level: ChaosLevel) => {
  const prompt = type === 'win' 
    ? `O usuário ACERTOU todos os números da Mega Sena Maluca (${numbers.join(', ')}). 
       Nível de Caos Atual: ${level}.
       Gere uma resposta curta e agressivamente engraçada em português dizendo que ele é MALUCO e que não era para acertar. 
       Se o nível for Apocalíptico, seja extremamente caótico e absurdo.`
    : `O usuário escolheu os números ${numbers.join(', ')} mas errou o jogo. 
       Nível de Caos Atual: ${level}.
       Gere um deboche curto e engraçado em português. 
       Tranquilo: sarcasmo leve. Malucão: deboche pesado. Apocalíptico: humilhação total e nonsense.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Você é o 'Mestre do Caos' da Mega Sena Maluca. Seu objetivo é ser sarcástico, caótico e engraçado. Você odeia quando as pessoas ganham seu jogo.",
        temperature: 0.9,
      }
    });
    return response.text || "Erro no sistema de deboche!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return type === 'win' ? "VC É MALUCO?! NÃO ERA PRA ACERTAR ESSE JOGO SEU MALUCO!" : "Errou feio, errou rude!";
  }
};

export const generateWinnerImage = async () => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ text: "A stunning, glamorous woman in a golden sparkling bikini at a high-end beach club party, blowing a kiss to the camera, winking, realistic high-quality photography, celebratory atmosphere, money falling in background." }],
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Image generation failed", e);
    return null;
  }
};

export const editWinnerImage = async (base64Image: string, prompt: string) => {
  try {
    // Extract base64 part
    const data = base64Image.split(',')[1] || base64Image;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: data,
              mimeType: 'image/png'
            }
          },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Image editing failed", e);
    return null;
  }
};

export const generateWinnerAudio = async () => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: 'Vem meu querido, vou gastar todo seu dinheiro!' }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (e) {
    console.error("TTS failed", e);
    return null;
  }
};

export const decodeBase64Audio = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
