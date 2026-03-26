import { soundManager } from './soundManager';

class VoiceManager {
    constructor() {
        this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
        this.currentUtterance = null;
        this.voiceName = '';
        this.voiceGender = 'auto';
        this.rate = 1;
        this.pitch = 1;
        this.stateListeners = new Set();
        this.voicesLoaded = false;
        this.voiceResolverAttached = false;

        // Auto-initialize if supported
        if (this.synth) {
            this.ensureVoiceLoading();
        }
    }

    isSupported() {
        return !!this.synth && typeof window !== 'undefined' && !!window.SpeechSynthesisUtterance;
    }

    ensureVoiceLoading() {
        if (!this.isSupported() || this.voiceResolverAttached) return;
        this.voiceResolverAttached = true;
        
        const markLoaded = () => {
            const list = this.synth.getVoices() || [];
            if (list.length > 0) {
                this.voicesLoaded = true;
            }
        };

        // Some browsers load voices asynchronously
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = markLoaded;
        }
        markLoaded();
    }

    onStateChange(listener) {
        this.stateListeners.add(listener);
        // Initial state emission
        listener(!!(this.synth && this.synth.speaking));
        return () => this.stateListeners.delete(listener);
    }

    emitState(isSpeaking) {
        this.stateListeners.forEach((listener) => {
            try {
                listener(isSpeaking);
            } catch (err) {
                console.error("VoiceManager listener error:", err);
            }
        });
    }

    getVoices() {
        if (!this.isSupported()) return [];
        return this.synth.getVoices() || [];
    }

    setVoice(voiceName) {
        this.voiceName = String(voiceName || '');
    }

    setVoiceByGender(gender) {
        this.voiceGender = gender === 'male' || gender === 'female' ? gender : 'auto';

        const voices = this.getVoices();
        if (!voices.length || this.voiceGender === 'auto') return;

        const maleHints = ['male', 'david', 'google uk english male', 'microsoft mark', 'guy'];
        const femaleHints = ['female', 'samantha', 'google us english', 'zira', 'aria', 'jenny', 'karen'];
        const hints = this.voiceGender === 'male' ? maleHints : femaleHints;
        
        const match = voices.find((voice) => {
            const n = `${voice.name} ${voice.lang}`.toLowerCase();
            return hints.some((hint) => n.includes(hint));
        });

        if (match) {
            this.voiceName = match.name;
        }
    }

    setRate(rate) {
        this.rate = Math.min(2, Math.max(0.5, Number(rate) || 1));
    }

    setPitch(pitch) {
        this.pitch = Math.min(2, Math.max(0, Number(pitch) || 1));
    }

    duckLabAudio(isActive) {
        try {
            soundManager.setVoiceActive(isActive);
        } catch {
            // fail-safe
        }
    }

    sanitizeForSpeech(text) {
        return String(text || '')
            .replace(/```[\s\S]*?```/g, ' code block omitted ')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
            .replace(/[#>*_~|]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    stop() {
        if (!this.isSupported()) return;
        this.synth.cancel();
        this.currentUtterance = null;
        this.emitState(false);
        this.duckLabAudio(false);
    }

    resolveVoice() {
        const voices = this.getVoices();
        if (!voices.length) return null;

        if (this.voiceName) {
            const direct = voices.find((item) => item.name === this.voiceName);
            if (direct) return direct;
        }

        if (this.voiceGender && this.voiceGender !== 'auto') {
            const maleHints = ['male', 'david', 'google uk english male', 'microsoft mark', 'guy'];
            const femaleHints = ['female', 'samantha', 'google us english', 'zira', 'aria', 'jenny', 'karen'];
            const hints = this.voiceGender === 'male' ? maleHints : femaleHints;
            
            const genderMatch = voices.find((voice) => {
                const n = `${voice.name} ${voice.lang}`.toLowerCase();
                return hints.some((hint) => n.includes(hint));
            });
            if (genderMatch) return genderMatch;
        }

        const preferredDefaults = ['samantha', 'jenny', 'aria', 'zira', 'google us english', 'en-us'];
        const softDefault = voices.find((voice) => {
            const name = `${voice.name} ${voice.lang}`.toLowerCase();
            return preferredDefaults.some((hint) => name.includes(hint));
        });
        return softDefault || voices[0] || null;
    }

    speak(text, options = {}) {
        if (!this.isSupported()) return false;
        this.ensureVoiceLoading();
        
        // Final protection against stuck synth
        if (this.synth.paused) {
            this.synth.resume();
        }

        const value = this.sanitizeForSpeech(text);
        if (!value) return false;

        this.stop();

        const utterance = new window.SpeechSynthesisUtterance(value);
        const voice = this.resolveVoice();
        if (voice) utterance.voice = voice;
        
        utterance.rate = this.rate;
        utterance.pitch = this.pitch;
        utterance.volume = 1.0; // Ensure full volume

        utterance.onstart = () => {
            this.emitState(true);
            this.duckLabAudio(true);
        };
        utterance.onend = () => {
            this.currentUtterance = null;
            this.emitState(false);
            this.duckLabAudio(false);
        };
        utterance.onerror = (err) => {
            console.error("Speech Synthesis Error:", err);
            this.currentUtterance = null;
            this.emitState(false);
            this.duckLabAudio(false);
        };

        this.currentUtterance = utterance;
        
        const { immediate = false } = options;
        if (immediate) {
            this.synth.speak(utterance);
        } else {
            // Small delay to ensure previous cancel() finished
            setTimeout(() => {
                this.synth.speak(utterance);
            }, 50);
        }
        
        return true;
    }

    speakImmediate(text) {
        return this.speak(text, { immediate: true });
    }
}

export const voiceManager = new VoiceManager();
export default voiceManager;
