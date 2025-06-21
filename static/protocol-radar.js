class ProtocolRadar {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            colors: {
                tcp: '#4ade80',
                udp: '#06b6d4',
                http: '#f59e0b', 
                https: '#8b5cf6',
                icmp: '#ef4444'
            },
            gridColor: 'rgba(255, 255, 255, 0.2)',
            textColor: 'white',
            ...options
        };
        this.data = [];
        this.labels = ['Download Speed', 'Upload Speed', 'Low Latency', 'Low Packet Loss', 'Reliability'];
        this.animationProgress = 0;
        this.animationId = null;
    }

    updateData(protocolData) {
        this.data = Object.entries(protocolData).map(([protocol, data]) => ({
            label: protocol.toUpperCase(),
            protocol: protocol.toLowerCase(),
            data: [
                this.normalizeValue(data.download_speed || 0, 0, 200),
                this.normalizeValue(data.upload_speed || 0, 0, 200),
                this.normalizeValue(200 - (data.latency || 200), 0, 200),
                this.normalizeValue(100 - (data.packet_loss || 100), 0, 100),
                this.normalizeValue(data.reliability_score || 0, 0, 100)
            ],
            color: this.options.colors[protocol.toLowerCase()] || '#6b7280'
        }));

        this.animateChart();
    }

    normalizeValue(value, min, max) {
        return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
    }

    animateChart() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        this.animationProgress = 0;
        const animate = () => {
            this.animationProgress += 0.02;
            if (this.animationProgress <= 1) {
                this.draw();
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.animationProgress = 1;
                this.draw();
            }
        };
        animate();
    }

    draw() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 60;

        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.labels.length === 0) return;

        // Draw grid and labels
        this.drawGrid(centerX, centerY, radius);
        this.drawLabels(centerX, centerY, radius);
        
        // Draw data with animation
        this.drawData(centerX, centerY, radius);
    }

    drawGrid(centerX, centerY, radius) {
        const ctx = this.ctx;
        const levels = 5;
        
        ctx.strokeStyle = this.options.gridColor;
        ctx.lineWidth = 1;

        // Draw concentric polygons
        for (let level = 1; level <= levels; level++) {
            const levelRadius = (radius / levels) * level;
            ctx.beginPath();
            
            for (let i = 0; i < this.labels.length; i++) {
                const angle = (i * 2 * Math.PI) / this.labels.length - Math.PI / 2;
                const x = centerX + Math.cos(angle) * levelRadius;
                const y = centerY + Math.sin(angle) * levelRadius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            ctx.closePath();
            ctx.stroke();
        }

        // Draw radial lines
        for (let i = 0; i < this.labels.length; i++) {
            const angle = (i * 2 * Math.PI) / this.labels.length - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        // Draw level indicators
        ctx.fillStyle = this.options.textColor;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        for (let level = 1; level <= levels; level++) {
            const levelRadius = (radius / levels) * level;
            const percentage = (level / levels) * 100;
            ctx.fillText(`${percentage.toFixed(0)}%`, centerX + levelRadius + 5, centerY - 5);
        }
    }

    drawLabels(centerX, centerY, radius) {
        const ctx = this.ctx;
        
        ctx.fillStyle = this.options.textColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < this.labels.length; i++) {
            const angle = (i * 2 * Math.PI) / this.labels.length - Math.PI / 2;
            const labelRadius = radius + 25;
            const x = centerX + Math.cos(angle) * labelRadius;
            const y = centerY + Math.sin(angle) * labelRadius;
            
            // Adjust text alignment based on position
            if (x < centerX - 10) ctx.textAlign = 'right';
            else if (x > centerX + 10) ctx.textAlign = 'left';
            else ctx.textAlign = 'center';
            
            ctx.fillText(this.labels[i], x, y);
        }
    }

    drawData(centerX, centerY, radius) {
        const ctx = this.ctx;

        this.data.forEach((dataset, datasetIndex) => {
            const animatedData = dataset.data.map(value => value * this.animationProgress);
            
            ctx.strokeStyle = dataset.color;
            ctx.fillStyle = dataset.color + '30'; // Add transparency
            ctx.lineWidth = 2;

            // Draw filled area
            ctx.beginPath();
            for (let i = 0; i < animatedData.length; i++) {
                const angle = (i * 2 * Math.PI) / animatedData.length - Math.PI / 2;
                const value = (animatedData[i] / 100) * radius;
                const x = centerX + Math.cos(angle) * value;
                const y = centerY + Math.sin(angle) * value;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw points
            ctx.fillStyle = dataset.color;
            for (let i = 0; i < animatedData.length; i++) {
                const angle = (i * 2 * Math.PI) / animatedData.length - Math.PI / 2;
                const value = (animatedData[i] / 100) * radius;
                const x = centerX + Math.cos(angle) * value;
                const y = centerY + Math.sin(angle) * value;
                
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, 2 * Math.PI);
                ctx.fill();
            }
        });
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.draw();
    }
}
