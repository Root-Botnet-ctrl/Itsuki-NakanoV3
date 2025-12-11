import fetch from "node-fetch"
import yts from "yt-search"
import crypto from "crypto"
import axios from "axios"

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text?.trim())
      return conn.reply(m.chat, `> ⓘ USO INCORRECTO

> ❌ Debes ingresar el nombre o enlace del video

> 📝 Ejemplo:
> • ${usedPrefix + command} nombre del video
> • ${usedPrefix + command} https://youtube.com/...`, m)

    await conn.sendMessage(m.chat, { react: { text: '🕑', key: m.key } })

    const videoMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|shorts\/|v\/)?([a-zA-Z0-9_-]{11})/)
    const query = videoMatch ? `https://youtu.be/${videoMatch[1]}` : text

    const search = await yts(query)
    const result = videoMatch
      ? search.videos.find(v => v.videoId === videoMatch[1]) || search.all[0]
      : search.all[0]

    if (!result) throw '> ⓘ SIN RESULTADOS\n\n❌ No se encontraron resultados\n\n💡 Intenta con otra búsqueda'

    const { title, thumbnail, timestamp, views, ago, url, author, seconds } = result
    if (seconds > 60000) throw '> ⓘ DURACION EXCEDIDA\n\n❌ El video supera el límite\n\n💡 Máximo 10 minutos'

    const channelName = author?.name || 'Canal desconocido'
    const vistas = formatViews(views)
    const info = `> *ⓘ Y O U T U B E - P L A Y S V3*

> *🏷️ Título:* ${title}
> *📺 Canal:* ${channelName}
> *👀 Vistas:* ${vistas}
> *⏱️ Duración:* ${timestamp}
> *📅 Publicado:* ${ago}
> *🔗 Enlace:* ${url}
> *🎬 Tipo:* ${result.type || 'HD'}`

    const thumb = (await conn.getFile(thumbnail)).data
    await conn.sendMessage(m.chat, { image: thumb, caption: info }, { quoted: m })

    if (['play3', 'mp3'].includes(command)) {
      await conn.sendMessage(m.chat, { react: { text: '🎵', key: m.key } })

      const audio = await savetube.download(url, "audio")
      if (!audio?.status) throw `> ⓘ ERROR\n\n❌ Error al obtener audio\n\n💡 ${audio.error}`

      await conn.sendMessage(
        m.chat,
        {
          audio: { url: audio.result.download },
          mimetype: 'audio/mpeg',
          fileName: `${title}.mp3`
        },
        { quoted: m }
      )

      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    }

    else if (['play4', 'mp4'].includes(command)) {
      await conn.sendMessage(m.chat, { react: { text: '🎥', key: m.key } })
      
      console.log('Buscando video para:', url)
      const video = await getVid(url)
      console.log('Resultado de getVid:', video)
      
      if (!video?.url) {
        console.log('No se obtuvo URL del video')
        throw '> ⓘ ERROR\n\n❌ No se pudo obtener el video\n\n💡 Verifica que el video no esté restringido o prueba con otro'
      }

      console.log('URL del video obtenida:', video.url)

      await conn.sendMessage(
        m.chat,
        {
          video: { url: video.url },
          fileName: `${title}.mp4`,
          mimetype: 'video/mp4',
          caption: `> *ⓘ Y O U T U B E - P L A Y S V3*

> *🏷️ Título:* ${title}
> *📺 Canal:* ${channelName}
> *⏱️ Duración:* ${timestamp}
> *👀 Vistas:* ${vistas}
> *🎬 Formato:* MP4
> *🌐 Servidor:* ${video.api || 'Yupra'}
> *🫧 Calidad:* ${video.quality || 'Alta'}
> *🔗 link:* ${url}`
        },
        { quoted: m }
      )
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    }

  } catch (e) {
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    console.error('Error en descarga YouTube:', e)
    return conn.reply(
      m.chat,
      typeof e === 'string'
        ? e
        : `> ⓘ ERROR\n\n❌ ${e.message || 'Error desconocido'}\n\n💡 Intenta más tarde`,
      m
    )
  }
}

//Comando Play4 Fixieado por ZzawX

handler.command = handler.help = ['play3', 'play4']
handler.tags = ['downloader']
handler.group = true

export default handler

async function getVid(url) {
  const apis = [
    {
      api: 'Yupra',
      endpoint: `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(url)}`,
      extractor: (res) => {
        console.log('Respuesta de Yupra API:', JSON.stringify(res, null, 2))
        
        if (res?.success && res?.data?.download_url) {
          console.log('URL encontrada:', res.data.download_url)
          return {
            url: res.data.download_url,
            quality: res.data.format || 'Desconocida'
          }
        }
        
        if (res?.statusCode === 200 && res?.data?.download_url) {
          console.log('URL encontrada (formato alternativo):', res.data.download_url)
          return {
            url: res.data.download_url,
            quality: res.data.format || 'Desconocida'
          }
        }
        
        console.log('No se encontró download_url en la respuesta')
        return null
      }
    }
  ]
  return await fetchFromApis(apis)
}

