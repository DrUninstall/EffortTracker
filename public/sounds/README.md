# Sound Assets

This directory contains audio files for UI feedback sounds.

## Required Files

| File | Duration | Description | Recommended Source |
|------|----------|-------------|-------------------|
| `complete.mp3` | ~300ms | Satisfying "ding" for quota completion | UI8, Mixkit, Freesound |
| `log.mp3` | ~80ms | Subtle tick for quick-add actions | Short click/pop sound |
| `timer-end.mp3` | ~500ms | Gentle chime for Pomodoro phase end | Bell or notification tone |
| `achievement.mp3` | ~600ms | Celebratory sound for milestones | Level up / success jingle |

## Specifications

- **Format**: MP3 (best browser compatibility)
- **Sample Rate**: 44.1kHz
- **Bitrate**: 128kbps (sufficient for short UI sounds)
- **Volume**: Normalize to similar levels

## Free Sound Resources

1. **Mixkit** (https://mixkit.co/free-sound-effects/) - Free for commercial use
2. **Freesound** (https://freesound.org/) - CC licensed sounds
3. **UI8** (https://ui8.net/category/sounds) - Premium UI sounds
4. **Pixabay** (https://pixabay.com/sound-effects/) - Royalty-free

## Notes

- Sounds are optional - the app works without them
- If files are missing, playback fails silently
- Users can disable sounds in Settings
- Sounds respect `prefers-reduced-motion` preference
