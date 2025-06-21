class ProtocolBars {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            metric: 'download_speed',
            unit: 'Mbps',
            reverse: false, // Set true for latency (lower is better)
            colors: {
                tcp: '#4ade80',
                udp: '#06b6d4', 
                http: '#f59e0b',
                https: '#8b5cf6',
                icmp: '#ef4444'
            },
            ...options
        };
        this.data = {};
        this.maxValue = 0;
    }

    updateData(protocolData) {
        this.data = protocolData;
        this.calculateMaxValue();
        this.render();
    }

    calculateMaxValue() {
        const values = Object.values(this.data)
            .map(data => data[this.options.metric] || 0)
            .filter(value => value > 0);
        
        this.maxValue = Math.max(...values, 1);
    }

    render() {
        if (Object.keys(this.data).length === 0) {
            this.container.innerHTML = '<div class="no-data">No data available</div>';
            return;
        }

        const sortedEntries = Object.entries(this.data)
            .filter(([_, data]) => (data[this.options.metric] || 0) > 0)
            .sort(([_, a], [__, b]) => {
                const valueA = a[this.options.metric] || 0;
                const valueB = b[this.options.metric] || 0;
                return this.options.reverse ? valueA - valueB : valueB - valueA;
            });

        this.container.innerHTML = sortedEntries
            .map(([protocol, data]) => this.createBar(protocol, data))
            .join('');

        // Animate bars
        setTimeout(() => this.animateBars(), 100);
    }

    createBar(protocol, data) {
        const value = data[this.options.metric] || 0;
        const percentage = this.options.reverse ? 
            ((this.maxValue - value + 1) / this.maxValue) * 100 : 
            (value / this.maxValue) * 100;

        return `
            <div class="protocol-bar protocol-${protocol.toLowerCase()}" data-protocol="${protocol}">
                <div class="protocol-label">${protocol.toUpperCase()}</div>
                <div class="bar-container">
                    <div class="bar-fill" 
                         style="width: 0%; background: ${this.options.colors[protocol.toLowerCase()] || '#6b7280'}"
                         data-width="${percentage}%">
                        <div class="bar-value">${value.toFixed(1)} ${this.options.unit}</div>
                    </div>
                </div>
            </div>
        `;
    }

    animateBars() {
        const bars = this.container.querySelectorAll('.bar-fill');
        bars.forEach((bar, index) => {
            setTimeout(() => {
                const targetWidth = bar.dataset.width;
                bar.style.transition = 'width 1s ease-out';
                bar.style.width = targetWidth;
            }, index * 200);
        });
    }

    setMetric(metric, unit, reverse = false) {
        this.options.metric = metric;
        this.options.unit = unit;
        this.options.reverse = reverse;
        this.render();
    }
}
