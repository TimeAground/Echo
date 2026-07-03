# Echo

[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/invite/WVBeWsNXK4)

**A free, open source, and privacy-first voice transcription application.**

Echo is a cross-platform desktop application that provides simple, privacy-focused speech transcription. Press a shortcut, speak, and have your words appear in any text field. Everything happens locally on your computer — no data is sent to the cloud.

## Why Echo?

- **Free**: Accessibility tooling belongs in everyone's hands, not behind a paywall
- **Open Source**: Together we can build further. Extend Echo for yourself and contribute to something bigger
- **Private**: Your voice stays on your computer. Get transcriptions without sending audio to the cloud
- **AI-Powered Post-Processing**: Optionally enhance transcriptions with local or cloud AI models for cleaner, more natural output
- **Simple**: One tool, one job. Transcribe what you say and put it into a text box

## How It Works

1. **Press** a keyboard shortcut (default: `Alt+Q`) to start/stop recording
2. **Speak** your words while the shortcut is active
3. **Release** and Echo transcribes your speech using a local model
4. **Get** your transcribed text automatically in whatever app you're using
5. **(Optional)** Press `Alt+Z` for AI post-processing to clean up and polish the result

The process is entirely local:

- Silence is filtered using VAD (Voice Activity Detection) with Silero
- Transcription uses your choice of local models:
  - **SenseVoice** (recommended) — Alibaba DAMO Academy model, excellent for Chinese and multilingual scenarios
  - **Whisper models** (Small/Medium/Turbo/Large) — OpenAI's models with GPU acceleration when available
  - **Other ONNX models** — Parakeet, Moonshine, GigaAM, Canary, Cohere
- Post-processing supports providers like DeepSeek, OpenAI, Zhipu, Kimi, Alibaba Bailian, and more
- Works on Windows, macOS, and Linux

## Quick Start

### Installation

1. Download the latest release from the [releases page](https://github.com/TimeAground/Echo/releases)
2. Install the application
3. Launch Echo and grant necessary system permissions (microphone, accessibility)
4. Configure your preferred keyboard shortcuts in Settings
5. Start transcribing!

### Development Setup

For detailed build instructions including platform-specific requirements, see [BUILD.md](BUILD.md).

## Architecture

Echo is built as a Tauri application combining:

- **Frontend**: React + TypeScript with Tailwind CSS for the settings UI
- **Backend**: Rust for system integration, audio processing, and ML inference
- **Core Libraries**:
  - `transcribe-rs`: Local speech recognition via ONNX Runtime (SenseVoice, Whisper, Parakeet, and more)
  - `cpal`: Cross-platform audio I/O
  - `vad-rs`: Voice Activity Detection with Silero
  - `enigo`: Simulated keyboard input for text pasting
  - `rubato`: Audio resampling

### Debug Mode

Echo includes an advanced debug mode for development and troubleshooting. Access it via Settings → Advanced → Enable Debug Mode.

### CLI Parameters

Echo supports command-line flags for controlling a running instance and customizing startup behavior:

```bash
echo --toggle-transcription    # Toggle recording on/off
echo --toggle-post-process     # Toggle recording with post-processing on/off
echo --cancel                  # Cancel the current operation
echo --start-hidden            # Start without showing the main window
echo --no-tray                 # Start without the system tray icon
echo --help                    # Show all available flags
```

## Platform Support

- **macOS** (both Intel and Apple Silicon)
- **Windows** (x64)
- **Linux** (x64)

### System Requirements

**For Whisper Models:**
- **macOS**: M series Mac recommended, Intel Mac
- **Windows/Linux**: Intel, AMD, or NVIDIA GPU

**For SenseVoice / ONNX Models:**
- **CPU-only operation** — runs on a wide variety of hardware
- Works well on mid-range hardware and above

## Troubleshooting

### Manual Model Installation (For Proxy Users or Network Restrictions)

If you're behind a proxy or firewall and Echo cannot download models automatically, you can manually download and install them.

**Find your App Data Directory:**
- **macOS**: `~/Library/Application Support/com.echo.desktop/`
- **Windows**: `C:\Users\{username}\AppData\Roaming\com.echo.desktop\`
- **Linux**: `~/.config/com.echo.desktop/`

**Create the models directory** and manually download model files from the Echo model repository.

### Linux Notes

- The overlay window can interfere with pasting on some window managers. Disable it in Settings → Advanced if needed.
- On Wayland, global shortcuts may need to be configured through your desktop environment.

## Verify Release Signatures

Release artifacts are signed with Tauri's updater signature format. The public key is stored in [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) under `plugins.updater.pubkey`.

## How to Contribute

1. **Check existing issues** at [github.com/TimeAground/Echo/issues](https://github.com/TimeAground/Echo/issues)
2. **Fork the repository** and create a feature branch
3. **Test thoroughly** on your target platform
4. **Submit a pull request** with clear description of changes
5. **Join the discussion** on Discord

## License

MIT License — see [LICENSE](LICENSE) file for details.

## Acknowledgments

- **SenseVoice** by Alibaba DAMO Academy for the excellent Chinese/multilingual speech recognition model
- **Whisper** by OpenAI for the foundational speech recognition models
- **whisper.cpp and ggml** for cross-platform Whisper inference
- **Silero** by Snakers for lightweight Voice Activity Detection
- **transcribe-rs** for the unified ONNX inference engine
- **Tauri** team for the Rust-based app framework
- **Community contributors** helping make Echo better
