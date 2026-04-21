import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { buildLottieSticker, listPacks } from 'walottie-sticker';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    name: 'sticker',
    description: 'Convierte una imagen respondida en sticker Lottie animado.',
    category: 'Lotties Stickers',

    async execute({ sock, msg, jid, sender, args }) {
        const contexto          = msg.message?.extendedTextMessage?.contextInfo;
        const mensajeRespondido = contexto?.quotedMessage;

        if (!mensajeRespondido) {
            return await sock.sendMessage(jid, {
                text: 'Responde a una imagen para crear el sticker.',
            }, { quoted: msg });
        }

        if (!mensajeRespondido.imageMessage) {
            return await sock.sendMessage(jid, {
                text: 'El mensaje respondido no contiene una imagen válida.',
            }, { quoted: msg });
        }

        /
        const packArg = args?.[0] ?? 'Chomp';
        const idArg   = Number(args?.[1] ?? 1);

        const packs   = listPacks();
        const packKey = Object.keys(packs).find(k => k.toLowerCase() === packArg.toLowerCase());

        if (!packKey || !packs[packKey].includes(idArg)) {
            const disponibles = Object.entries(packs)
                .map(([nombre, ids]) => `*${nombre}* (1–${ids.length})`)
                .join(', ');
            return await sock.sendMessage(jid, {
                text: `Pack o ID inválido.\n\nDisponibles: ${disponibles}`,
            }, { quoted: msg });
        }

        const mensajeParaDescarga = {
            key: {
                remoteJid:   jid,
                id:          contexto.stanzaId,
                fromMe:      false,
                participant: contexto.participant ?? undefined,
            },
            message: mensajeRespondido,
        };

        const buffer = await downloadMediaMessage(mensajeParaDescarga, 'buffer', {});
        const mime   = mensajeRespondido.imageMessage.mimetype ?? 'image/jpeg';
        const salida = path.join(os.tmpdir(), `sticker-${crypto.randomBytes(6).toString('hex')}.was`);

        try {
            await buildLottieSticker({ pack: packKey, id: idArg, buffer, mime, salida });

            await sock.sendMessage(jid, {
                sticker:  fs.readFileSync(salida),
                mimetype: 'application/was',
            }, { quoted: msg });
        } finally {
            if (fs.existsSync(salida)) fs.unlinkSync(salida);
        }
    },
};
