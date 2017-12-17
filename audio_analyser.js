class AudioAnalyser {

    constructor(time_smoothing, lower_threshold_db, upper_threshold_db, filter_freq, sigmoid_center, sigmoid_steepness) {
        this.running = false;
        this.boom = 0;
        this.step = 0;
        this.wraparound = Number.MAX_SAFE_INTEGER - 1000;
        this.fft_data = null;

        this.update_params(time_smoothing,lower_threshold_db,upper_threshold_db, filter_freq, sigmoid_center, sigmoid_steepness)
    }

    update_params(time_smoothing, lower_threshold_db, upper_threshold_db, filter_freq, sigmoid_center, sigmoid_steepness) {
        this.time_smoothing = time_smoothing;
        this.lower_threshold_db = lower_threshold_db;
        this.upper_threshold_db = upper_threshold_db;
        this.sigmoid_center = sigmoid_center;
        this.step_threshold = sigmoid_center; // yolo
        this.filter_freq = filter_freq;
        this.sigmoid_center = sigmoid_center;
        this.sigmoid_steepness = sigmoid_steepness;

        // update the actual settings with power & fun
        if (this.analyser == null) return;

        this.analyser.smoothingTimeConstant = this.time_smoothing;
        this.analyser.minDecibels = this.lower_threshold_db;
        this.analyser.maxDecibels = this.upper_threshold_db;
        this.biquad_filter.frequency.value = this.filter_freq;
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
        const sigmoid_steepness = this.sigmoid_steepness;
        return 1 / (1 + Math.exp(sigmoid_steepness * (this.boom - this.sigmoid_center)));
    }

    get_step() {
        return this.step;
    }

    get_fft_data() {
        return this.fft_data;
    }

    setup_audio_context(stream) {
        const audio_context = new(window.AudioContext || window.webkitAudioContext)();

        this.analyser = audio_context.createAnalyser();
        this.analyser.fftSize = 32;
        this.analyser.smoothingTimeConstant = this.time_smoothing;
        this.analyser.minDecibels = this.lower_threshold_db;
        this.analyser.maxDecibels = this.upper_threshold_db;

        this.biquad_filter = audio_context.createBiquadFilter();
        this.biquad_filter.type = "lowpass";
        this.biquad_filter.frequency.value = this.filter_freq;

        const gain_node = audio_context.createGain();
        gain_node.gain.value = 0.5;

        const microphone = audio_context.createMediaStreamSource(stream);

        microphone.connect(gain_node);
        gain_node.connect(this.biquad_filter);
        this.biquad_filter.connect(this.analyser);

        console.log("AudioContext wired up, woof!");

        this.running = true;    
        this.process_audio();
    }

    process_audio() {
        if (!this.running) return true;
        
        requestAnimationFrame(this.process_audio.bind(this));

        const fft_data = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatFrequencyData(fft_data);
        this.normalize_db(fft_data);
        this.fft_data = fft_data;
        this.boom = this.fft_data[1]
        this.update_step();
    }

    stop() {
        this.running = false;
    }

    normalize_db(fft_data) {
        for (let [bin, val_db] of fft_data.entries()) {
            let val_limited = Math.min(Math.max(val_db, this.lower_threshold_db), this.upper_threshold_db);
            let val_offset = (val_limited - this.lower_threshold_db);
            let val_normalized =  val_offset / (this.upper_threshold_db - this.lower_threshold_db);
            fft_data[bin] = val_normalized;
        }
    }

    update_step() {
        if (this.step > this.wraparound) {
            this.step = 0;
        }

        if (this.boom > this.step_threshold) {
            this.step += 1 + this.boom;
        }
    }
}
