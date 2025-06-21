class HistoricalChart {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.data = [];
        this.labels = [];
        
        // Configuration options
        this.options = {
            padding: 60,
            gridLines: 6,
            maxDataPoints: 50,
            smoothing: true,
            showTooltip: true,
            showValues: true,
            colors: {
                download: '#4ade80',
                upload: '#06b6d4',
                grid: 'rgba(255, 255, 255, 0.1)',
                text: '#ffffff',
                background: 'rgba(0, 0, 0, 0.8)'
            },
            ...options
        };
        
        // Tooltip state
        this.tooltip = {
            visible: false,
            x: 0,
            y: 0,
            data: null
        };
        
        // Animation state
        this.animationFrame = null;
        this.lastUpdate = 0;
        
        // Event listeners
        this.setupEventListeners();
        
        // Handle canvas resize
        this.handleResize();
    }
    
    setupEventListeners() {
        if (this.options.showTooltip) {
            this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
            this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        }
        
        window.addEventListener('resize', this.handleResize.bind(this));
    }
    
    handleResize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.draw();
    }
    
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const dataPoint = this.getDataPointAtPosition(x, y);
        if (dataPoint) {
            this.tooltip = {
                visible: true,
                x: x,
                y: y,
                data: dataPoint
            };
            this.draw();
        } else if (this.tooltip.visible) {
            this.tooltip.visible = false;
            this.draw();
        }
    }
    
    handleMouseLeave() {
        if (this.tooltip.visible) {
            this.tooltip.visible = false;
            this.draw();
        }
    }
    
    getDataPointAtPosition(mouseX, mouseY) {
        if (this.data.length === 0) return null;
        
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const padding = this.options.padding;
        
        const chartWidth = width - 2 * padding;
        const relativeX = (mouseX - padding) / chartWidth;
        const dataIndex = Math.round(relativeX * (this.data.length - 1));
        
        if (dataIndex >= 0 && dataIndex < this.data.length) {
            return {
                index: dataIndex,
                ...this.data[dataIndex]
            };
        }
        
        return null;
    }
    
    updateData(newData) {
        // Limit data points for performance
        if (newData.length > this.options.maxDataPoints) {
            this.data = newData.slice(-this.options.maxDataPoints);
        } else {
            this.data = [...newData];
        }
        
        this.labels = this.data.map(item => {
            const date = new Date(item.timestamp);
            return {
                time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                full: date.toLocaleString()
            };
        });
        
        this.draw();
    }
    
    addDataPoint(dataPoint) {
        this.data.push(dataPoint);
        
        // Remove old data points if we exceed the limit
        if (this.data.length > this.options.maxDataPoints) {
            this.data.shift();
        }
        
        const date = new Date(dataPoint.timestamp);
        this.labels.push({
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            full: date.toLocaleString()
        });
        
        if (this.labels.length > this.options.maxDataPoints) {
            this.labels.shift();
        }
        
        this.draw();
    }
    
    formatSpeed(speed) {
        if (speed >= 1000) {
            return (speed / 1000).toFixed(1) + ' Gbps';
        } else if (speed >= 1) {
            return speed.toFixed(1) + ' Mbps';
        } else {
            return (speed * 1000).toFixed(0) + ' Kbps';
        }
    }
    
    drawGrid() {
        const ctx = this.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const padding = this.options.padding;
        
        ctx.strokeStyle = this.options.colors.grid;
        ctx.lineWidth = 1;
        
        // Horizontal grid lines
        for (let i = 0; i <= this.options.gridLines; i++) {
            const y = padding + (height - 2 * padding) * i / this.options.gridLines;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        // Vertical grid lines (time markers)
        const timeSteps = Math.min(6, this.data.length);
        for (let i = 0; i <= timeSteps; i++) {
            const x = padding + (width - 2 * padding) * i / timeSteps;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();
        }
    }
    
    drawAxes() {
        if (this.data.length === 0) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const padding = this.options.padding;
        
        // Find max values for scaling
        const maxDownload = Math.max(...this.data.map(d => d.download_speed || 0));
        const maxUpload = Math.max(...this.data.map(d => d.upload_speed || 0));
        const maxValue = Math.max(maxDownload, maxUpload, 1);
        
        ctx.fillStyle = this.options.colors.text;
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        // Y-axis labels (speed values)
        for (let i = 0; i <= this.options.gridLines; i++) {
            const value = maxValue * (1 - i / this.options.gridLines);
            const y = padding + (height - 2 * padding) * i / this.options.gridLines;
            ctx.fillText(this.formatSpeed(value), padding - 10, y);
        }
        
        // X-axis labels (time)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const timeSteps = Math.min(4, this.data.length);
        for (let i = 0; i <= timeSteps && timeSteps > 0; i++) {
            const dataIndex = Math.floor(i * (this.data.length - 1) / timeSteps);
            if (dataIndex < this.labels.length) {
                const x = padding + (width - 2 * padding) * i / timeSteps;
                ctx.fillText(this.labels[dataIndex].time, x, height - padding + 10);
            }
        }
    }
    
    drawLine(data, color, label) {
        if (this.data.length < 2) return;
        
        const ctx = this.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const padding = this.options.padding;
        
        // Find max value for scaling
        const maxDownload = Math.max(...this.data.map(d => d.download_speed || 0));
        const maxUpload = Math.max(...this.data.map(d => d.upload_speed || 0));
        const maxValue = Math.max(maxDownload, maxUpload, 1);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Create gradient for line
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + '80');
        ctx.strokeStyle = gradient;
        
        ctx.beginPath();
        
        this.data.forEach((point, index) => {
            const x = padding + (width - 2 * padding) * index / (this.data.length - 1);
            const value = point[data] || 0;
            const y = height - padding - (value / maxValue) * (height - 2 * padding);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                if (this.options.smoothing && index > 0) {
                    // Smooth curve using quadratic bezier
                    const prevX = padding + (width - 2 * padding) * (index - 1) / (this.data.length - 1);
                    const prevValue = this.data[index - 1][data] || 0;
                    const prevY = height - padding - (prevValue / maxValue) * (height - 2 * padding);
                    
                    const cpx = (prevX + x) / 2;
                    ctx.quadraticCurveTo(cpx, prevY, x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
        });
        
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = color;
        this.data.forEach((point, index) => {
            const x = padding + (width - 2 * padding) * index / (this.data.length - 1);
            const value = point[data] || 0;
            const y = height - padding - (value / maxValue) * (height - 2 * padding);
            
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
    
    drawLegend() {
        const ctx = this.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        
        // Background for legend
        ctx.fillStyle = this.options.colors.background;
        ctx.fillRect(width - 170, 10, 160, 60);
        
        // Download legend
        ctx.fillStyle = this.options.colors.download;
        ctx.fillRect(width - 160, 20, 20, 3);
        ctx.fillStyle = this.options.colors.text;
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Download', width - 135, 32);
        
        // Upload legend
        ctx.fillStyle = this.options.colors.upload;
        ctx.fillRect(width - 160, 40, 20, 3);
        ctx.fillStyle = this.options.colors.text;
        ctx.fillText('Upload', width - 135, 52);
        
        // Current values
        if (this.data.length > 0) {
            const latest = this.data[this.data.length - 1];
            ctx.font = '12px Arial';
            ctx.fillStyle = this.options.colors.download;
            ctx.fillText(this.formatSpeed(latest.download_speed || 0), width - 80, 32);
            ctx.fillStyle = this.options.colors.upload;
            ctx.fillText(this.formatSpeed(latest.upload_speed || 0), width - 80, 52);
        }
    }
    
    drawTooltip() {
        if (!this.tooltip.visible || !this.tooltip.data) return;
        
        const ctx = this.ctx;
        const data = this.tooltip.data;
        const x = this.tooltip.x;
        const y = this.tooltip.y;
        
        // Tooltip content
        const lines = [
            `Time: ${this.labels[data.index]?.full || 'N/A'}`,
            `Download: ${this.formatSpeed(data.download_speed || 0)}`,
            `Upload: ${this.formatSpeed(data.upload_speed || 0)}`
        ];
        
        // Calculate tooltip size
        ctx.font = '12px Arial';
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        const tooltipWidth = maxWidth + 20;
        const tooltipHeight = lines.length * 20 + 10;
        
        // Position tooltip
        let tooltipX = x + 10;
        let tooltipY = y - tooltipHeight - 10;
        
        // Keep tooltip in bounds
        const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
        
        if (tooltipX + tooltipWidth > canvasWidth) tooltipX = x - tooltipWidth - 10;
        if (tooltipY < 0) tooltipY = y + 10;
        
        // Draw tooltip background
        ctx.fillStyle = this.options.colors.background;
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        
        // Draw tooltip border
        ctx.strokeStyle = this.options.colors.text;
        ctx.lineWidth = 1;
        ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        
        // Draw tooltip text
        ctx.fillStyle = this.options.colors.text;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        lines.forEach((line, index) => {
            ctx.fillText(line, tooltipX + 10, tooltipY + 10 + index * 20);
        });
    }
    
    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        if (this.data.length === 0) {
            // Show "No data" message
            ctx.fillStyle = this.options.colors.text;
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No data available', width / 2, height / 2);
            return;
        }
        
        // Draw chart components
        this.drawGrid();
        this.drawAxes();
        this.drawLine('download_speed', this.options.colors.download, 'Download');
        this.drawLine('upload_speed', this.options.colors.upload, 'Upload');
        this.drawLegend();
        this.drawTooltip();
    }
    
    // Public API methods
    setTheme(theme) {
        if (theme === 'dark') {
            this.options.colors = {
                download: '#4ade80',
                upload: '#06b6d4',
                grid: 'rgba(255, 255, 255, 0.1)',
                text: '#ffffff',
                background: 'rgba(0, 0, 0, 0.8)'
            };
        } else if (theme === 'light') {
            this.options.colors = {
                download: '#22c55e',
                upload: '#0891b2',
                grid: 'rgba(0, 0, 0, 0.1)',
                text: '#000000',
                background: 'rgba(255, 255, 255, 0.9)'
            };
        }
        this.draw();
    }
    
    exportImage() {
        return this.canvas.toDataURL('image/png');
    }
    
    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
        window.removeEventListener('resize', this.handleResize);
    }
}