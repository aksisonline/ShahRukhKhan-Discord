import { Client, GatewayIntentBits, Events, Message, AttachmentBuilder, SlashCommandBuilder, REST, Routes, CommandInteraction, ChatInputCommandInteraction } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set FFmpeg path explicitly
try {
	const ffmpegStatic = require('ffmpeg-static');
	if (ffmpegStatic) {
		process.env.FFMPEG_PATH = ffmpegStatic;
		console.log('🎵 Using ffmpeg-static:', ffmpegStatic);
	}
} catch (error) {
	// Fallback to system FFmpeg
	process.env.FFMPEG_PATH = '/usr/bin/ffmpeg';
	console.log('🎵 Using system FFmpeg:', process.env.FFMPEG_PATH);
}

const configPath = path.resolve(__dirname, 'config.json');
const uploadsDir = path.resolve(__dirname, 'uploads');

const loadConfig = () => {
    try {
        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (error) {
        console.error('Error loading config:', error);
        return { userAudio: {} };
    }
};

const saveConfig = (config: any) => {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('Config saved successfully');
    } catch (error) {
        console.error('Error saving config:', error);
    }
};

const downloadFile = (url: string, dest: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = url.startsWith('https') ? https : http;
        
        request.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {}); // Delete the file on error
            reject(err);
        });
    });
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
	intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages
		// GatewayIntentBits.MessageContent // Enable this in Discord Developer Portal for text commands
	]
});

// Define slash commands
const commands = [
	new SlashCommandBuilder()
		.setName('upload')
		.setDescription('Upload an audio file for your intro')
		.addAttachmentOption(option =>
			option.setName('audio')
				.setDescription('Audio file to upload (mp3, wav, ogg, m4a, flac)')
				.setRequired(true)
		),
	new SlashCommandBuilder()
		.setName('unlink')
		.setDescription('Remove your audio intro'),
	new SlashCommandBuilder()
		.setName('setvoice')
		.setDescription('Set audio intro for another user (Admin only)')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('User to set voice for')
				.setRequired(true)
		)
		.addAttachmentOption(option =>
			option.setName('audio')
				.setDescription('Audio file to upload')
				.setRequired(true)
		),
	new SlashCommandBuilder()
		.setName('removevoice')
		.setDescription('Remove audio intro for another user (Admin only)')
		.addUserOption(option =>
			option.setName('user')
				.setDescription('User to remove voice for')
				.setRequired(true)
		),
	new SlashCommandBuilder()
		.setName('help')
		.setDescription('Show available commands and help'),
	new SlashCommandBuilder()
		.setName('preview')
		.setDescription('Preview your current intro audio in a voice channel')
].map(command => command.toJSON());

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN as string);

