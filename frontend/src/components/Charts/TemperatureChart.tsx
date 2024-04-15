import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TemperatureData {
  timestamp: string;
  temperature: number;
  humidity: number;
  location: string;
}

interface TemperatureChartProps {
  data: TemperatureData[];
  title?: string;
  height?: number;
}

export const TemperatureChart: React.FC<TemperatureChartProps> = ({ 
  data, 
  title = "Temperature & Humidity Trends",
  height = 300 
}) => {
  return (
    <div className="temperature-chart">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
          />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip 
            labelFormatter={(value) => new Date(value).toLocaleString()}
            formatter={(value, name) => [
              `${value}${name === 'temperature' ? '°C' : '%'}`,
              name === 'temperature' ? 'Temperature' : 'Humidity'
            ]}
          />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="temperature" 
            stroke="#8884d8" 
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Temperature"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="humidity" 
            stroke="#82ca9d" 
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Humidity"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TemperatureChart;
