import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

let handler = async (m, { conn, text, args, usedPrefix, command }) => {
    try {
        await m.react('🕒');

        if (!text) {
            await m.react('❔');
            return conn.reply(m.chat, 
                '> `❌ TEXTO FALTANTE`\n\n' +
                '> `📝 Debes escribir texto después del comando`\n\n' +
                '> `💡 Ejemplo:` *' + usedPrefix + command + ' texto aquí*', 
                m
            );
        }

        const tempDir = './temp';
        
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempVideoPath = path.join(tempDir, `brat_video_${Date.now()}.mp4`);
        const tempStickerPath = path.join(tempDir, `brat_sticker_${Date.now()}.webp`);

        const mayApiUrl = `https://mayapi.ooguy.com/bratvideo`;

        let mediaData;

        const apiResponse = await axios({
            method: 'GET',
            url: mayApiUrl,
            params: {
                apikey: 'may-051b5d3d',
                text: text
            },
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, */*'
            }
        });

        if (!apiResponse.data || typeof apiResponse.data !== 'object' || !apiResponse.data.status) {
            throw new Error('Error en la API');
        }

        let videoUrl;
        if (typeof apiResponse.data.result === 'string') {
            videoUrl = apiResponse.data.result;
        } else if (apiResponse.data.result && apiResponse.data.result.url) {
            videoUrl = apiResponse.data.result.url;
        } else if (apiResponse.data.url) {
            videoUrl = apiResponse.data.url;
        } else {
            throw new Error('No se encontró URL de video');
        }

        const videoResponse = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*'
            }
        });

        mediaData = Buffer.from(videoResponse.data);

        if (!mediaData || mediaData.length < 100) {
            throw new Error('Datos insuficientes');
        }

        fs.writeFileSync(tempVideoPath, mediaData);

        try {
            const ffmpegCommand = `ffmpeg -i "${tempVideoPath}" -vcodec libwebp -filter:v fps=fps=20 -lossless 0 -compression_level 3 -qscale 50 -loop 0 -preset default -an -vsync 0 -s 512:512 "${tempStickerPath}" -y`;
            await execAsync(ffmpegCommand, { timeout: 30000 });
        } catch (conversionError) {
            await conn.sendMessage(m.chat, {
                video: mediaData
            }, { quoted: m });
            
            setTimeout(() => {
                try {
                    if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
                } catch (e) {}
            }, 30000);
            
            return;
        }

        if (!fs.existsSync(tempStickerPath)) {
            throw new Error('No se pudo crear el sticker');
        }

        await m.react('✅️');

        const stickerBuffer = fs.readFileSync(tempStickerPath);
        await conn.sendMessage(m.chat, {
            sticker: stickerBuffer
        }, { quoted: m });

        setTimeout(() => {
            try {
                if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
                if (fs.existsSync(tempStickerPath)) fs.unlinkSync(tempStickerPath);
            } catch (e) {}
        }, 30000);

    } catch (error) {
        try {
            if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
            if (fs.existsSync(tempStickerPath)) fs.unlinkSync(tempStickerPath);
        } catch (cleanError) {}
        
        await m.react('❌');
        
        let errorMessage = '> `❌ ERROR ENCONTRADO`\n\n';
        
        if (error.message.includes('insuficientes') || error.message.includes('vacío')) {
            errorMessage += '> `📝 El servicio devolvió un archivo vacío o corrupto.`';
        } else if (error.code === 'ECONNABORTED') {
            errorMessage += '> `⏰ Tiempo de espera agotado. Intenta de nuevo.`';
        } else if (error.response) {
            errorMessage += '> `📝 Error en la API: ' + error.response.status + '`';
        } else if (error.request) {
            errorMessage += '> `📝 No se pudo conectar con el servicio.`';
        } else if (error.message.includes('ffmpeg')) {
            errorMessage += '> `📝 Error al procesar el video.`';
        } else {
            errorMessage += '> `📝 ' + error.message + '`';
        }

        await conn.reply(m.chat, errorMessage, m);
    }
};

handler.help = ['brat'];
handler.tags = ['sticker'];
handler.command = ['brat'];
handler.group = true;

export default handler;