const deployCommands = async () => {
	try {
		console.log('🔄 Started refreshing application (/) commands...');
		
		// Get application ID from the client
		const clientId = client.user?.id;
		if (!clientId) {
			console.error('❌ Could not get client ID');
			return;
		}

		await rest.put(
			Routes.applicationCommands(clientId),
			{ body: commands }
		);

		console.log('✅ Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error('❌ Error deploying commands:', error);
	}
};

// Check FFmpeg installation on startup
client.once('ready', async () => {
	console.log(`🤖 Bot is ready! Logged in as ${client.user?.tag}`);
	console.log('🎵 FFmpeg path:', process.env.FFMPEG_PATH);
	
	// Deploy slash commands
	await deployCommands();
	
	// Check which Opus encoder is available
	try {
		const opusscript = require('opusscript');
		console.log('✅ Opus encoder: opusscript (JavaScript implementation)');
	} catch (error) {
		console.log('❌ No Opus encoder found');
	}
	
	// Test if we can create a simple audio resource
	try {
		const testPath = path.join(__dirname, 'package.json'); // Use any existing file for test
		if (fs.existsSync(testPath)) {
			console.log('✅ FFmpeg test: File exists for testing');
		}
	} catch (error) {
		console.error('❌ FFmpeg test failed:', error);
	}
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
				
				// Wait for connection to be ready
				await entersState(connection, VoiceConnectionStatus.Ready, 30000);
				
				const player = createAudioPlayer();
				
				// Create audio resource with error handling
				let resource;
				try {
					resource = createAudioResource(audioPath, {
						inlineVolume: true
					});
				} catch (error) {
					console.error('Error creating audio resource:', error);
					console.error('Make sure FFmpeg is installed on your system');
					console.error('FFmpeg path:', process.env.FFMPEG_PATH);
					connection.destroy();
					return;
				}
				
				// Add error handling for audio playback
				player.on('error', error => {
					console.error('Error playing audio:', error);
					connection.destroy();
				});

				// Add timeout as a fallback
				const timeout = setTimeout(() => {
					console.log('Audio playback timeout, disconnecting');
					connection.destroy();
				}, 30000); // 30 second timeout

				player.play(resource);
				connection.subscribe(player);
				
				// Wait for playback to finish
				player.once(AudioPlayerStatus.Idle, () => {
					clearTimeout(timeout);
					console.log('Audio playback finished, disconnecting');
					connection.destroy();
				});
				
				// Also handle if the player stops unexpectedly
				player.once(AudioPlayerStatus.AutoPaused, () => {
					clearTimeout(timeout);
					console.log('Audio playback auto-paused, disconnecting');
					connection.destroy();
				});
			} catch (error) {
				console.error('Error playing audio:', error);
			}
		}
	}
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;

	switch (commandName) {
		case 'upload': {
			await interaction.deferReply();
			
			const attachment = interaction.options.getAttachment('audio');
			if (!attachment) {
				await interaction.editReply('❌ No audio file provided!');
				return;
			}

			// Check if it's an audio file
			const audioFormats = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
			const isAudio = audioFormats.some(format => attachment.name?.toLowerCase().endsWith(format));
			
			if (!isAudio) {
				await interaction.editReply('❌ Please upload a valid audio file (mp3, wav, ogg, m4a, flac)!');
				return;
			}

			try {
				const userId = interaction.user.id;
				const fileName = `${userId}_${Date.now()}_${attachment.name}`;
				const filePath = path.join(uploadsDir, fileName);
				
				await downloadFile(attachment.url, filePath);
				
				// Remove old file if exists
				if (config.userAudio[userId]) {
					const oldFilePath = path.join(uploadsDir, config.userAudio[userId]);
					if (fs.existsSync(oldFilePath)) {
						fs.unlinkSync(oldFilePath);
					}
				}
				
				// Update config
				config.userAudio[userId] = fileName;
				saveConfig(config);
				
				await interaction.editReply('✅ Audio file uploaded successfully! It will play when you join a voice channel.');
			} catch (error) {
				console.error('Error uploading file:', error);
				await interaction.editReply('❌ Error uploading file. Please try again.');
			}
			break;
		}

		case 'unlink': {
			const userId = interaction.user.id;
			
			if (!config.userAudio[userId]) {
				await interaction.reply('❌ You don\'t have any audio file linked!');
				return;
			}

			try {
				// Delete the file
				const fileName = config.userAudio[userId];
				const filePath = path.join(uploadsDir, fileName);
				
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
				
				// Remove from config
				delete config.userAudio[userId];
				saveConfig(config);
				
				await interaction.reply('✅ Your audio file has been unlinked and removed.');
			} catch (error) {
				console.error('Error unlinking file:', error);
				await interaction.reply('❌ Error removing file. Please try again.');
			}
			break;
		}

		case 'setvoice': {
			if (!interaction.memberPermissions?.has('ManageGuild')) {
				await interaction.reply('❌ You need "Manage Server" permission to use this command!');
				return;
			}

			await interaction.deferReply();
			
			const targetUser = interaction.options.getUser('user');
			const attachment = interaction.options.getAttachment('audio');
			
			if (!targetUser || !attachment) {
				await interaction.editReply('❌ Please provide both a user and an audio file!');
				return;
			}

			// Check if it's an audio file
			const audioFormats = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
			const isAudio = audioFormats.some(format => attachment.name?.toLowerCase().endsWith(format));
			
			if (!isAudio) {
				await interaction.editReply('❌ Please upload a valid audio file (mp3, wav, ogg, m4a, flac)!');
				return;
			}

			try {
				const targetUserId = targetUser.id;
				const fileName = `${targetUserId}_${Date.now()}_${attachment.name}`;
				const filePath = path.join(uploadsDir, fileName);
				
				await downloadFile(attachment.url, filePath);
				
				// Remove old file if exists
				if (config.userAudio[targetUserId]) {
					const oldFilePath = path.join(uploadsDir, config.userAudio[targetUserId]);
					if (fs.existsSync(oldFilePath)) {
						fs.unlinkSync(oldFilePath);
					}
				}
				
				// Update config
				config.userAudio[targetUserId] = fileName;
				saveConfig(config);
				
				await interaction.editReply(`✅ Audio file set for ${targetUser.username}!`);
			} catch (error) {
				console.error('Error setting voice:', error);
				await interaction.editReply('❌ Error setting voice. Please try again.');
			}
			break;
		}

		case 'removevoice': {
			if (!interaction.memberPermissions?.has('ManageGuild')) {
				await interaction.reply('❌ You need "Manage Server" permission to use this command!');
				return;
			}

			const targetUser = interaction.options.getUser('user');
			if (!targetUser) {
				await interaction.reply('❌ Please provide a user!');
				return;
			}

			const targetUserId = targetUser.id;
			
			if (!config.userAudio[targetUserId]) {
				await interaction.reply(`❌ ${targetUser.username} doesn't have any audio file linked!`);
				return;
			}

			try {
				// Delete the file
				const fileName = config.userAudio[targetUserId];
				const filePath = path.join(uploadsDir, fileName);
				
				if (fs.existsSync(filePath)) {
					fs.unlinkSync(filePath);
				}
				
				// Remove from config
				delete config.userAudio[targetUserId];
				saveConfig(config);
				
				await interaction.reply(`✅ Audio file removed for ${targetUser.username}.`);
			} catch (error) {
				console.error('Error removing voice:', error);
				await interaction.reply('❌ Error removing voice. Please try again.');
			}
			break;
		}

		case 'preview': {
			const userId = interaction.user.id;
			
			if (!config.userAudio[userId]) {
				await interaction.reply('❌ You don\'t have any audio file linked! Use `/upload` to add one.');
				return;
			}

			// Check if user is in a voice channel
			const member = interaction.guild?.members.cache.get(userId);
			const voiceChannel = member?.voice.channel;
			
			if (!voiceChannel) {
				await interaction.reply('❌ You need to be in a voice channel to preview your audio!');
				return;
			}

			await interaction.deferReply();

			try {
				const audioPath = path.resolve(uploadsDir, config.userAudio[userId]);
				
				if (!fs.existsSync(audioPath)) {
					await interaction.editReply('❌ Audio file not found. Please upload a new one.');
					return;
				}

				const connection = joinVoiceChannel({
					channelId: voiceChannel.id,
					guildId: voiceChannel.guild.id,
					adapterCreator: voiceChannel.guild.voiceAdapterCreator
				});
				
				await entersState(connection, VoiceConnectionStatus.Ready, 30000);
				
				const player = createAudioPlayer();
				const resource = createAudioResource(audioPath, { inlineVolume: true });
				
				player.on('error', error => {
					console.error('Error playing preview:', error);
					connection.destroy();
				});

				const timeout = setTimeout(() => {
					connection.destroy();
				}, 30000);

				player.play(resource);
				connection.subscribe(player);
				
				player.once(AudioPlayerStatus.Idle, () => {
					clearTimeout(timeout);
					connection.destroy();
				});
				
				await interaction.editReply('🎵 Playing your audio preview! The bot will leave after playback.');
			} catch (error) {
				console.error('Error previewing audio:', error);
				await interaction.editReply('❌ Error playing preview. Please try again.');
			}
			break;
		}

		case 'help': {
			const helpEmbed = {
				color: 0x00ff00,
				title: '🎵 Shah Rukh Khan Bot Commands',
				description: 'Upload and manage custom voice intros that play when you join voice channels!',
				fields: [
					{
						name: '📤 `/upload`',
						value: 'Upload an audio file for your intro (attach audio file)',
						inline: false
					},
					{
						name: '🔗 `/unlink`',
						value: 'Remove your audio intro',
						inline: false
					},
					{
						name: '🎧 `/preview`',
						value: 'Preview your current intro audio (join a voice channel first)',
						inline: false
					},
					{
						name: '👑 `/setvoice @user`',
						value: 'Set audio intro for another user (Admin only)',
						inline: false
					},
					{
						name: '🗑️ `/removevoice @user`',
						value: 'Remove audio intro for another user (Admin only)',
						inline: false
					},
					{
						name: '❓ `/help`',
						value: 'Show this help message',
						inline: false
					}
				],
				footer: {
					text: 'Supported formats: mp3, wav, ogg, m4a, flac • The bot will automatically play your audio when you join a voice channel!'
				}
			};

			await interaction.reply({ embeds: [helpEmbed] });
			break;
		}

		default:
			await interaction.reply('❌ Unknown command!');
	}
});

