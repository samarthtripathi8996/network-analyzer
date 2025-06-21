class NetworkGauge {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            min: 0,
            max: 100,
            value: 0,
            unit: '',
            color: '#4ade80',
            ...options
        };
        this.currentValue = 0;
        this.targetValue = 0;
        this.animationId = null;
        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0.75 * Math.PI, 0.25 * Math.PI);
        ctx.lineWidth = 15;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();

        // Draw progress arc
        const progress = (this.currentValue - this.options.min) / (this.options.max - this.options.min);
        const endAngle = 0.75 * Math.PI + progress * 1.5 * Math.PI;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0.75 * Math.PI, endAngle);
        ctx.lineWidth = 15;
        ctx.strokeStyle = this.options.color;
        ctx.stroke();

        // Draw value text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            Math.round(this.currentValue) + this.options.unit,
            centerX,
            centerY + 8
        );
    }

    updateValue(newValue, animate = true) {
        this.targetValue = Math.max(this.options.min, Math.min(this.options.max, newValue));
        
        if (animate) {
            this.animateToValue();
        } else {
            this.currentValue = this.targetValue;
            this.draw();
        }
    }

    animateToValue() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        const animate = () => {
            const diff = this.targetValue - this.currentValue;
            if (Math.abs(diff) > 0.1) {
                this.currentValue += diff * 0.1;
                this.draw();
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.currentValue = this.targetValue;
                this.draw();
            }
        };

        animate();
    }
}
