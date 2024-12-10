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

const socket = io("http://localhost:3000");

function SensorChart() {
    const [dataKWH, setDataKWH] = useState([]);
    const [dataArus, setDataArus] = useState([]);
    const [dataTegangan, setDataTegangan] = useState([]);
    const [dataDaya, setDataDaya] = useState([]);
    const [labels, setLabels] = useState([]);

    useEffect(() => {
        socket.on("sensorData", (data) => {
            setDataKWH((prev) => [...prev, data.kwh]);
            setDataArus((prev) => [...prev, data.arus]);
            setDataTegangan((prev) => [...prev, data.tegangan]);
            setDataDaya((prev) => [...prev, data.daya]);
            setLabels((prev) => [...prev, new Date().toLocaleTimeString()]);
        });

        return () => socket.off("sensorData");
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
            },
        ],
    });

    return (
       <div className="chart-container">
    <h2 className="chart-title">Data Sensor Real-Time</h2>
    <div className="chart-grid">
        <div className="chart">
            <h3>KWH</h3>
            <Line data={createChartData(dataKWH, "KWH", "rgba(255, 99, 132, 1)")} />
        </div>
        <div className="chart">
            <h3>Arus (A)</h3>
            <Line data={createChartData(dataArus, "Arus", "rgba(54, 162, 235, 1)")} />
        </div>
        <div className="chart">
            <h3>Tegangan (V)</h3>
            <Line data={createChartData(dataTegangan, "Tegangan", "rgba(75, 192, 192, 1)")} />
        </div>
        <div className="chart">
            <h3>Daya (W)</h3>
            <Line data={createChartData(dataDaya, "Daya", "rgba(255, 206, 86, 1)")} />
        </div>
    </div>
</div>
    );
}

export default SensorChart;
