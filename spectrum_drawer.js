class SpectrumDrawer {
    constructor(element, audio_analyser) {
        this.element = element;
        this.context_2d = element.getContext("2d");
        this.context_2d.strokeStyle = '#ff0000';
        this.audio_analyser = audio_analyser;
    }

    draw() {
        requestAnimationFrame(this.draw.bind(this));

        const fft_data = this.audio_analyser.get_fft_data();
        if (fft_data == null) return;

        const bins = fft_data.length;
        const max_height = this.element.height;
        const step_width = Math.floor(this.element.width / bins);

        this.context_2d.lineWidth = step_width;
        this.context_2d.clearRect(0, 0, this.element.width, this.element.height);

        this.context_2d.beginPath();
        for (let [i, bin] of fft_data.entries()) {
            let origin = i * step_width + (step_width * 0.5);
            this.context_2d.moveTo(origin, max_height);
            this.context_2d.lineTo(origin, max_height - (max_height * bin));
        }
        this.context_2d.closePath();
        this.context_2d.stroke();

    }
}