async function fetchFromApis(apis) {
  for (const { api, endpoint, extractor } of apis) {
    console.log(`Probando API ${api}: ${endpoint}`)
    
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      
      const response = await fetch(endpoint, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Referer': 'https://api.yupra.my.id/'
        }
      })
      
      clearTimeout(timeout)
      
      console.log(`Status ${api}: ${response.status}`)
      console.log(`Headers ${api}:`, response.headers)
      
      if (!response.ok) {
        console.log(`Error HTTP ${api}: ${response.status} ${response.statusText}`)
        continue
      }
      
      const contentType = response.headers.get('content-type')
      console.log(`Content-Type ${api}: ${contentType}`)
      
      let res
      if (contentType && contentType.includes('application/json')) {
        res = await response.json()
      } else {
        const text = await response.text()
        console.log(`Respuesta texto ${api}:`, text.substring(0, 200))
        
        try {
          res = JSON.parse(text)
        } catch {
          console.log(`No es JSON válido ${api}`)
          continue
        }
      }
      
      console.log(`Respuesta JSON ${api}:`, res)
      
      const result = extractor(res)
      if (result) {
        console.log(`Éxito ${api}:`, result)
        return {
          url: result.url,
          quality: result.quality,
          api
        }
      }
      
      console.log(`Extractor no encontró datos ${api}`)
      
    } catch (err) {
      console.log(`Error en API ${api}:`, err.message)
      if (err.name === 'AbortError') {
        console.log(`Timeout en API ${api}`)
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('Todas las APIs fallaron')
  return null
}

const savetube = {
  api: {
    base: "https://media.savetube.me/api",
    info: "/v2/info",
    download: "/download",
    cdn: "/random-cdn"
  },
  headers: {
    accept: "*/*",
    "content-type": "application/json",
    origin: "https://yt.savetube.me",
    referer: "https://yt.savetube.me/",
    "user-agent": "Postify/1.0.0"
  },
  crypto: {
    hexToBuffer: (hexString) => {
      const matches = hexString.match(/.{1,2}/g)
      return Buffer.from(matches.join(""), "hex")
    },
    decrypt: async (enc) => {
      const secretKey = "C5D58EF67A7584E4A29F6C35BBC4EB12"
      const data = Buffer.from(enc, "base64")
      const iv = data.slice(0, 16)
      const content = data.slice(16)
      const key = savetube.crypto.hexToBuffer(secretKey)
      const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv)
      let decrypted = decipher.update(content)
      decrypted = Buffer.concat([decrypted, decipher.final()])
      return JSON.parse(decrypted.toString())
    },
  },
  youtube: (url) => {
    const patterns = [
      /youtube.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtu.be\/([a-zA-Z0-9_-]{11})/
    ]
    for (let pattern of patterns) {
      if (pattern.test(url)) return url.match(pattern)[1]
    }
    return null
  },
  request: async (endpoint, data = {}, method = "post") => {
    try {
      const { data: response } = await axios({
        method,
        url: `${endpoint.startsWith("http") ? "" : savetube.api.base}${endpoint}`,
        data: method === "post" ? data : undefined,
        params: method === "get" ? data : undefined,
        headers: savetube.headers
      })
      return { status: true, code: 200, data: response }
    } catch (error) {
      return { status: false, code: error.response?.status || 500, error: error.message }
    }
  },
  getCDN: async () => {
    const response = await savetube.request(savetube.api.cdn, {}, "get")
    if (!response.status) return response
    return { status: true, code: 200, data: response.data.cdn }
  },
  download: async (link, type = "audio") => {
    const id = savetube.youtube(link)
    if (!id) return { status: false, code: 400, error: "No se pudo obtener ID del video" }
    try {
      const cdnx = await savetube.getCDN()
      if (!cdnx.status) return cdnx
      const cdn = cdnx.data
      const videoInfo = await savetube.request(
        `https://${cdn}${savetube.api.info}`,
        { url: `https://www.youtube.com/watch?v=${id}` }
      )
      if (!videoInfo.status) return videoInfo
      const decrypted = await savetube.crypto.decrypt(videoInfo.data.data)
      const downloadData = await savetube.request(
        `https://${cdn}${savetube.api.download}`,
        {
          id,
          downloadType: "audio",
          quality: "mp3",
          key: decrypted.key
        }
      )
      if (!downloadData.data.data?.downloadUrl)
        return { status: false, code: 500, error: "No se pudo obtener link de descarga" }

      return {
        status: true,
        result: {
          download: downloadData.data.data.downloadUrl,
          title: decrypted.title || "Desconocido"
        }
      }
    } catch (error) {
      return { status: false, code: 500, error: error.message }
    }
  }
}

function formatViews(views) {
  if (views === undefined) return "No disponible"
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B (${views.toLocaleString()})`
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M (${views.toLocaleString()})`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K (${views.toLocaleString()})`
  return views.toString()
}