// Listen for messages (simplified text commands)
client.on(Events.MessageCreate, async (message: Message) => {
	if (message.author.bot) return;
	
	// Check if we have message content intent
	if (!message.content) {
		// Message content intent not enabled - only respond to mentions
		if (message.mentions.has(client.user!) && message.attachments.size > 0) {
			// Handle audio upload via mention + attachment
			const attachment = message.attachments.first();
			if (!attachment) return;
			
			const audioFormats = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
			const isAudio = audioFormats.some(format => attachment.name?.toLowerCase().endsWith(format));
			
			if (isAudio) {
				try {
					const userId = message.author.id;
					const fileName = `${userId}_${Date.now()}_${attachment.name}`;
					const filePath = path.join(uploadsDir, fileName);
					
					await downloadFile(attachment.url, filePath);
					
					// Remove old file if exists
					if (config.userAudio[userId]) {
						const oldFilePath = path.join(uploadsDir, config.userAudio[userId]);
						if (fs.existsSync(oldFilePath)) {
							fs.unlinkSync(oldFilePath);
						}
					}
					
					// Update config
					config.userAudio[userId] = fileName;
					saveConfig(config);
					
					message.reply('✅ Audio file uploaded successfully! It will play when you join a voice channel.\n💡 **Tip:** Use `/` slash commands for full functionality!');
				} catch (error) {
					console.error('Error uploading file:', error);
					message.reply('❌ Error uploading file. Please try again.');
				}
			} else {
				message.reply('💡 **Tip:** Use `/upload` slash command or mention me with an audio file to upload your intro!');
			}
		}
		return;
	}
	
	const content = message.content.toLowerCase();
	
	// Simple text command: !upload with attachment
	if (content.startsWith('!upload')) {
		if (message.attachments.size === 0) {
			message.reply('💡 **Tip:** Use `/upload` slash command for a better experience!\n\nOr attach an audio file to this message.');
			return;
		}
		
		const attachment = message.attachments.first();
		if (!attachment) return;
		
		// Check if it's an audio file
		const audioFormats = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
		const isAudio = audioFormats.some(format => attachment.name?.toLowerCase().endsWith(format));
		
		if (!isAudio) {
			message.reply('❌ Please upload a valid audio file (mp3, wav, ogg, m4a, flac)!\n💡 **Tip:** Use `/upload` slash command for a better experience!');
			return;
		}
		
		try {
			const userId = message.author.id;
			const fileName = `${userId}_${Date.now()}_${attachment.name}`;
			const filePath = path.join(uploadsDir, fileName);
			
			await downloadFile(attachment.url, filePath);
			
			// Remove old file if exists
			if (config.userAudio[userId]) {
				const oldFilePath = path.join(uploadsDir, config.userAudio[userId]);
				if (fs.existsSync(oldFilePath)) {
					fs.unlinkSync(oldFilePath);
				}
			}
			
			// Update config
			config.userAudio[userId] = fileName;
			saveConfig(config);
			
			message.reply('✅ Audio file uploaded successfully! It will play when you join a voice channel.\n💡 **Tip:** Use `/help` to see all available commands!');
		} catch (error) {
			console.error('Error uploading file:', error);
			message.reply('❌ Error uploading file. Please try again.');
		}
	}
	
	// Simple help command
	else if (content.startsWith('!help')) {
		const helpMessage = `
**🎵 Shah Rukh Khan Bot Commands:**

**Slash Commands (Recommended):**
\`/upload\` - Upload an audio file for your intro
\`/unlink\` - Remove your audio intro
\`/preview\` - Preview your intro audio
\`/setvoice @user\` - Set audio for another user (Admin only)
\`/removevoice @user\` - Remove audio for another user (Admin only)
\`/help\` - Show detailed help

**Text Commands:**
\`!upload\` - Upload audio by attaching file to message
\`!help\` - Show this help

**Alternative Upload:**
Mention me (@${client.user?.username}) with an audio file attached

**Supported formats:** mp3, wav, ogg, m4a, flac

The bot will automatically play your audio when you join a voice channel!
		`;
		
		message.reply(helpMessage);
	}
	
	// For any other !command, suggest using slash commands
	else if (content.startsWith('!')) {
		message.reply('💡 **Tip:** Most commands are now slash commands! Type `/` to see all available commands, or use `/help` for detailed information.');
	}
});

client.login(process.env.DISCORD_BOT_TOKEN as string); // Token loaded from environment variable
