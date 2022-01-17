const { Client, Intents, MessageEmbed } = require('discord.js');
const secrets = require('./secrets.json');
const { api_key } = secrets.imdb;
const { token } = secrets.discord;
const moment = require('moment');
const config = require('./config.json');
const { calendarId, timeZone, event } = config.calendar;
const { url, databaseName, collection } = config.mongo;
const GoogleCalendar = require('./googlecalendar');
const Mongo = require('./mongo');
const imdb = require('imdb-api');

const database = new Mongo(url, databaseName);
const myGcal = new GoogleCalendar(calendarId);
const imdbClient = new imdb.Client({ apiKey: api_key })

async function createMovieEmbed(movie) {
    return new MessageEmbed()
        .setColor('#56a3f1')
        .setTitle(movie.title)
        .setURL(movie.imdburl)
        .setAuthor({ name: `Runtime: ${movie.runtime}` })
        .setDescription(movie.plot)
        .setImage(movie.poster)
        .addFields(movie.ratings.map((rating) => ({ name: rating.source, value: rating.value, inline: true })));
}

// Connect to mongo server
database.connect();

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MESSAGES] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'work') {
        if (interaction.options.getSubcommand() === 'add') {
            const [ month, day ] = interaction.options.getString("date").split("/");
            const start = moment().month(Number(month)-1).date(Number(day));
            const end = moment().month(Number(month)-1).date(Number(day));

            const [ startTime, endTime ] = interaction.options.getString("time").split("-");
            
            let [ startHour, startMinute ] = startTime.substring(0, startTime.length-2).split(":");
            startHour = Number(startHour);
            startMinute = Number(startMinute);

            if (startTime.toLowerCase().endsWith('pm')) {
                startHour += 12;
            }
            start.hour(startHour);
            start.minute(startMinute);

            let [ endHour, endMinute ] = endTime.substring(0, endTime.length-2).split(":");
            endHour = Number(endHour);
            endMinute = Number(endMinute);

            if (endTime.toLowerCase().endsWith('pm')) {
                endHour += 12;
            }
            end.hour(endHour);
            end.minute(endMinute);

            myGcal.createEvent(event.summary, event.location, start, end, timeZone);
            await interaction.reply(`Created Event: ${event.summary} From: ${start.format("dddd, MMMM Do YYYY, h:mm a")} To: ${end.format("dddd, MMMM Do YYYY, h:mm a")}`);
        }
	} else if (commandName === 'movies') {
        if (interaction.options.getSubcommand() === 'add') {
            const movieName = interaction.options.getString("name");
            await interaction.deferReply();
            try {
                const movieResults = await imdbClient.search({ name: movieName });
                const totalFound = movieResults.totalresults;
                let movieIndex = 0;
                let movie = await imdbClient.get({ id: movieResults.results[movieIndex].imdbid });
                let embed = await createMovieEmbed(movie);
                if (totalFound > 1) {
                    const message = await interaction.editReply({ content: `Is this the movie? ${(movieIndex + 1)}/${totalFound}`, embeds: [embed], fetchReply: true });
                
                    try {
                        await message.react('👍');
                        await message.react('👎');
                        await message.react('❌');
                    } catch(error) {
                        console.error("Couldn't react");
                    }
                    
                    const clearUserReactions = async (message, user) => {
                        const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id));
                        try {
                            for (const reaction of userReactions.values()) {
                                await reaction.users.remove(user.id);
                            }
                        } catch (error) {
                            console.error('Failed to remove reactions.');
                        }
                    };

                    const filter = (reaction, user) => {
                        return ['👍', '👎', '❌'].includes(reaction.emoji.name) && !user.bot && interaction.user.id === user.id;
                    };

                    const collector = message.createReactionCollector({ filter });
                    collector.on('collect', async (reaction, user) => {
                        if (reaction.emoji.name === '👍') {
                            await interaction.editReply({ content: "Added movie", embeds: [embed] });
                            collector.stop('add');
                        } else if(reaction.emoji.name === '👎') {
                            movie = await imdbClient.get({ id: movieResults.results[++movieIndex].imdbid });
                            embed = await createMovieEmbed(movie);
                            await interaction.editReply({ content: `Is this the movie? ${(movieIndex + 1)}/${totalFound}`, embeds: [embed] });
                            await clearUserReactions(message, user);
                        } else {
                            await interaction.editReply({ content: "Cancelled search.", embeds: [] });
                            collector.stop();
                        }
                    });

                    collector.on('end', async (collected, reason) => {
                        if (reason === 'add') {
                            await database.insert(collection, movie); 
                        }
                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions:', error));
                    });
                } else if (totalFound === 0) {
                    await database.insert(collection, movie); 
                    await interaction.editReply({ content: "Added movie", embeds: [embed] });
                }
            } catch(error) {
                await interaction.reply(`Error adding movie: ${error.message}`);
            }
        } else if (interaction.options.getSubcommand() === 'list') {
            const movies = (await database.findAll(collection)).map((movie, index) => `${index !== 0 ? ' ' + movie.title : movie.title}`);
            await interaction.reply(`${movies.toLocaleString()}`);
        } else if (interaction.options.getSubcommand() === 'pick') {
            const movies = await database.findAll(collection);
            const movie = movies[Math.floor(Math.random() * movies.length)]
            if (movie) {
                const embed = await createMovieEmbed(movie);
                await database.delete(collection, movie._id);
                await interaction.reply({ content: `Movie Picked: ${movie.title}`, embeds: [ embed ]});
            } else {
                await interaction.reply("There's no movies in the watchlist!");
            }
        }
    }
});

client.login(token);