/**
 * deploy-commands.js — Register Heady™ slash commands with Discord API
 *
 * Usage: DISCORD_BOT_TOKEN=... DISCORD_CLIENT_ID=... node deploy-commands.js
 */

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // optional: deploy to specific server

if (!TOKEN || !CLIENT_ID) {
    console.error("❌ Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID in .env");
    process.exit(1);
}

const commands = [
    new SlashCommandBuilder()
        .setName("heady")
        .setDescription("Invoke a Heady service group")
        .addStringOption(opt =>
            opt.setName("group")
                .setDescription("Service group to route to")
                .setRequired(true)
                .addChoices(
                    { name: "🐝 swarm — Distributed AI foraging", value: "swarm" },
                    { name: "⚡ code — Ensemble coding", value: "code" },
                    { name: "⚔️ battle — Adversarial validation", value: "battle" },
                    { name: "🎨 creative — Content generation", value: "creative" },
                    { name: "🎲 simulate — Monte Carlo sims", value: "simulate" },
                    { name: "📋 audit — Governance & compliance", value: "audit" },
                    { name: "🧠 brain — Deep reasoning", value: "brain" },
                    { name: "🔍 lens — Visual analysis", value: "lens" },
                    { name: "🔀 decompose — Fan-out/merge", value: "decompose" },
                ))
        .addStringOption(opt =>
            opt.setName("task")
                .setDescription("Your task or question")
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName("heady-status")
        .setDescription("Show Heady system health and service group status"),

    new SlashCommandBuilder()
        .setName("heady-services")
        .setDescription("List all Heady service groups"),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log("🐝 Registering Heady slash commands...");
        const route = GUILD_ID
            ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
            : Routes.applicationCommands(CLIENT_ID);
        await rest.put(route, { body: commands.map(c => c.toJSON()) });
        console.log("✅ Slash commands registered successfully!");
    } catch (err) {
        console.error("❌", err);
    }
})();
