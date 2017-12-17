class AudioAnalyser {

    constructor(time_smoothing, lower_threshold_db, upper_threshold_db, boomness_clip, step_threshold) {
        this.running = false;
        this.time_smoothing = time_smoothing;
        this.lower_threshold_db = lower_threshold_db;
        this.upper_threshold_db = upper_threshold_db;
        this.boomness_clip = boomness_clip;
        this.step_threshold = step_threshold;
        this.boom = 0;
        this.step = 0;
        this.wraparound = Number.MAX_SAFE_INTEGER - 1000;
    }

    run() {
        navigator.getUserMedia(
            {audio: true},
            this.setup_audio_context.bind(this),
            console.error
        );
    }

    boomness() {
        // returns float 0 - 1 with the amount of boom in the room
        if (this.boom > this.boomness_clip) {
            return this.boom;
        } else {
            return 0;
        }
    }

    get_step() {
        return this.step;
    }

    setup_audio_context(stream) {
        const audio_context = new(window.AudioContext || window.webkitAudioContext)();

        this.analyser = audio_context.createAnalyser();
        this.analyser.fftSize = 32;
        this.analyser.smoothingTimeConstant = this.time_smoothing;

        const biquad_filter = audio_context.createBiquadFilter();
        biquad_filter.type = "lowpass";
        biquad_filter.frequency.value = 500;

        const microphone = audio_context.createMediaStreamSource(stream);

        biquad_filter.connect(this.analyser);
        microphone.connect(biquad_filter);

        console.log("AudioContext wired up, woof!");

        this.running = true;    
        this.process_audio();
    }

    process_audio() {
        if (!this.running) return true;
        requestAnimationFrame(this.process_audio.bind(this));
        const fft_data = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatFrequencyData(fft_data);
        this.boom = this.normalize_db(fft_data[1]);
        this.update_step();
    }

    stop() {
        this.running = false;
    }

    normalize_db(val_db) {
        let val_limited = Math.min(Math.max(val_db, this.lower_threshold_db), this.upper_threshold_db);
        let val_offset = (val_limited - this.lower_threshold_db);
        let val_normalized =  val_offset / (this.upper_threshold_db - this.lower_threshold_db);
        return val_normalized;
    }

    update_step() {
        if (this.step > this.wraparound) {
            this.step = 0;
        }

        if (this.boom > this.step_threshold) {
            this.step += 1;
        }
    }
}
