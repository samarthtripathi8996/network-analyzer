class ProtocolTable {
    constructor(tableElement, options = {}) {
        this.table = tableElement;
        this.tbody = tableElement.querySelector('tbody');
        this.options = {
            showAnimations: true,
            sortable: true,
            ...options
        };
        this.data = {};
        this.sortColumn = null;
        this.sortDirection = 'desc';
        
        if (this.options.sortable) {
            this.initSorting();
        }
    }

    initSorting() {
        const headers = this.table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                this.sortBy(column);
            });
        });
    }

    updateData(protocolData) {
        this.data = protocolData;
        this.render();
    }

    render() {
        if (Object.keys(this.data).length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="8" class="no-data">No protocol data available</td></tr>';
            return;
        }

        let entries = Object.entries(this.data);
        
        // Apply sorting if specified
        if (this.sortColumn) {
            entries = this.sortEntries(entries);
        }

        const rows = entries.map(([protocol, data], index) => 
            this.createRow(protocol, data, index)
        );

        this.tbody.innerHTML = rows.join('');

        if (this.options.showAnimations) {
            this.animateRows();
        }
    }

    createRow(protocol, data, index) {
        const status = this.calculateStatus(data);
        const testTime = data.timestamp ? 
            new Date(data.timestamp).toLocaleTimeString() : 
            'N/A';
        
        return `
            <tr class="protocol-row" style="opacity: 0; transform: translateY(20px);" data-index="${index}">
                <td class="protocol-name">
                    <div class="protocol-indicator" style="background: ${this.getProtocolColor(protocol)}"></div>
                    <strong>${protocol.toUpperCase()}</strong>
                </td>
                <td class="metric-value">${(data.download_speed || 0).toFixed(1)}</td>
                <td class="metric-value">${(data.upload_speed || 0).toFixed(1)}</td>
                <td class="metric-value">${(data.latency || 0).toFixed(0)}</td>
                <td class="metric-value">${(data.jitter || 0).toFixed(1)}</td>
                <td class="metric-value">${(data.packet_loss || 0).toFixed(1)}</td>
                <td class="test-time">${testTime}</td>
                <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
            </tr>
        `;
    }

    animateRows() {
        const rows = this.tbody.querySelectorAll('.protocol-row');
        rows.forEach((row, index) => {
            setTimeout(() => {
                row.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    sortBy(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'desc';
        }
        
        this.updateSortHeaders();
        this.render();
    }

    sortEntries(entries) {
        return entries.sort(([protocolA, dataA], [protocolB, dataB]) => {
            let valueA, valueB;
            
            switch (this.sortColumn) {
                case 'protocol':
                    valueA = protocolA;
                    valueB = protocolB;
                    break;
                case 'status':
                    valueA = this.getStatusScore(this.calculateStatus(dataA));
                    valueB = this.getStatusScore(this.calculateStatus(dataB));
                    break;
                default:
                    valueA = dataA[this.sortColumn] || 0;
                    valueB = dataB[this.sortColumn] || 0;
            }
            
            if (typeof valueA === 'string') {
                return this.sortDirection === 'asc' ? 
                    valueA.localeCompare(valueB) : 
                    valueB.localeCompare(valueA);
            }
            
            return this.sortDirection === 'asc' ? 
                valueA - valueB : 
                valueB - valueA;
        });
    }

    updateSortHeaders() {
        const headers = this.table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (header.dataset.sort === this.sortColumn) {
                header.classList.add(`sort-${this.sortDirection}`);
            }
        });
    }

    calculateStatus(data) {
        const downloadSpeed = data.download_speed || 0;
        const latency = data.latency || 999;
        const packetLoss = data.packet_loss || 100;

        let score = 0;
        
        if (downloadSpeed >= 100) score += 40;
        else if (downloadSpeed >= 50) score += 30;
        else if (downloadSpeed >= 25) score += 20;
        else if (downloadSpeed >= 10) score += 10;

        if (latency <= 20) score += 30;
        else if (latency <= 50) score += 20;
        else if (latency <= 100) score += 10;

        if (packetLoss === 0) score += 30;
        else if (packetLoss <= 1) score += 20;
        else if (packetLoss <= 3) score += 10;

        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Poor';
    }

    getStatusScore(status) {
        const scores = { 'Excellent': 4, 'Good': 3, 'Fair': 2, 'Poor': 1 };
        return scores[status] || 0;
    }

    getProtocolColor(protocol) {
        const colors = {
            tcp: '#4ade80',
            udp: '#06b6d4',
            http: '#f59e0b',
            https: '#8b5cf6',
            icmp: '#ef4444'
        };
        return colors[protocol.toLowerCase()] || '#6b7280';
    }
}
