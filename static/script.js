class NetworkMonitor {
    constructor() {
        this.baseURL = window.location.origin;
        this.gauges = {};
        this.chart = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.initializeGauges();
        this.initializeChart();
        this.bindEvents();
        this.loadInitialData();
        this.startAutoRefresh();
    }

    initializeGauges() {
        this.gauges.download = new NetworkGauge(
            document.getElementById('downloadGauge'),
            { max: 200, unit: ' Mbps', color: '#4ade80' }
        );

        this.gauges.upload = new NetworkGauge(
            document.getElementById('uploadGauge'),
            { max: 200, unit: ' Mbps', color: '#06b6d4' }
        );

        this.gauges.latency = new NetworkGauge(
            document.getElementById('latencyGauge'),
            { max: 200, unit: ' ms', color: '#f59e0b' }
        );

        this.gauges.wifi = new NetworkGauge(
            document.getElementById('wifiGauge'),
            { min: -100, max: 0, unit: ' dBm', color: '#8b5cf6' }
        );
    }

    initializeChart() {
        this.chart = new HistoricalChart(document.getElementById('historicalChart'));
    }

    bindEvents() {
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadMetrics();
        });

        document.getElementById('protocolTestBtn').addEventListener('click', () => {
            this.runProtocolTest();
        });

        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadHistoricalData(e.target.dataset.timeframe);
            });
        });
    }

    async loadInitialData() {
        await Promise.all([
            this.loadMetrics(),
            this.loadWifiSignal(),
            this.loadHistoricalData('24h')
        ]);
    }

    async loadMetrics() {
        if (this.isLoading) return;
        
        try {
            this.setLoading(true);
            const response = await fetch(`${this.baseURL}/api/metrics`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.status === 'success') {
                this.updateMetricsDisplay(result.data);
                this.updateConnectionStatus(true);
            } else {
                throw new Error(result.message || 'Failed to load metrics');
            }
        } catch (error) {
            console.error('Failed to load metrics:', error);
            this.updateConnectionStatus(false);
            this.showError('Failed to load network metrics');
        } finally {
            this.setLoading(false);
        }
    }

    async loadWifiSignal() {
        try {
            const response = await fetch(`${this.baseURL}/api/wifi_signal`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.status === 'success') {
                this.gauges.wifi.updateValue(result.data.wifi_signal);
                document.getElementById('wifiValue').textContent = `${result.data.wifi_signal} dBm`;
            }
        } catch (error) {
            console.error('Failed to load WiFi signal:', error);
        }
    }

    async runProtocolTest() {
        const protocol = document.getElementById('protocolSelect').value;
        const btn = document.getElementById('protocolTestBtn');
        
        try {
            btn.disabled = true;
            btn.textContent = 'Testing...';
            
            const response = await fetch(`${this.baseURL}/api/protocol_test/${protocol}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.status === 'success') {
                this.updateMetricsDisplay(result.data);
                this.showSuccess(`${protocol.toUpperCase()} test completed successfully`);
            } else {
                throw new Error(result.message || 'Protocol test failed');
            }
        } catch (error) {
            console.error('Protocol test failed:', error);
            this.showError(`Failed to run ${protocol.toUpperCase()} test`);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Run Protocol Test';
        }
    }

    async loadHistoricalData(timeframe) {
        try {
            const response = await fetch(`${this.baseURL}/api/historical/${timeframe}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.status === 'success') {
                this.chart.updateData(result.data);
            } else {
                throw new Error(result.message || 'Failed to load historical data');
            }
        } catch (error) {
            console.error('Failed to load historical data:', error);
            this.showError('Failed to load historical data');
        }
    }

    updateMetricsDisplay(data) {
        // Update gauges
        this.gauges.download.updateValue(data.download_speed || 0);
        this.gauges.upload.updateValue(data.upload_speed || 0);
        this.gauges.latency.updateValue(data.latency || 0);

        // Update value displays
        document.getElementById('downloadValue').textContent = `${(data.download_speed || 0).toFixed(1)} Mbps`;
        document.getElementById('uploadValue').textContent = `${(data.upload_speed || 0).toFixed(1)} Mbps`;
        document.getElementById('latencyValue').textContent = `${(data.latency || 0).toFixed(0)} ms`;

        // Update additional metrics
        document.getElementById('jitterValue').textContent = `${(data.jitter || 0).toFixed(1)} ms`;
        document.getElementById('dnsValue').textContent = `${(data.dns_lookup_time || 0).toFixed(0)} ms`;
        document.getElementById('packetLossValue').textContent = `${(data.packet_loss || 0).toFixed(1)}%`;
        document.getElementById('tracerouteValue').textContent = `${data.traceroute_hops || 0}`;
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        if (connected) {
            dot.style.background = '#4ade80';
            text.textContent = 'Connected';
        } else {
            dot.style.background = '#ef4444';
            text.textContent = 'Disconnected';
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const btn = document.getElementById('refreshBtn');
        btn.disabled = loading;
        btn.textContent = loading ? 'Loading...' : 'Refresh Metrics';
    }

    showError(message) {
        // Simple error display - you can enhance this with a proper notification system
        console.error(message);
        alert(`Error: ${message}`);
    }

    showSuccess(message) {
        // Simple success display - you can enhance this with a proper notification system
        console.log(message);
    }

    startAutoRefresh() {
        // Refresh metrics every 30 seconds
        setInterval(() => {
            if (!this.isLoading) {
                this.loadMetrics();
                this.loadWifiSignal();
            }
        }, 30000);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NetworkMonitor();
});
