// plugins/owner-rootowner.js
let handler = async (m, { conn, usedPrefix, isROwner, isOwner }) => {
    // Verificación doble de permisos
    if (!isROwner && !isOwner) {
        return m.reply('🚫 Solo el propietario del bot puede usar este comando')
    }

    let chat = global.db.data.chats[m.chat]
    let args = m.text.trim().split(' ').slice(1)
    let action = args[0]?.toLowerCase()

    if (!action || (action !== 'on' && action !== 'off')) {
        let status = chat.rootowner ? '✅ ACTIVADO' : '❌ DESACTIVADO'
        return m.reply(`╭─「 🛡️ *ROOTOWNER* 🛡️ 」
│ 
│ Estado: ${status}
│ 
│ *Uso:*
│ ${usedPrefix}rootowner on
│ ${usedPrefix}rootowner off
│ 
│ *Nota:* Cuando está activado, solo el creador
│ puede usar comandos en este grupo.
╰─◉`)
    }

    if (action === 'on') {
        chat.rootowner = true
        await m.reply(`✅ *RootOwner Activado*\n\nAhora solo tú (el creador) puedes usar comandos en este grupo.\n\nLos demás usuarios recibirán un mensaje de restricción.`)
    } else {
        chat.rootowner = false
        await m.reply(`✅ *RootOwner Desactivado*\n\nAhora todos los administradores y usuarios pueden usar comandos normalmente.`)
    }
    
    // Guardar cambios en la base de datos
    global.db.write()
}

handler.help = ['rootowner [on/off]']
handler.tags = ['owner', 'group']
handler.command = /^(rootowner|soloyo|onlyme|soloowner)$/i
handler.group = true
handler.rowner = true
handler.owner = true

export default handler