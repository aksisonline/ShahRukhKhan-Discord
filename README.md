# 🎵 Shah Rukh Khan Discord Bot

A Discord bot that allows users to upload custom audio intros that automatically play when they join voice channels. Named after the legendary Bollywood actor Shah Rukh Khan, this bot brings personality and fun to your Discord server!

## ✨ Features

- **🎧 Custom Voice Intros**: Upload audio files that play automatically when you join voice channels
- **🎛️ Slash Commands**: Modern Discord slash command interface
- **📱 Web Dashboard**: Browser-based interface for managing audio files
- **👑 Admin Controls**: Server administrators can manage audio files for any user
- **🔍 Audio Preview**: Preview your audio before it plays for others
- **🐳 Docker Support**: Easy deployment with Docker containers
- **📊 Audio Management**: Upload, preview, and delete audio files
- **🔄 Multiple Formats**: Support for MP3, WAV, OGG, M4A, and FLAC audio files

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun runtime
- Discord Bot Token
- FFmpeg installed on your system

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/aksisonline/ShahRukhKhan-Discord.git
cd ShahRukhKhan-Discord
```

2. **Install dependencies:**
```bash
# Using npm
npm install

# Using bun
bun install
```

3. **Set up environment variables:**
```bash
# Create a .env file or set environment variable
export DISCORD_BOT_TOKEN="your_discord_bot_token_here"
```

4. **Run the bot:**
```bash
# Using npm
npm start

# Using bun
bun run index.ts
```

## 🔧 Discord Bot Setup

### 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Navigate to the "Bot" section
4. Click "Add Bot"
5. Copy the bot token and set it as `DISCORD_BOT_TOKEN`

### 2. Bot Permissions

Your bot needs the following permissions:
- `Send Messages`
- `Use Slash Commands`
- `Connect` (to voice channels)
- `Speak` (to play audio)
- `Use Voice Activity`

### 3. Invite Bot to Server

1. Go to the "OAuth2" > "URL Generator" section
2. Select "bot" and "applications.commands" scopes
3. Select the required permissions
4. Use the generated URL to invite the bot

## 📋 Commands

### Slash Commands

| Command | Description | Usage |
|---------|-------------|--------|
| `/upload` | Upload an audio file for your intro | `/upload audio:[file]` |
| `/unlink` | Remove your audio intro | `/unlink` |
| `/preview` | Preview your current intro audio | `/preview` |
| `/help` | Show all available commands | `/help` |
| `/setvoice` | Set audio intro for another user (Admin) | `/setvoice user:@user audio:[file]` |
| `/removevoice` | Remove audio intro for another user (Admin) | `/removevoice user:@user` |

### Text Commands

| Command | Description |
|---------|-------------|
| `!upload` | Upload audio by attaching file to message |
| `!help` | Show help information |
| `@BotName + attachment` | Alternative upload method |

### Supported Audio Formats

- MP3 (.mp3)
- WAV (.wav)
- OGG (.ogg)
- M4A (.m4a)
- FLAC (.flac)

## 🌐 Web Dashboard

The bot includes a web dashboard for easy audio management:

- **URL**: `http://localhost:3000/dashboard`
- **Features**:
  - Upload audio files for specific users
  - Preview existing audio files
  - Delete audio files
  - View all user-audio mappings

### Dashboard Usage

1. Open your browser and go to `http://localhost:3000/dashboard`
2. Enter the Discord User ID
3. Select an audio file
4. Click "Upload Audio"
5. The audio will be automatically assigned to that user

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Create environment file:**
```bash
echo "DISCORD_BOT_TOKEN=your_token_here" > .env
```

2. **Run with Docker Compose:**
```bash
docker-compose up -d
```

### Using Docker directly

```bash
# Build the image
docker build -t shahrukhkhan-bot .

# Run the container
docker run -d \
  --name shahrukhkhan-bot \
  -e DISCORD_BOT_TOKEN=your_token_here \
  -p 3000:3000 \
  -v ./uploads:/usr/src/app/uploads \
  -v ./config.json:/usr/src/app/config.json \
  shahrukhkhan-bot
```

## 📁 Project Structure

```
ShahRukhKhan-Discord/
├── bot.ts              # Main Discord bot logic
├── dashboard.ts        # Web dashboard server
├── index.ts           # Application entry point
├── config.json        # User audio mappings
├── package.json       # Dependencies and scripts
├── dockerfile         # Docker configuration
├── docker-compose.yml # Docker Compose setup
├── uploads/           # Audio files storage
└── README.md         # This file
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_BOT_TOKEN` | Discord bot token | Yes |
| `PORT` | Web dashboard port (default: 3000) | No |
| `NODE_ENV` | Environment mode | No |

### Config File

The `config.json` file stores user audio mappings:

```json
{
  "userAudio": {
    "user_id_1": "audio_file_1.mp3",
    "user_id_2": "audio_file_2.wav"
  }
}
```

## 🛠️ Development

### Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Set up environment:**
```bash
export DISCORD_BOT_TOKEN="your_token"
```

3. **Run in development mode:**
```bash
npm run dev
```

### Building

```bash
# Build TypeScript
npm run build

# Run built version
npm start
```

## 🔍 Troubleshooting

### Common Issues

1. **FFmpeg not found**
   - Install FFmpeg on your system
   - On Ubuntu: `sudo apt install ffmpeg`
   - On macOS: `brew install ffmpeg`
   - On Windows: Download from [FFmpeg website](https://ffmpeg.org/)

2. **Bot not responding to commands**
   - Check if the bot has proper permissions
   - Verify the bot token is correct
   - Check if slash commands are registered

3. **Audio not playing**
   - Ensure FFmpeg is properly installed
   - Check if the bot has voice permissions
   - Verify the audio file format is supported

4. **Dashboard not loading**
   - Check if port 3000 is available
   - Verify the web server is running
   - Check firewall settings

### Debug Mode

Enable debug logging by setting:
```bash
export DEBUG=true
```

## 📚 API Reference

### Bot Events

- `ready`: Bot has successfully connected to Discord
- `voiceStateUpdate`: User joins/leaves voice channel
- `interactionCreate`: Slash command interaction received

### File Management

- Audio files are stored in the `uploads/` directory
- File naming convention: `{userId}_{timestamp}_{originalName}`
- Automatic cleanup of old files when users upload new ones

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Named after the legendary Bollywood actor Shah Rukh Khan
- Built with [Discord.js](https://discord.js.org/)
- Audio processing powered by [FFmpeg](https://ffmpeg.org/)
- Web dashboard built with [Express.js](https://expressjs.com/)

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/aksisonline/ShahRukhKhan-Discord/issues) section
2. Create a new issue if your problem isn't already reported
3. Join our Discord server for real-time support

---

**Made with ❤️ by the AKS Online team**
