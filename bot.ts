import { Client, GatewayIntentBits, Events } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(__dirname, 'config.json');
const uploadsDir = path.resolve(__dirname, 'uploads');

// Function to reload config
const loadConfig = () => {
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
        console.error('Error loading config:', error);
        return { userAudio: {} };
    }
};

let config = loadConfig();

// Watch for config changes
fs.watch(configPath, (eventType) => {
    if (eventType === 'change') {
        config = loadConfig();
        console.log('Config reloaded');
    }
});

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

// Listen for voice state updates
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
	if (!oldState.channelId && newState.channelId && newState.member) {
		const userId = newState.member.id;
		if (config.userAudio[userId]) {
			try {
				const channel = newState.channel;
				if (!channel) {
					console.error('No voice channel found for the update.');
					return;
				}

				// Construct full path to audio file
				const audioPath = path.resolve(uploadsDir, config.userAudio[userId]);
				
				// Check if file exists
				if (!fs.existsSync(audioPath)) {
					console.error(`Audio file not found: ${audioPath}`);
					return;
				}

				const connection = joinVoiceChannel({
					channelId: channel.id,
					guildId: channel.guild.id,
					adapterCreator: channel.guild.voiceAdapterCreator
				});
				const player = createAudioPlayer();
				const resource = createAudioResource(audioPath);
				
				// Add error handling for audio playback
				player.on('error', error => {
					console.error('Error playing audio:', error);
					connection.destroy();
				});

				player.play(resource);
				connection.subscribe(player);
				// Wait for playback to finish
				player.once(AudioPlayerStatus.Idle, () => {
					connection.destroy();
				});
			} catch (error) {
				console.error('Error playing audio:', error);
			}
		}
	}
});

client.login(process.env.DISCORD_BOT_TOKEN as string); // Token loaded from environment variable
