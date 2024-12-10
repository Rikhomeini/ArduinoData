import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Line } from "react-chartjs-2";
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

const socket = io("http://localhost:3000", {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

function SensorChart() {
    const [dataKWH, setDataKWH] = useState([]);
    const [dataArus, setDataArus] = useState([]);
    const [dataTegangan, setDataTegangan] = useState([]);
    const [dataDaya, setDataDaya] = useState([]);
    const [labels, setLabels] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');

    useEffect(() => {
        // Event listener untuk status koneksi dengan logging tambahan
        socket.on('connect', () => {
            console.log('✅ Connected to WebSocket server');
            setConnectionStatus('Connected ✓');
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from WebSocket server:', reason);
            setConnectionStatus(`Disconnected (${reason})`);
        });

        socket.on('connect_error', (error) => {
            console.error('🔴 Connection Error:', error);
            setConnectionStatus(`Connection Error: ${error.message}`);
        });

        // Listener untuk data sensor dengan debugging
        socket.on("sensorData", (data) => {
            console.group('📊 Sensor Data Received');
            console.log('Raw Data:', data);
            console.log('Timestamp:', new Date().toLocaleString());
            console.groupEnd();
            
            const timestamp = new Date().toLocaleTimeString();
            
            const updateData = (prevData) => {
                const newData = [...prevData, data];
                return newData.slice(-MAX_DATA_POINTS);
            };

            // Update state untuk setiap jenis data
            setDataKWH(prev => {
                const updated = updateData(prev);
                console.log('Updated KWH Data:', updated);
                return updated;
            });
            setDataArus(prev => {
                const updated = updateData(prev);
                console.log('Updated Arus Data:', updated);
                return updated;
            });
            setDataTegangan(prev => {
                const updated = updateData(prev);
                console.log('Updated Tegangan Data:', updated);
                return updated;
            });
            setDataDaya(prev => {
                const updated = updateData(prev);
                console.log('Updated Daya Data:', updated);
                return updated;
            });

            // Update labels
            setLabels(prev => {
                const newLabels = [...prev, timestamp];
                return newLabels.slice(-MAX_DATA_POINTS);
            });
        });

        // Cleanup pada unmount
        return () => {
            socket.off("connect");
            socket.off("disconnect");
            socket.off("connect_error");
            socket.off("sensorData");
        };
    }, []);

    const createChartData = (data, label, color) => ({
        labels,
        datasets: [
            {
                label,
                data,
                borderColor: color,
                backgroundColor: `${color}33`,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
            },
        ],
    });

    // Konfigurasi spesifik untuk setiap jenis sensor
    const chartConfigs = {
        kwh: {
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'kWh'
                        },
                        suggestedMax: 10, 
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
                        title: {
                            display: true,
                            text: 'Ampere (A)'
                        },
                        suggestedMax: 30, 
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
                        min: 100, 
                        max: 250,
                        title: {
                            display: true,
                            text: 'Volt (V)'
                        }
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
                        title: {
                            display: true,
                            text: 'Watt (W)'
                        },
                        suggestedMax: 6600,
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
            <h2 className="chart-title">Data Sensor Real-Time</h2>
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
                        data={createChartData(dataKWH, "KWH", "rgba(255, 99, 132, 1)")}
                        options={chartConfigs.kwh.options}
                    />
                </div>
                <div className="chart">
                    <h3>Arus Listrik</h3>
                    <Line 
                        data={createChartData(dataArus, "Arus", "rgba(54, 162, 235, 1)")}
                        options={chartConfigs.arus.options}
                    />
                </div>
                <div className="chart">
                    <h3>Tegangan Listrik</h3>
                    <Line 
                        data={createChartData(dataTegangan, "Tegangan", "rgba(75, 192, 192, 1)")}
                        options={chartConfigs.tegangan.options}
                    />
                </div>
                <div className="chart">
                    <h3>Daya Listrik</h3>
                    <Line 
                        data={createChartData(dataDaya, "Daya", "rgba(255, 206, 86, 1)")}
                        options={chartConfigs.daya.options}
                    />
                </div>
            </div>
        </div>
    );
}

export default SensorChart;