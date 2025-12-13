import pkg from '@whiskeysockets/baileys'
const { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, DisconnectReason, generateWAMessageFromContent, proto, prepareWAMessageMedia } = pkg
import pino from "pino"
import { protoType, serialize, makeWASocket } from './lib/simple.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { startSubBot } from './lib/subs.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!global.subbots) global.subbots = []

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const subsPath = path.join(dirname, '../../Sessions/Subs')
  const subsCount = fs.existsSync(subsPath)
    ? fs.readdirSync(subsPath).filter((dir) => {
        const credsPath = path.join(subsPath, dir, 'creds.json')
        return fs.existsSync(credsPath)
      }).length
    : 0

  const maxSubs = 20
  if (subsCount >= maxSubs) {
    try { await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }) } catch {}
    return conn.reply(m.chat, '> [🌱] 𝙔𝙖 𝙉𝙤 𝙃𝙖𝙮 𝙈𝙖́𝙨 𝙀𝙨𝙥𝙖𝙘𝙞𝙤 𝙋𝙖𝙧𝙖 𝙃𝙖𝙘𝙚𝙧𝙩𝙚 𝙎𝙪𝙗-𝘽𝙤𝙩 𝙄𝙣𝙩𝙚𝙣𝙩𝙖𝙡𝙤 𝙉𝙪𝙚𝙫𝙖𝙢𝙚𝙣𝙩𝙚 𝙈𝙖́𝙨 𝙏𝙖𝙧𝙙𝙚...', m)
  }

  let commandFlags = {}
  commandFlags[m.sender] = true

  const isCode = /^(code)$/.test(command)
  const isCommand = isCode ? true : false
  const phone = args[0] ? args[0].replace(/\D/g, '') : m.sender.split('@')[0]

  let time = global.db.data.users[m.sender].Subs + 120000 || ''
  if (new Date() - global.db.data.users[m.sender].Subs < 120000) {
    return conn.reply(
      m.chat,
      `💣 Debes esperar *${msToTime(time - new Date())}* para volver a intentar vincular un socket.`,
      m,
    )
  }

  try { await conn.sendMessage(m.chat, { react: { text: '🕑', key: m.key } }) } catch {}

  const existing = global.subbots.find(c => c.id === phone && c.connection === 'open')
  if (existing) {
    try { await conn.sendMessage(m.chat, { react: { text: '🤖', key: m.key } }) } catch {}
    return conn.reply(m.chat, '*𝘠𝘢 𝘌𝘳𝘦𝘴 𝘚𝘶𝘣-𝘣𝘰𝘵 𝘋𝘦 𝘐𝘵𝘴𝘶𝘬𝘪 🟢*', m)
  }

  await startSubBot(m, conn, '', isCode, phone, m.chat, commandFlags, isCommand)
  global.db.data.users[m.sender].Subs = new Date() * 1
}

handler.help = ['code']
handler.tags = ['serbot']
handler.command = ['code']

async function createCodeMessage(conn, m, rawCode) {
  try {
    const imageUrl = 'https://cdn.russellxz.click/73109d7e.jpg'
    let media
    try {
      media = await prepareWAMessageMedia({ image: { url: imageUrl } }, { upload: conn.waUploadToServer })
    } catch (e) {
      media = null
    }

    const header = media ? proto.Message.InteractiveMessage.Header.fromObject({
      hasMediaAttachment: true,
      imageMessage: media.imageMessage
    }) : null

    const interactiveMessage = proto.Message.InteractiveMessage.fromObject({
      header,
      body: proto.Message.InteractiveMessage.Body.fromObject({
        text: `> *❀ OPCIÓN-CODIGO ❀*
  
> 1. 📲 *WhatsApp → Ajustes*  
> 2. ⛓️‍💥 *Dispositivos vinculados*  
> 3. 🔐 *Toca vincular*  
> 4. ✨ Copia este código:
> ˗ˏˋ ꕤ  ${rawCode.match(/.{1,4}/g)?.join(' ⸰ ')}  ꕤ ˎˊ˗
> ⌛ ⋮ *10 segundos de magia*  
> 🍒 ࣪𓂃 *¡Consejito dale rapidito!* ˚₊‧꒰ა ♡ ໒꒱ ‧₊˚`
      }),
      footer: proto.Message.InteractiveMessage.Footer.fromObject({
        text: "ᴄᴏᴘɪᴀ ᴇʟ ᴄᴏᴅɪɢᴏ ᴀǫᴜɪ ᴀʙᴀᴊᴏ 🌺"
      }),
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
        buttons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "𝗖𝗼𝗽𝗶𝗮 𝗘𝗹 𝗖𝗼𝗱𝗶𝗴𝗼 📋",
              copy_code: rawCode
            })
          },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "𝗖𝗮𝗻𝗮𝗹 𝗢𝗳𝗶𝗰𝗶𝗮𝗹 🌷",
              url: "https://whatsapp.com/channel/0029VbBvZH5LNSa4ovSSbQ2N"
            })
          }
        ]
      })
    })

    const msg = generateWAMessageFromContent(m.chat, { interactiveMessage }, { userJid: conn.user.jid, quoted: m })
    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
  } catch (e) {
    await conn.sendMessage(m.chat, { 
      text: `*Código de vinculación:*\n\n${rawCode}\n\n*Instrucciones:*\n1. WhatsApp → Ajustes\n2. Dispositivos vinculados\n3. Vincular nuevo dispositivo\n4. Selecciona "Vincular con número de teléfono"`,
      contextInfo: {
        externalAdReply: {
          title: "🔐 CÓDIGO DE VINCULACIÓN",
          mediaType: 1,
          previewType: 0,
          renderLargerThumbnail: true,
          thumbnail: await (await fetch("https://cdn.russellxz.click/73109d7e.jpg")).buffer(),
          sourceUrl: ''
        }
      }
    }, { quoted: m })
  }
}

function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  hours = hours < 10 ? '0' + hours : hours
  minutes = minutes > 0 ? minutes : ''
  seconds = seconds < 10 && minutes > 0 ? '0' + seconds : seconds
  if (minutes) {
    return `${minutes} minuto${minutes > 1 ? 's' : ''}, ${seconds} segundo${seconds > 1 ? 's' : ''}`
  } else {
    return `${seconds} segundo${seconds > 1 ? 's' : ''}`
  }
}

export default handler