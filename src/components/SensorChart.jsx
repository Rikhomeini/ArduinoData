import { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { Line } from "react-chartjs-2";
import { getDatabase, ref, query, orderByChild, limitToLast, get } from "firebase/database";
import "./SensorChart.css";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const MAX_DATA_POINTS = 20;
const DOWNLOAD_LIMIT = 1000;

// Socket configuration
const socket = io("http://localhost:3000", {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

function SensorChart() {
    const [sensorData, setSensorData] = useState({
        kwh: [],
        arus: [],
        tegangan: [],
        daya: [],
        labels: [],
    });
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const [isDownloading, setIsDownloading] = useState(false);

    // Handle incoming sensor data
    const handleSensorData = useCallback((data) => {
        const timestamp = new Date(data.timestamp).toLocaleTimeString();
        
        setSensorData(prev => ({
            kwh: [...prev.kwh.slice(-MAX_DATA_POINTS), data.kwh],
            arus: [...prev.arus.slice(-MAX_DATA_POINTS), data.arus],
            tegangan: [...prev.tegangan.slice(-MAX_DATA_POINTS), data.tegangan],
            daya: [...prev.daya.slice(-MAX_DATA_POINTS), data.daya],
            labels: [...prev.labels.slice(-MAX_DATA_POINTS), timestamp],
        }));
    }, []);

    // Download data function
    const downloadData = async () => {
        if (isDownloading) return;
        
        setIsDownloading(true);
        try {
            const db = getDatabase();
            const sensorRef = ref(db, 'sensorData');
            const dataQuery = query(sensorRef, orderByChild('timestamp'), limitToLast(DOWNLOAD_LIMIT));
            const snapshot = await get(dataQuery);
            
            if (!snapshot.exists()) {
                throw new Error('No data available');
            }

            const data = [];
            snapshot.forEach((childSnapshot) => {
                const val = childSnapshot.val();
                data.push({
                    timestamp: new Date(val.timestamp).toISOString(),
                    kwh: val.kwh,
                    arus: val.arus,
                    tegangan: val.tegangan,
                    daya: val.daya,
                });
            });

            // Sort data by timestamp
            data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            // Create CSV content
            const headers = ['Timestamp', 'KWH', 'Arus (A)', 'Tegangan (V)', 'Daya (W)'];
            const csvContent = [
                headers.join(','),
                ...data.map(row => [
                    row.timestamp,
                    row.kwh.toFixed(2),
                    row.arus.toFixed(2),
                    row.tegangan.toFixed(1),
                    row.daya.toFixed(0)
                ].join(','))
            ].join('\n');

            // Download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `sensor_data_${new Date().toISOString().slice(0,19)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error downloading data:', error);
            alert(error.message || 'Terjadi kesalahan saat mengunduh data');
        } finally {
            setIsDownloading(false);
        }
    };

    // Socket connection management
    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            setConnectionStatus('Connected ✓');
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected from WebSocket server:', reason);
            setConnectionStatus(`Disconnected (${reason})`);
        });

        socket.on('connect_error', (error) => {
            console.error('Connection Error:', error);
            setConnectionStatus(`Connection Error: ${error.message}`);
        });

        socket.on("sensorData", handleSensorData);

        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("connect_error");
            socket.off("sensorData");
        };
    }, [handleSensorData]);

    // Chart configuration
    const createChartData = (data, label, color) => ({
        labels: sensorData.labels,
        datasets: [{
            label,
            data,
            borderColor: color,
            backgroundColor: `${color}33`,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
        }],
    });

    const chartConfigs = {
        kwh: {
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'kWh' },
                        suggestedMax: 5,
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y.toFixed(2)} kWh`
                        }
                    }
                }
            }
        },
        arus: {
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Ampere (A)' },
                        suggestedMax: 20,
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y.toFixed(2)} A`
                        }
                    }
                }
            }
        },
        tegangan: {
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 200,
                        max: 240,
                        title: { display: true, text: 'Volt (V)' }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y.toFixed(1)} V`
                        }
                    }
                }
            }
        },
        daya: {
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Watt (W)' },
                        suggestedMax: 4000,
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.y.toFixed(0)} W`
                        }
                    }
                }
            }
        }
    };

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h2 className="chart-title">Data Sensor Real-Time</h2>
                <button 
                    className={`download-button ${isDownloading ? 'downloading' : ''}`}
                    onClick={downloadData}
                    disabled={isDownloading}
                >
                    {isDownloading ? 'Mengunduh...' : 'Download Data CSV'}
                </button>
            </div>
            
            <div className="connection-status" style={{
                color: connectionStatus.includes('Connected') ? 'green' : 
                       connectionStatus.includes('Error') ? 'red' : 'orange'
            }}>
                Status: {connectionStatus}
            </div>

            <div className="chart-grid">
                <div className="chart">
                    <h3>Energi Listrik</h3>
                    <Line 
                        data={createChartData(sensorData.kwh, "KWH", "rgba(255, 99, 132, 1)")}
                        options={chartConfigs.kwh.options}
                    />
                </div>
                <div className="chart">
                    <h3>Arus Listrik</h3>
                    <Line 
                        data={createChartData(sensorData.arus, "Arus", "rgba(54, 162, 235, 1)")}
                        options={chartConfigs.arus.options}
                    />
                </div>
                <div className="chart">
                    <h3>Tegangan Listrik</h3>
                    <Line 
                        data={createChartData(sensorData.tegangan, "Tegangan", "rgba(75, 192, 192, 1)")}
                        options={chartConfigs.tegangan.options}
                    />
                </div>
                <div className="chart">
                    <h3>Daya Listrik</h3>
                    <Line 
                        data={createChartData(sensorData.daya, "Daya", "rgba(255, 206, 86, 1)")}
                        options={chartConfigs.daya.options}
                    />
                </div>
            </div>
        </div>
    );
}

export default SensorChart;