const Discord = require("discord.js")
const bot = new Discord.Client()
const config = require("./config")

bot.login(config.token)

bot.on("ready", () => console.log("[WS] Gateway Ready"))
bot.on("disconnect", () => console.log("[WS] Gateway Disconnected"))
bot.on("reconnecting", () => console.log("[WS] Reconnecting"))
bot.on("resume", () => console.log("[WS] Gateway Resumed"))

const mainGuild = "272885620769161216" // Blob Emoji
const extraGuilds = [
    "356869031870988309", // Blob Emoji 2
    "356876866952364032", // Blob Emoji 3
    "356876897403011072" // Blob Emoji 4
]
const adminRoles = [
    "290295853124550657", // Blob Boss
    "295476842935353345" // Blob Police
]
const prefix = "<:blobhammer:357765371769651201> "

bot.on("guildBanAdd", (g, user) => {
    setTimeout(async() => {
        if (g.id !== mainGuild) return
        if (!g) return console.error("[ERROR] Could not get event guild")
        const member = await g.fetchMember(bot.user)
        if (!member.hasPermission("BAN_MEMBERS")) return console.error("[PERMS] No BAN_MEMBERS permission")

        try {
            let reason = ""
            if (member.hasPermission("VIEW_AUDIT_LOG")) {
                const auditLogs = await g.fetchAuditLogs({ limit: 20, type: "MEMBER_BAN_ADD" })
                console.log(auditLogs)
                let entry = auditLogs.entries.filter(entry => entry.action === "MEMBER_BAN_ADD" && entry.targetType === "USER" && entry.target.id === user.id)
                console.log(entry)
                reason = entry.size > 0 ? entry.first().reason : ""
            } else console.log("[PERMS] No VIEW_AUDIT_LOG permission")

            for (let gid of extraGuilds) {
                let guild = bot.guilds.get(gid)
                if (!guild) return console.error(`[ERROR] Could not get guild ${gid}`)
                await guild.ban(user, reason)
                console.log(`[BAN] Banned ${user.tag} from ${guild.id}`)
            }
        } catch (e) {
            console.error(`[ERROR]`, e)
        }
    }, 500)
})

bot.on("guildBanRemove", (g, user) => {
    setTimeout(async() => {
        if (g.id !== mainGuild) return
        if (!g) return console.error("[ERROR] Couldn't get event guild")
        const member = await g.fetchMember(bot.user)
        if (!member.hasPermission("BAN_MEMBERS")) return console.error("[PERMS] No BAN_MEMBERS permission")

        try {
            let reason = ""
            if (member.hasPermission("VIEW_AUDIT_LOG")) {
                const auditLogs = await g.fetchAuditLogs({ limit: 20, type: "MEMBER_BAN_REMOVE" })
                let entry = auditLogs.entries.filter(entry => entry.action === "MEMBER_BAN_REMOVE" && entry.targetType === "USER" && entry.target.id === user.id)
                reason = entry.size > 0 ? entry.first().reason : ""
            } else console.log("[PERMS] No VIEW_AUDIT_LOG permission")

            for (let gid of extraGuilds) {
                let guild = bot.guilds.get(gid)
                if (!guild) return console.error(`[ERROR] Could not get guild ${gid}`)
                await guild.unban(user, reason)
                console.log(`[UNBAN] Unbanned ${user.tag} from ${guild.id}`)
            }
        } catch (e) {
            console.error(`[ERROR]`, e)
        }
    }, 500)
})

bot.on("message", async msg => {
    if (msg.guild.id !== mainGuild) return
    if (!msg.member.roles.some(role => adminRoles.includes(role.id))) return
    if (!msg.content.startsWith(prefix)) return
    const args = msg.content.slice(prefix.length).split(" ")

    if (args[0] === "sync") {
        const main = bot.guilds.get(mainGuild)
        if (!main) return console.error("[ERROR] Could not get main guild")
        const mainBans = await main.fetchBans()
        exports.banCount = 0
        exports.guildCount = 0

        for (let guild of extraGuilds) {
            guild = bot.guilds.get(guild)
            if (!guild) continue
            let bans = await guild.fetchBans()
            let bannedUsers = mainBans.filterArray(user => mainBans.has(user.id) === true && bans.has(user.id) === false)
            let unbannedUsers = bans.filterArray(user => mainBans.has(user.id) === false && bans.has(user.id) === true)

            for (let ban of bannedUsers) {
                await guild.ban(ban, "sync from main guild")
                exports.banCount++
            }
            for (let ban of unbannedUsers) {
                await guild.unban(ban, "sync from main guild")
                exports.banCount++
            }
            exports.guildCount++
        }
        if (exports.banCount > 0) msg.channel.send(`Successfully synced ${exports.banCount} ${exports.banCount > 1 ? "bans" : "ban"} in ${exports.guildCount} guilds`)
        else msg.channel.send("All bans are already fully synced")
    } else if (args[0] === "ping") {
        let startTime = msg.createdTimestamp
        msg.channel.send("Pinging...").then(newMsg => {
            let endTime = newMsg.createdTimestamp
            newMsg.edit("Pong! `" + Math.round(endTime - startTime) + "ms`")
        })
    } else if (args[0] === "restart") {
        msg.channel.send("Restarting")
        process.exit()
    }
})

process.on("uncaughtException", (err) => {
    console.error("[ERROR] Uncaught Exception:\n", err.stack || err)
});

process.on("unhandledRejection", (reason, p) => {
    console.log("[ERROR] Unhandled Rejection at: Promise", p, "reason:", reason);
});