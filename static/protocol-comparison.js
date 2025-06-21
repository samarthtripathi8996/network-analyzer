class ProtocolComparison {
    constructor(options = {}) {
        this.baseURL = options.baseURL || window.location.origin;
        this.containers = {
            downloadBars: document.getElementById('downloadBars'),
            uploadBars: document.getElementById('uploadBars'),
            latencyBars: document.getElementById('latencyBars'),
            reliabilityBars: document.getElementById('reliabilityBars'),
            radarChart: document.getElementById('performanceRadar'),
            comparisonTable: document.getElementById('comparisonTable'),
            recommendation: document.getElementById('recommendationContent'),
            lastUpdated: document.getElementById('lastUpdated')
        };
        
        this.components = {};
        this.protocolData = {};
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.initializeComponents();
        this.bindEvents();
        this.loadData();
        this.startAutoRefresh();
    }

    initializeComponents() {
        // Initialize bar charts
        if (this.containers.downloadBars) {
            this.components.downloadBars = new ProtocolBars(this.containers.downloadBars, {
                metric: 'download_speed',
                unit: 'Mbps'
            });
        }

        if (this.containers.uploadBars) {
            this.components.uploadBars = new ProtocolBars(this.containers.uploadBars, {
                metric: 'upload_speed',
                unit: 'Mbps'
            });
        }

        if (this.containers.latencyBars) {
            this.components.latencyBars = new ProtocolBars(this.containers.latencyBars, {
                metric: 'latency',
                unit: 'ms',
                reverse: true
            });
        }

        if (this.containers.reliabilityBars) {
            this.components.reliabilityBars = new ProtocolBars(this.containers.reliabilityBars, {
                metric: 'reliability_score',
                unit: '%'
            });
        }

        // Initialize radar chart
        if (this.containers.radarChart) {
            this.components.radarChart = new ProtocolRadar(this.containers.radarChart);
        }

        // Initialize table
        if (this.containers.comparisonTable) {
            this.components.comparisonTable = new ProtocolTable(this.containers.comparisonTable);
        }
    }

    bindEvents() {
        const refreshBtn = document.getElementById('refreshComparison');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadData());
        }

        // Handle window resize for radar chart
        window.addEventListener('resize', () => {
            if (this.components.radarChart) {
                this.components.radarChart.resize();
            }
        });
    }

    async loadData() {
        if (this.isLoading) return;

        try {
            this.setLoading(true);
            
            const protocols = ['tcp', 'udp', 'http', 'https', 'icmp'];
            const promises = protocols.map(protocol => this.fetchProtocolData(protocol));
            const results = await Promise.allSettled(promises);
            
            // Process results
            this.protocolData = {};
            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    this.protocolData[protocols[index]] = result.value;
                }
            });

            this.updateAllComponents();
            this.updateLastUpdated();
            
        } catch (error) {
            console.error('Failed to load protocol comparison data:', error);
        } finally {
            this.setLoading(false);
        }
    }

    async fetchProtocolData(protocol) {
        try {
            const response = await fetch(`${this.baseURL}/api/protocol_test/${protocol}`);
            
            if (!response.ok) return null;

            const result = await response.json();
            
            if (result.status === 'success') {
                return {
                    ...result.data,
                    protocol: protocol.toUpperCase(),
                    timestamp: new Date().toISOString(),
                    reliability_score: this.calculateReliabilityScore(result.data)
                };
            }
            
            return null;
        } catch (error) {
            console.warn(`Failed to fetch ${protocol} data:`, error);
            return null;
        }
    }

    calculateReliabilityScore(data) {
        const downloadSpeed = data.download_speed || 0;
        const latency = data.latency || 999;
        const packetLoss = data.packet_loss || 100;
        const jitter = data.jitter || 999;

        let score = 0;
        
        // Speed component (40%)
        score += Math.min(40, (downloadSpeed / 200) * 40);
        
        // Latency component (25%)
        score += Math.max(0, 25 - (latency / 10));
        
        // Packet loss component (25%)
        score += Math.max(0, 25 - (packetLoss * 5));
        
        // Jitter component (10%)
        score += Math.max(0, 10 - (jitter / 5));
        
        return Math.min(100, Math.max(0, score));
    }

    updateAllComponents() {
        // Update all bar charts
        Object.values(this.components).forEach(component => {
            if (component instanceof ProtocolBars) {
                component.updateData(this.protocolData);
            }
        });

        // Update radar chart
        if (this.components.radarChart) {
            this.components.radarChart.updateData(this.protocolData);
        }

        // Update table
        if (this.components.comparisonTable) {
            this.components.comparisonTable.updateData(this.protocolData);
        }

        // Update recommendation
        this.updateRecommendation();
    }

    updateRecommendation() {
        if (!this.containers.recommendation) return;

        const protocols = Object.entries(this.protocolData);
        if (protocols.length === 0) {
            this.containers.recommendation.innerHTML = '<div class="no-data">No protocol data available</div>';
            return;
        }

        const best = protocols.reduce((best, [protocol, data]) => {
            const score = this.calculateOverallScore(data);
            return score > best.score ? { protocol, data, score } : best;
        }, { score: -1 });

        const protocolColors = {
            tcp: '#4ade80', udp: '#06b6d4', http: '#f59e0b', 
            https: '#8b5cf6', icmp: '#ef4444'
        };

        this.containers.recommendation.innerHTML = `
            <div class="best-protocol">
                <div class="protocol-icon" style="background: ${protocolColors[best.protocol]}">
                    ${best.protocol.toUpperCase()}
                </div>
                <div class="protocol-details">
                    <h4>${best.protocol.toUpperCase()} Protocol</h4>
                    <div class="protocol-score">Overall Score: ${best.score.toFixed(1)}/100</div>
                </div>
            </div>
            <p>Based on current network conditions, ${best.protocol.toUpperCase()} offers the best performance with ${(best.data.download_speed || 0).toFixed(1)} Mbps download speed and ${(best.data.latency || 0).toFixed(0)} ms latency.</p>
        `;
    }

    calculateOverallScore(data) {
        return (
            (Math.min(100, (data.download_speed || 0) / 2) * 0.3) +
            (Math.min(100, (data.upload_speed || 0) / 2) * 0.2) +
            (Math.max(0, 100 - (data.latency || 100)) * 0.25) +
            ((data.reliability_score || 0) * 0.25)
        );
    }

    updateLastUpdated() {
        if (this.containers.lastUpdated) {
            this.containers.lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const refreshBtn = document.getElementById('refreshComparison');
        if (refreshBtn) {
            refreshBtn.disabled = loading;
            refreshBtn.textContent = loading ? 'Loading...' : 'Refresh';
        }
    }

    startAutoRefresh() {
        setInterval(() => {
            if (!this.isLoading) {
                this.loadData();
            }
        }, 60000); // Refresh every minute
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProtocolComparison();
});
