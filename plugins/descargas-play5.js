import fetch from 'node-fetch'

const thumbnailUrl = 'https://qu.ax/Asbfq.jpg'

const handler = async (m, { conn, args, command, usedPrefix }) => {
  const input = args.join(' ').trim()
  if (!input) {
    await conn.sendMessage(m.chat, { react: { text: '🎵', key: m.key } })
    return conn.reply(m.chat, 
`> 🎅 *¡NAVIDAD EN YOUTUBE!* 🎁

> 📺 *DESCARGADOR DE VIDEO NAVIDEÑO*

> ❌ *Uso incorrecto*

> \`\`\`Debes ingresar el nombre o enlace del video de YouTube\`\`\`

> *Ejemplos navideños:*
> • ${usedPrefix + command} villancicos navideños
> • ${usedPrefix + command} canciones de navidad en video
> • ${usedPrefix + command} música navideña video

> 🎄 *¡Itsuki Nakano V3 descargará tu video!* 🎅`, m)
  }

  await conn.sendMessage(m.chat, { react: { text: '🕑', key: m.key } })

  try {
    const res = await fetch(
      `https://api.vreden.my.id/api/v1/download/play/video?query=${encodeURIComponent(input)}`
    )
    if (!res.ok) throw new Error(`Código HTTP ${res.status}`)

    const json = await res.json()
    if (!json.status || !json.result?.download?.url) {
      throw new Error(
        'No se pudo obtener el video. Verifica el nombre o intenta con otro término.'
      )
    }

    const { metadata, download } = json.result

    await conn.sendMessage(m.chat, { react: { text: '🎶', key: m.key } })

    const msgInfo = 
`> 🎄 *INFORMACIÓN DEL VIDEO NAVIDEÑO* 🎅

> 🏷 *Título:*
> \`\`\`${metadata.title}\`\`\`
> ⏱️ *Duración:*
> \`\`\`${metadata.duration.timestamp}\`\`\`
> 👀 *Vistas:*
> \`\`\`${metadata.views.toLocaleString()}\`\`\`
> 👑 *Autor:*
> \`\`\`${metadata.author.name}\`\`\`
> 🌌 *Calidad:*
\`\`\`${download.quality}\`\`\`

> 🎅 *¡Itsuki Nakano V3 encontró tu video!* 🎄`

    await conn.sendMessage(
      m.chat,
      {
        image: { url: metadata.thumbnail || thumbnailUrl },
        caption: msgInfo
      },
      { quoted: m }
    )

    await conn.sendMessage(m.chat, { react: { text: '📥', key: m.key } })

    const videoRes = await fetch(download.url)
    if (!videoRes.ok) throw new Error(`Código HTTP ${videoRes.status}`)
    const buffer = await videoRes.buffer()

    await conn.sendMessage(
      m.chat,
      {
        video: buffer,
        mimetype: 'video/mp4',
        fileName: download.filename || 'video_navidad.mp4',
        caption: `> 🎄 *VIDEO NAVIDEÑO DESCARGADO* 🎅

> 🏷 *Título:*
\`\`\`${metadata.title}\`\`\`
> 🌌 *Calidad:*
\`\`\`${download.quality}\`\`\`

> 🎁 *¡Disfruta de tu contenido navideño!*
> 🎅 *Itsuki Nakano V3 te desea felices fiestas* 🎄`
      },
      { quoted: m }
    )

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  } catch (error) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    console.error('🎄 Error en play5:', error)

    return conn.reply(m.chat, 
`> 🎄 *¡ERROR EN DESCARGA NAVIDEÑA!* 🎅

> ❌ *No se pudo descargar el video*

> 📝 *Detalles:*
\`\`\`${error.message || 'Error desconocido'}\`\`\`

> 🔍 *Posibles causas:*
> • Video no disponible
> • API temporalmente caída  
> • Enlace incorrecto
> • Problemas de conexión

> 🎅 *Sugerencias:*
> • Verifica el nombre del video
> • Intenta con otro término de búsqueda
> • Espera un momento y vuelve a intentar

> 🎄 *¡Itsuki Nakano V3 lo intentará de nuevo!* 🎁`, m)
  }
}

handler.command = ['play5']
handler.tags = ['downloader']
handler.help = ['play5']
handler.group = true

export default handler