const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const config = require('./config.json');
const { clientId, guildId } = config.discord;
const secrets = require('./secrets.json');
const { token } = secrets.discord;

const commands = [
	new SlashCommandBuilder()
    .setName('work')
    .setDescription('Add new work event to Google Calendar')
    .addSubcommand((subcommand) => 
        subcommand
        .setName("add")
        .setDescription("Add work event to calendar")
        .addStringOption((option) => 
            option.setName("date")
                .setDescription("Use Month/Day format")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("time")
                .setDescription("Use the format HH:mm(am/pm)-HH:mm(am/pm)")
                .setRequired(true)
        )
    ),
    new SlashCommandBuilder()
    .setName('movies')
    .setDescription('Movies we need to watch')
    .addSubcommand((subcommand) => 
        subcommand
        .setName("add")
        .setDescription("Add movie to movielist")
        .addStringOption((option) => 
            option.setName("name")
                .setDescription("Name of movie")
                .setRequired(true)
        )
    ),
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
